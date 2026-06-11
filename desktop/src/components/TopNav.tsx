import { BookOpen, ExternalLink, FolderOpen, GitBranch, Settings } from "lucide-react";
import { api } from "../lib/api";
import { btnLink, btnToolbarSm } from "../lib/buttons";
import { usePreviewContext } from "../hooks/PreviewContext";
import AppLogo from "./AppLogo";

const LOCAL_PREVIEW_REPO = "https://github.com/caverill/hl-local-preview";

type Props = {
  projectPath?: string;
  onSetupClick: () => void;
  onHowToClick: () => void;
};

export default function TopNav({ projectPath, onSetupClick, onHowToClick }: Props) {
  const { setError } = usePreviewContext();

  async function openProjectFolder() {
    if (!projectPath) return;
    try {
      await api.openPath(projectPath);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open folder");
    }
  }

  return (
    <header className="theme-border-b flex shrink-0 justify-between gap-4 pb-4">
      <div className="flex min-w-0 items-center gap-3">
        <AppLogo />
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="theme-text text-2xl font-semibold tracking-tight">Local Preview - see your changes live</h1>
          {projectPath ? (
            <button
              type="button"
              className={`${btnLink} group flex min-w-0 max-w-full items-center gap-2 text-left font-mono text-base`}
              onClick={openProjectFolder}
              title={`Open ${projectPath}`}
            >
              <span className="min-w-0 truncate">{projectPath}</span>
              <FolderOpen
                className="h-3.5 w-3.5 shrink-0 opacity-35 transition-opacity group-hover:opacity-80"
                strokeWidth={2}
                aria-hidden
              />
            </button>
          ) : (
            <p className="theme-text-muted truncate font-mono text-base">No project folder — open Setup</p>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <a
          href={LOCAL_PREVIEW_REPO}
          target="_blank"
          rel="noopener noreferrer"
          className={btnToolbarSm}
        >
          <GitBranch className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
          Local Preview Repository
          <ExternalLink className="h-3 w-3 opacity-40" strokeWidth={2} aria-hidden />
        </a>
        <button type="button" className={btnToolbarSm} onClick={onHowToClick}>
          <BookOpen className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
          How to use
        </button>
        <button type="button" className={btnToolbarSm} onClick={onSetupClick}>
          <Settings className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
          Setup
        </button>
      </div>
    </header>
  );
}
