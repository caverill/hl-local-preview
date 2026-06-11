import type { ProjectInfo } from "./api";

export type MatchMode = "domain" | "url-prefix" | "url" | "regexp";

/** Matches SITE_URL written to new .env.local files — update service/project.py TEMPLATE_ENV too. */
export const DEFAULT_SITE_URL = "https://example.com/your-sandbox/";

/** True after Setup has been saved with a project path, site URL, and required files. */
export function isSetupReady(project: ProjectInfo | null | undefined): boolean {
  if (!project) return false;
  if (!project.path.trim() || !project.site_url.trim()) return false;
  return project.missing_files.length === 0;
}

export type SetupValues = {
  path: string;
  siteUrl: string;
  matchMode: MatchMode;
  matchRegexpPattern: string;
};

export const MATCH_MODE_OPTIONS: {
  id: MatchMode;
  label: string;
  hint: string;
}[] = [
  {
    id: "url-prefix",
    label: "URL prefix",
    hint: "Sandbox path and subpages (recommended)",
  },
  {
    id: "domain",
    label: "Domain",
    hint: "Entire site domain",
  },
  {
    id: "url",
    label: "Exact URL",
    hint: "Single page only",
  },
  {
    id: "regexp",
    label: "Regexp",
    hint: "Custom pattern for Stylus @-moz-document",
  },
];
