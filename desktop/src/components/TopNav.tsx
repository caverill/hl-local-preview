import { ExternalLink, GitBranch, Monitor, Settings } from "lucide-react";

const LOCAL_PREVIEW_REPO = "https://github.com/caverill/hl-local-preview";

const navBtnClass =
  "btn btn-sm btn-interactive theme-sidebar-btn flex items-center gap-1.5 rounded-xl border-0 px-4 py-2 text-xs font-medium btn-interactive-lime";

type Props = {
  projectPath?: string;
  onSetupClick: () => void;
};

export default function TopNav({ projectPath, onSetupClick }: Props) {
  return (
    <header className="theme-border-b flex justify-between gap-4 pb-6">
      <div className="flex min-w-0 items-center gap-3">
        <div className="accent-badge flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-lg font-bold tracking-tight">
          <Monitor className="h-6 w-6" strokeWidth={2} aria-hidden />
        </div>
        <div className="min-w-0 flex flex-col">
          <h1 className="theme-text text-xl font-semibold tracking-tight">Local Preview - see your changes live</h1>
          <p className="theme-text-muted truncate font-mono text-xs">{projectPath}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <a
          href={LOCAL_PREVIEW_REPO}
          target="_blank"
          rel="noopener noreferrer"
          className={navBtnClass}
        >
          <GitBranch className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
          Local Preview Repository
          <ExternalLink className="h-3 w-3 opacity-40" strokeWidth={2} aria-hidden />
        </a>
        <button type="button" className={navBtnClass} onClick={onSetupClick}>
          <Settings className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
          Setup
        </button>
      </div>
    </header>
  );
}
