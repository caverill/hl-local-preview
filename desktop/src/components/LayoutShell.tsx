import { useState } from "react";
import { PreviewProvider, usePreviewContext } from "../hooks/PreviewContext";
import QuickLinks from "./QuickLinks";
import MainPanel from "./MainPanel";
import SetupPanel from "./SetupPanel";
import Status from "./Status";
import ThemeToggle from "./ThemeToggle";
import FontSizeControl from "./FontSizeControl";
import TopNav from "./TopNav";
import Watcher from "./Watcher";
import SidebarCard from "./SidebarCard";
import { SunMoon } from "lucide-react";

function LayoutShellInner() {
  const { project, error, saveProject, createProjectFiles } = usePreviewContext();
  const [setupOpen, setSetupOpen] = useState(false);

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
        <TopNav projectPath={project?.path} onSetupClick={() => setSetupOpen(true)} />

        {error && (
          <div role="alert" className="theme-alert text-sm">
            <span>{error}</span>
          </div>
        )}

        <SetupPanel
          open={setupOpen}
          project={project}
          onClose={() => setSetupOpen(false)}
          onSave={saveProject}
          onCreateFiles={createProjectFiles}
        />

        <div className="flex min-h-0 flex-1 gap-4">
          <aside className="relative flex min-h-0 w-64 shrink-0 flex-col gap-4 pb-14">
            <Watcher />
            <Status />
            <QuickLinks />
            <SidebarCard title="Appearance" icon={SunMoon}>
              <ThemeToggle variant="sidebar" />
              <FontSizeControl />
            </SidebarCard>
            <p className="theme-text-muted absolute bottom-0 left-0 right-0 px-1 text-lg leading-tight">
              Created by Cailee Averill
            </p>
          </aside>

          <MainPanel />
        </div>
      </div>
    </div>
  );
}

export default function LayoutShell() {
  return (
    <PreviewProvider>
      <LayoutShellInner />
    </PreviewProvider>
  );
}
