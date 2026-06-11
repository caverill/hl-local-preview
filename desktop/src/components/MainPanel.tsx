import { Activity, Eye, TriangleAlert, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { usePreviewContext } from "../hooks/PreviewContext";
import { isSetupReady } from "../lib/setup";
import DiagnosticsTab from "./DiagnosticsTab";
import PreviewTab from "./PreviewTab";

type Tab = "preview" | "diagnostics";

const TABS: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: "preview", label: "Preview", icon: Eye },
  { id: "diagnostics", label: "Diagnostics", icon: Activity },
];

export default function MainPanel() {
  const [tab, setTab] = useState<Tab>("preview");
  const { project, logs, clearLogs } = usePreviewContext();
  const setupReady = isSetupReady(project);

  return (
    <section className="glass-shell flex min-h-0 flex-1 flex-col p-4">
      <div role="tablist" className="theme-tab-bar flex gap-1 rounded-full p-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`tab-pill flex flex-1 items-center justify-center gap-1.5 rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] ${
              tab === id ? "tab-pill-active accent-tab-active" : "theme-tab-inactive"
            }`}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
            {label}
          </button>
        ))}
      </div>

      <div className="mt-4 flex min-h-0 flex-1 flex-col gap-4" role="tabpanel">
        {!setupReady && (
          <div role="status" className="preview-card preview-card-blue flex shrink-0 flex-col gap-2">
            <div className="flex items-center gap-2">
              <TriangleAlert
                className="h-4 w-4 shrink-0 text-blue-400/70"
                strokeWidth={2}
                aria-hidden
              />
              <h3 className="theme-text text-lg font-semibold tracking-tight">Setup required</h3>
            </div>
            <p className="theme-text-muted text-base leading-relaxed">
              Use <span className="theme-text font-medium">Setup</span> in the top bar to install browser extensions, choose your project folder, set your dev site URL, create any missing project files and select your match mode. If you are having issues with the preview, check the Diagnostics tab.
            </p>
          </div>
        )}

        {tab === "preview" ? (
          <PreviewTab
            cssUrl={project?.urls.stylus}
            jsUrl={project?.urls.js_preview}
            logs={logs}
            onClearLogs={clearLogs}
          />
        ) : (
          <DiagnosticsTab />
        )}
      </div>
    </section>
  );
}
