import { useCallback, useEffect, useRef, useState } from "react";
import { api, type EditorInfo, type LogEntry, type ProjectInfo, type Status } from "../lib/api";
import type { SetupValues } from "../lib/setup";

const LOG_SINCE_STORAGE_KEY = "hl-preview-log-since";

function readStoredLogSince(): number {
  if (typeof window === "undefined") return 0;
  const stored = Number(sessionStorage.getItem(LOG_SINCE_STORAGE_KEY));
  return Number.isFinite(stored) && stored >= 0 ? stored : 0;
}

function writeStoredLogSince(id: number) {
  sessionStorage.setItem(LOG_SINCE_STORAGE_KEY, String(id));
}

function clearStoredLogSince() {
  sessionStorage.removeItem(LOG_SINCE_STORAGE_KEY);
}

/** Data + actions for the preview UI. Wire these into your own components. */
export function usePreview(pollMs = 1200) {
  const [status, setStatus] = useState<Status | null>(null);
  const [project, setProject] = useState<ProjectInfo | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [editors, setEditors] = useState<EditorInfo[]>([]);
  const [online, setOnline] = useState(false);
  const [error, setError] = useState("");
  const [restarting, setRestarting] = useState(false);
  const logSince = useRef(readStoredLogSince());
  const logPullGen = useRef(0);

  const refreshEditors = useCallback(async () => {
    try {
      const result = await api.editors();
      setEditors(result.editors);
    } catch {
      setEditors([]);
    }
  }, []);

  const pullLogs = useCallback(async () => {
    const gen = logPullGen.current;
    let since = logSince.current;

    const batch = await api.logs(since);
    if (gen !== logPullGen.current) return;

    if (batch.cursor < since) {
      since = 0;
      logSince.current = 0;
      clearStoredLogSince();
      if (batch.entries.length) {
        setLogs(batch.entries);
        const lastId = batch.entries[batch.entries.length - 1]!.id;
        logSince.current = lastId;
      } else {
        setLogs([]);
      }
      return;
    }

    const fresh = batch.entries.filter((entry) => entry.id > logSince.current);
    if (!fresh.length) return;

    const lastId = fresh[fresh.length - 1]!.id;
    logSince.current = lastId;
    setLogs((prev) => [...prev, ...fresh]);
  }, []);

  const refresh = useCallback(async () => {
    try {
      await api.health();
      setOnline(true);
      setError("");
      const [s, p] = await Promise.all([api.status(), api.project()]);
      setStatus(s);
      setProject(p);
      await pullLogs();
    } catch {
      setOnline(false);
      setError("API not running — from repo root: python3 scripts/dev_desktop.py");
    }
  }, [pullLogs]);

  useEffect(() => {
    refresh();
    refreshEditors();
    const t = setInterval(refresh, pollMs);
    return () => clearInterval(t);
  }, [refresh, refreshEditors, pollMs]);

  useEffect(() => {
    if (!restarting) return;
    if (status?.preview_port_open) {
      setRestarting(false);
    }
  }, [restarting, status?.preview_port_open]);

  useEffect(() => {
    if (!restarting) return;
    const t = window.setTimeout(() => setRestarting(false), 60_000);
    return () => window.clearTimeout(t);
  }, [restarting]);

  const clearLogs = useCallback(async () => {
    logPullGen.current += 1;
    const lastIdBeforeClear = logs.at(-1)?.id ?? logSince.current;
    setLogs([]);

    try {
      const result = await api.clearLogs();
      logSince.current = result.since;
      writeStoredLogSince(result.since);
    } catch {
      logSince.current = lastIdBeforeClear;
      writeStoredLogSince(lastIdBeforeClear);
    }
  }, [logs]);

  const startWatcher = useCallback(
    async (mode: "both" | "css" | "js") => {
      setError("");
      await api.startWatcher(mode);
      await refresh();
    },
    [refresh],
  );

  const stopWatcher = useCallback(async () => {
    await api.stopWatcher();
    await refresh();
  }, [refresh]);

  const restartWatcher = useCallback(async () => {
    setRestarting(true);
    setError("");
    try {
      await api.restartWatcher();
      await refresh();
      // Subprocess output can land slightly after the API returns.
      await pullLogs();
      window.setTimeout(() => {
        void pullLogs();
      }, 500);
    } catch (e) {
      setRestarting(false);
      throw e;
    }
  }, [refresh, pullLogs]);

  const saveProject = useCallback(
    async (values: SetupValues) => {
      setError("");
      await api.saveSetup({
        path: values.path,
        site_url: values.siteUrl.trim(),
        match_mode: values.matchMode,
        match_regexp_pattern: values.matchRegexpPattern.trim(),
      });
      await refresh();
    },
    [refresh],
  );

  const createProjectFiles = useCallback(
    async (path: string) => {
      setError("");
      const result = await api.createFiles(path);
      await refresh();
      return result;
    },
    [refresh],
  );

  const openUrl = useCallback((url: string) => {
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  }, []);

  const openInEditor = useCallback(
    async (editor: EditorInfo["id"], path: string) => {
      setError("");
      await api.openInEditor(editor, path);
    },
    [],
  );

  return {
    status,
    project,
    logs,
    editors,
    online,
    error,
    setError,
    refresh,
    clearLogs,
    startWatcher,
    stopWatcher,
    restartWatcher,
    restarting,
    saveProject,
    createProjectFiles,
    openUrl,
    openInEditor,
    running: status?.watcher_running ?? false,
  };
}
