import { useCallback, useEffect, useRef, useState } from "react";
import { api, type EditorInfo, type LogEntry, type ProjectInfo, type Status } from "../lib/api";
import type { SetupValues } from "../lib/setup";

/** Data + actions for the preview UI. Wire these into your own components. */
export function usePreview(pollMs = 1200) {
  const [status, setStatus] = useState<Status | null>(null);
  const [project, setProject] = useState<ProjectInfo | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [editors, setEditors] = useState<EditorInfo[]>([]);
  const [online, setOnline] = useState(false);
  const [error, setError] = useState("");
  const logSince = useRef(0);

  const refreshEditors = useCallback(async () => {
    try {
      const result = await api.editors();
      setEditors(result.editors);
    } catch {
      setEditors([]);
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      await api.health();
      setOnline(true);
      setError("");
      const [s, p, batch] = await Promise.all([
        api.status(),
        api.project(),
        api.logs(logSince.current),
      ]);
      setStatus(s);
      setProject(p);
      if (batch.entries.length) {
        setLogs((prev) => [...prev, ...batch.entries]);
        logSince.current = batch.entries[batch.entries.length - 1]!.id;
      }
    } catch {
      setOnline(false);
      setError("API not running — from repo root: python3 scripts/dev_desktop.py");
    }
  }, []);

  useEffect(() => {
    refresh();
    refreshEditors();
    const t = setInterval(refresh, pollMs);
    return () => clearInterval(t);
  }, [refresh, refreshEditors, pollMs]);

  const clearLogs = useCallback(() => {
    setLogs((prev) => {
      const lastId = prev.at(-1)?.id ?? logSince.current;
      logSince.current = lastId;
      return [];
    });
  }, []);

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
    await api.restartWatcher();
    await refresh();
  }, [refresh]);

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
    saveProject,
    createProjectFiles,
    openUrl,
    openInEditor,
    running: status?.watcher_running ?? false,
  };
}
