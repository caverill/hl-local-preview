import { BookOpen, ExternalLink, GitBranch, Settings } from "lucide-react";
import { api } from "../lib/api";
import { usePreviewContext } from "../hooks/PreviewContext";
import { btnToolbarSm } from "../lib/buttons";
import AppLogo from "./AppLogo";
import ProjectSwitcher from "./ProjectSwitcher";

const LOCAL_PREVIEW_REPO = "https://github.com/caverill/hl-local-preview";

type Props = {
  onSetupClick: () => void;
  onHowToClick: () => void;
};

export default function TopNav({ onSetupClick, onHowToClick }: Props) {
  const { project, preferences, running, online, switchProject, setError } = usePreviewContext();

  async function openProjectFolder() {
    if (!project?.path) return;
    try {
      await api.openPath(project.path);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open folder");
    }
  }

  return (
    <header className="theme-border-b flex shrink-0 justify-between gap-4 pb-4">
      <div className="flex min-w-0 items-center gap-3">
        <AppLogo />
        <div className="flex min-w-0 flex-col gap-1.5">
          <h1 className="theme-text text-xl font-semibold tracking-tight">Local Preview - see your changes live</h1>
          <ProjectSwitcher
            currentPath={project?.path}
            recentDirs={project?.recent_dirs ?? preferences?.recent_dirs ?? []}
            running={running}
            disabled={!online}
            onSwitch={switchProject}
            onOpenFolder={() => void openProjectFolder()}
            onBrowseSetup={onSetupClick}
          />
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
