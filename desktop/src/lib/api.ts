async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? res.statusText);
  return data as T;
}

export type Status = {
  watcher_running: boolean;
  watcher_mode: string | null;
  preview_port: number;
  preview_port_open: boolean;
  project_dir: string;
  missing_files: string[];
};

export type GitRepoInfo = {
  is_git_repo: boolean;
  repo_root: string | null;
  remote_url: string | null;
  remote_web_url: string | null;
  branch: string | null;
};

export type ProjectInfo = {
  path: string;
  site_url: string;
  match_mode: "domain" | "url-prefix" | "url" | "regexp";
  match_regexp_pattern: string;
  missing_files: string[];
  urls: {
    stylus: string;
    js_preview: string;
    site: string;
    tampermonkey_loader: string;
  };
} & GitRepoInfo;

export type ProjectInspect = {
  path: string;
  valid: boolean;
  missing_files: string[];
} & GitRepoInfo;

export type SetupPayload = {
  path: string;
  site_url: string;
  match_mode: ProjectInfo["match_mode"];
  match_regexp_pattern?: string;
};

export type LogEntry = { id: number; level: string; message: string };

export type Check = { label: string; status: "ok" | "fail"; detail: string };

export type EditorInfo = { id: "cursor" | "vscode"; label: string; available: boolean };

export const api = {
  health: () => request<{ ok: boolean }>("/api/health"),
  status: () => request<Status>("/api/status"),
  project: () => request<ProjectInfo>("/api/project"),
  setProject: (path: string) =>
    request("/api/project", { method: "PUT", body: JSON.stringify({ path }) }),
  saveSetup: (payload: SetupPayload) =>
    request<ProjectInfo>("/api/setup", {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  pickFolder: (initial?: string) =>
    request<ProjectInspect & { cancelled?: boolean }>("/api/project/pick-folder", {
      method: "POST",
      body: JSON.stringify({ initial: initial ?? "" }),
    }),
  inspectProject: (path: string) =>
    request<ProjectInspect>(`/api/project/inspect?path=${encodeURIComponent(path)}`),
  setConfig: (site_url: string) =>
    request("/api/config", { method: "PUT", body: JSON.stringify({ site_url }) }),
  createFiles: (path?: string) =>
    request<ProjectInfo & { created: string[] }>("/api/project/files", {
      method: "POST",
      body: JSON.stringify({ path: path ?? "" }),
    }),
  startWatcher: (mode: string) =>
    request("/api/watcher/start", { method: "POST", body: JSON.stringify({ mode }) }),
  stopWatcher: () => request("/api/watcher/stop", { method: "POST", body: "{}" }),
  restartWatcher: () => request("/api/watcher/restart", { method: "POST", body: "{}" }),
  logs: (since = 0) => request<{ entries: LogEntry[] }>(`/api/logs?since=${since}`),
  diagnostics: () => request<{ checks: Check[] }>("/api/diagnostics"),
  installDeps: () => request("/api/deps/install", { method: "POST", body: "{}" }),
  openUrl: (url: string) =>
    request("/api/open", { method: "POST", body: JSON.stringify({ url }) }),
  openPath: (path: string) =>
    request("/api/open/path", { method: "POST", body: JSON.stringify({ path }) }),
  editors: () => request<{ editors: EditorInfo[] }>("/api/editors"),
  openInEditor: (editor: EditorInfo["id"], path: string) =>
    request("/api/open/editor", {
      method: "POST",
      body: JSON.stringify({ editor, path }),
    }),
};
