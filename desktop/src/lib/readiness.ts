import type { Check, ProjectInfo, Status } from "./api";
import { isSetupReady } from "./setup";

export type ReadinessItemStatus = "ok" | "fail" | "pending" | "na";

export type ReadinessItem = {
  id: string;
  label: string;
  status: ReadinessItemStatus;
  hint?: string;
};

const EXTENSIONS_STORAGE_KEY = "hl-preview-extensions-installed";

export function readExtensionsInstalled(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(EXTENSIONS_STORAGE_KEY) === "true";
}

export function writeExtensionsInstalled(installed: boolean) {
  if (installed) {
    localStorage.setItem(EXTENSIONS_STORAGE_KEY, "true");
  } else {
    localStorage.removeItem(EXTENSIONS_STORAGE_KEY);
  }
}

function diagOk(checks: Check[], label: string): boolean | null {
  const row = checks.find((c) => c.label === label);
  if (!row) return null;
  return row.status === "ok";
}

function modeIncludesCss(mode: string | null | undefined) {
  return mode === "css" || mode === "both";
}

function modeIncludesJs(mode: string | null | undefined) {
  return mode === "js" || mode === "both";
}

function scriptStatus(active: boolean, ...checkResults: (boolean | null)[]): ReadinessItemStatus {
  if (!active) return "na";
  const known = checkResults.filter((value) => value !== null);
  if (!known.length) return "pending";
  if (known.every((value) => value === true)) return "ok";
  if (known.some((value) => value === false)) return "fail";
  return "pending";
}

export function buildReadinessItems(
  project: ProjectInfo | null,
  status: Status | null,
  running: boolean,
  checks: Check[],
  extensionsInstalled: boolean,
): ReadinessItem[] {
  const mode = status?.watcher_mode;
  const cssActive = running && modeIncludesCss(mode);
  const jsActive = running && modeIncludesJs(mode);
  const portOpen = status?.preview_port_open ?? false;
  const filesOk = (project?.missing_files.length ?? 1) === 0;

  const items: ReadinessItem[] = [
    {
      id: "setup",
      label: "Setup saved",
      status: isSetupReady(project) ? "ok" : project?.path ? "fail" : "pending",
      hint: "Project folder, SITE_URL, and match mode",
    },
    {
      id: "files",
      label: "Project files",
      status: filesOk ? "ok" : project?.path ? "fail" : "pending",
      hint: "main/styles.css, main/main.js, scripts",
    },
    {
      id: "extensions",
      label: "Browser extensions",
      status: extensionsInstalled ? "ok" : "pending",
      hint: "Stylus and Tampermonkey installs must be approved manually in your browser.",
    },
    {
      id: "watcher",
      label: "Watcher running",
      status: running ? "ok" : isSetupReady(project) ? "fail" : "pending",
    },
    {
      id: "port",
      label: "Preview port live",
      status: running && portOpen ? "ok" : running ? "fail" : "pending",
      hint: status?.preview_port ? `Port ${status.preview_port}` : undefined,
    },
    {
      id: "stylus",
      label: "Stylus script ready",
      status: scriptStatus(cssActive, diagOk(checks, "CSS preview URL")),
      hint: "Install from Quick Links when watcher is on",
    },
    {
      id: "tampermonkey",
      label: "Tampermonkey script ready",
      status: scriptStatus(
        jsActive,
        diagOk(checks, "JS preview URL"),
        diagOk(checks, "Tampermonkey loader URL"),
      ),
      hint: "Install loader from Quick Links when watcher is on",
    },
  ];

  return items.filter((item) => item.status !== "na");
}

export function readinessSummary(items: ReadinessItem[]): { done: number; total: number; allOk: boolean } {
  const total = items.length;
  const done = items.filter((item) => item.status === "ok").length;
  return { done, total, allOk: done === total && total > 0 };
}
