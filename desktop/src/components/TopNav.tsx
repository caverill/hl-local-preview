import { BookOpen, ExternalLink, GitBranch, Monitor, Settings } from "lucide-react";
import { btnNeutralSm } from "../lib/buttons";

const LOCAL_PREVIEW_REPO = "https://github.com/caverill/hl-local-preview";

type Props = {
  projectPath?: string;
  onSetupClick: () => void;
  onHowToClick: () => void;
};

export default function TopNav({ projectPath, onSetupClick, onHowToClick }: Props) {
  return (
    <header className="theme-border-b flex shrink-0 justify-between gap-4 pb-4">
      <div className="flex min-w-0 items-center gap-3">
        <div className="accent-badge flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-lg font-bold tracking-tight">
          <Monitor className="h-6 w-6" strokeWidth={2} aria-hidden />
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="theme-text text-2xl font-semibold tracking-tight">Local Preview - see your changes live</h1>
          <p className="theme-text-muted truncate font-mono text-base">{projectPath}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <a
          href={LOCAL_PREVIEW_REPO}
          target="_blank"
          rel="noopener noreferrer"
          className={btnNeutralSm}
        >
          <GitBranch className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
          Local Preview Repository
          <ExternalLink className="h-3 w-3 opacity-40" strokeWidth={2} aria-hidden />
        </a>
        <button type="button" className={btnNeutralSm} onClick={onHowToClick}>
          <BookOpen className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
          How to use
        </button>
        <button type="button" className={btnNeutralSm} onClick={onSetupClick}>
          <Settings className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
          Setup
        </button>
      </div>
    </header>
  );
}
