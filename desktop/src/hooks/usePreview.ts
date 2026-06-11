import { useCallback, useEffect, useRef, useState } from "react";
import {
  api,
  type AppPreferences,
  type EditorInfo,
  type LogEntry,
  type ProjectInfo,
  type Status,
  type WatcherMode,
} from "../lib/api";
import { notifyDesktop } from "../lib/notifications";
import type { SetupValues } from "../lib/setup";
import { isSetupReady } from "../lib/setup";

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
  const [preferences, setPreferences] = useState<AppPreferences | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [editors, setEditors] = useState<EditorInfo[]>([]);
  const [online, setOnline] = useState(false);
  const [error, setError] = useState("");
  const [restarting, setRestarting] = useState(false);
  const logSince = useRef(readStoredLogSince());
  const logPullGen = useRef(0);
  const autoStartAttempted = useRef(false);
  const prevPortOpen = useRef<boolean | null>(null);
  const prevWatcherRunning = useRef<boolean | null>(null);
  const notifiedLogIds = useRef<Set<number>>(new Set());

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
      const [s, p, prefs] = await Promise.all([api.status(), api.project(), api.preferences()]);
      setStatus(s);
      setProject(p);
      setPreferences(prefs);
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
    const lastIdBeforeClear = logs.length ? logs[logs.length - 1]!.id : logSince.current;
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
    async (mode: WatcherMode) => {
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
      await pullLogs();
      window.setTimeout(() => {
        void pullLogs();
      }, 500);
    } catch (e) {
      setRestarting(false);
      throw e;
    }
  }, [refresh, pullLogs]);

  const rebuildPreview = useCallback(
    async (mode: WatcherMode = "both") => {
      setError("");
      try {
        const result = await api.rebuildPreview(mode);
        await refresh();
        if (result.preview_built === false && result.preview_error) {
          const message = `Preview rebuild failed: ${result.preview_error}`;
          setError(message);
          notifyDesktop("Preview rebuild failed", result.preview_error, preferences);
          throw new Error(message);
        }
        return result;
      } catch (e) {
        if (e instanceof Error && e.message.startsWith("Preview rebuild failed")) throw e;
        const message = e instanceof Error ? e.message : "Preview rebuild failed";
        notifyDesktop("Preview rebuild failed", message, preferences);
        throw e;
      }
    },
    [refresh, preferences],
  );

  const savePreferences = useCallback(async (patch: Partial<AppPreferences>) => {
    const next = await api.savePreferences(patch);
    setPreferences(next);
    return next;
  }, []);

  const switchProject = useCallback(
    async (path: string) => {
      setError("");
      await api.setProject(path);
      await refresh();
    },
    [refresh],
  );

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

  const syncProjectFiles = useCallback(
    async (path: string) => {
      setError("");
      const result = await api.syncProjectFiles(path);
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

  useEffect(() => {
    if (autoStartAttempted.current) return;
    if (!online || !preferences?.auto_start_watcher) return;
    if (!isSetupReady(project)) return;
    if (status?.watcher_running) return;

    autoStartAttempted.current = true;
    const mode = preferences.last_watcher_mode;
    void startWatcher(mode).catch((e) => {
      setError(e instanceof Error ? e.message : "Could not auto-start watcher");
    });
  }, [online, preferences, project, status?.watcher_running, startWatcher]);

  useEffect(() => {
    if (!preferences?.desktop_notifications) return;

    const portOpen = status?.preview_port_open ?? false;
    const watcherRunning = status?.watcher_running ?? false;

    if (prevPortOpen.current === true && !portOpen && watcherRunning) {
      notifyDesktop(
        "Preview port closed",
        `Port ${status?.preview_port ?? 5500} is no longer responding.`,
        preferences,
      );
    }

    if (prevWatcherRunning.current === true && !watcherRunning) {
      notifyDesktop("Watcher stopped", "The file watcher is no longer running.", preferences);
    }

    prevPortOpen.current = portOpen;
    prevWatcherRunning.current = watcherRunning;
  }, [status, preferences]);

  useEffect(() => {
    if (!preferences?.desktop_notifications) return;

    for (const entry of logs) {
      if (notifiedLogIds.current.has(entry.id)) continue;
      if (entry.level === "err") {
        notifyDesktop("Watcher error", entry.message, preferences);
        notifiedLogIds.current.add(entry.id);
        continue;
      }
      if (entry.level === "warn" && entry.message.toLowerCase().includes("watcher exited")) {
        notifyDesktop("Watcher error", entry.message, preferences);
        notifiedLogIds.current.add(entry.id);
      }
    }
  }, [logs, preferences]);

  return {
    status,
    project,
    preferences,
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
    rebuildPreview,
    savePreferences,
    switchProject,
    restarting,
    saveProject,
    createProjectFiles,
    syncProjectFiles,
    openUrl,
    openInEditor,
    running: status?.watcher_running ?? false,
  };
}
