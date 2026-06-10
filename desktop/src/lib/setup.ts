export type MatchMode = "domain" | "url-prefix" | "url" | "regexp";

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
