import { useState } from "react";
import { PreviewProvider, usePreviewContext } from "../hooks/PreviewContext";
import QuickLinks from "./QuickLinks";
import MainPanel, { type MainPanelTab } from "./MainPanel";
import HowToModal from "./HowToModal";
import SetupPanel from "./SetupPanel";
import PreferencesPanel from "./PreferencesPanel";
import Status from "./Status";
import TopNav from "./TopNav";
import Watcher from "./Watcher";
import { LogFilterProvider } from "../hooks/LogFilterContext";
import { Heart } from "lucide-react";

function LayoutShellInner() {
  const {
    project,
    error,
    running,
    saveProject,
    createProjectFiles,
    syncProjectFiles,
    switchProject,
  } = usePreviewContext();
  const [setupOpen, setSetupOpen] = useState(false);
  const [howToOpen, setHowToOpen] = useState(false);
  const [mainTab, setMainTab] = useState<MainPanelTab>("preview");

  function handleSetupSaved() {
    setMainTab("diagnostics");
  }

  return (
    <div className="theme-page relative min-h-screen overflow-hidden p-6">
      <div
        aria-hidden
        className="theme-orb-lime pointer-events-none absolute -left-24 -top-24 h-[28rem] w-[28rem] rounded-full bg-lime-400 blur-3xl"
      />
      <div
        aria-hidden
        className="theme-orb-cyan pointer-events-none absolute -bottom-32 -right-32 h-[32rem] w-[32rem] rounded-full bg-cyan-400 blur-3xl"
      />
      <div
        aria-hidden
        className="theme-orb-orange pointer-events-none absolute left-[45%] top-[35%] h-80 w-80 -translate-x-1/2 rounded-full bg-orange-400 blur-3xl"
      />

      <div className="theme-shell relative flex h-[calc(100vh-3rem)] max-h-[calc(100vh-3rem)] flex-col gap-4 overflow-hidden rounded-3xl p-6 backdrop-blur-xl">
        <TopNav
          projectPath={project?.path}
          onHowToClick={() => setHowToOpen(true)}
          onSetupClick={() => setSetupOpen(true)}
        />

        {error && (
          <div role="alert" className="theme-alert text-base">
            <span>{error}</span>
          </div>
        )}

        <HowToModal open={howToOpen} onClose={() => setHowToOpen(false)} />

        <SetupPanel
          open={setupOpen}
          project={project}
          onClose={() => setSetupOpen(false)}
          onSave={saveProject}
          onSaved={handleSetupSaved}
          onCreateFiles={createProjectFiles}
          onUpdateFiles={syncProjectFiles}
          onSwitchProject={switchProject}
          watcherRunning={running}
        />

        <div className="flex min-h-0 flex-1 gap-4">
          <aside className="flex min-h-0 w-80 shrink-0 flex-col">
            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain pr-1">
              <Watcher />
              <Status />
              <QuickLinks />
              <PreferencesPanel />
            </div>
            <div className="shrink-0 pt-3">
              <div className="theme-divider mb-3" />
              <p className="theme-text-muted text-sm px-1 leading-tight">Made with <Heart
                  className="h-4 w-4 inline-block align-middle mr-1 text-red-600 fill-red-600"
                  strokeWidth={2}
                  aria-hidden
                /> by Cailee Averill</p>
            </div>
          </aside>

          <MainPanel tab={mainTab} onTabChange={setMainTab} />
        </div>
      </div>
    </div>
  );
}

export default function LayoutShell() {
  return (
    <PreviewProvider>
      <LogFilterProvider>
        <LayoutShellInner />
      </LogFilterProvider>
    </PreviewProvider>
  );
}
