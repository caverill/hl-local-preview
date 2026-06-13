import type { LogEntry } from "./api";

export type LogFilterKey = "errors" | "commands" | "updates" | "info";

export type LogFilters = Record<LogFilterKey, boolean>;

const STORAGE_KEY = "hl-preview-log-filters";

export const DEFAULT_LOG_FILTERS: LogFilters = {
  errors: true,
  commands: true,
  updates: true,
  info: false,
};

export function readLogFilters(): LogFilters {
  if (typeof window === "undefined") return DEFAULT_LOG_FILTERS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_LOG_FILTERS;
    const parsed = JSON.parse(raw) as Partial<LogFilters>;
    return { ...DEFAULT_LOG_FILTERS, ...parsed };
  } catch {
    return DEFAULT_LOG_FILTERS;
  }
}

export function writeLogFilters(filters: LogFilters) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
}

function levelMatchesFilter(level: string, filters: LogFilters): boolean {
  if (level === "err") return filters.errors;
  if (level === "cmd") return filters.commands;
  if (level === "ok") return filters.updates;
  return filters.info;
}

export function filterLogs(entries: LogEntry[], filters: LogFilters, query: string): LogEntry[] {
  const q = query.trim().toLowerCase();
  return entries.filter((entry) => {
    if (!levelMatchesFilter(entry.level, filters)) return false;
    if (!q) return true;
    return entry.message.toLowerCase().includes(q);
  });
}

export function formatRecentDir(path: string): string {
  const normalized = path.replace(/\\/g, "/");
  const parts = normalized.split("/").filter(Boolean);
  if (parts.length <= 2) return normalized;
  return `…/${parts.slice(-2).join("/")}`;
}
