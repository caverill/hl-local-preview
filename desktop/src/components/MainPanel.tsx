import { Activity, Eye, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { usePreviewContext } from "../hooks/PreviewContext";
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

  return (
    <section className="glass-shell flex min-h-0 flex-1 flex-col p-5">
      <div role="tablist" className="theme-tab-bar flex gap-1 rounded-full p-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`tab-pill flex flex-1 items-center justify-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] ${
              tab === id ? "tab-pill-active accent-tab-active" : "theme-tab-inactive"
            }`}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
            {label}
          </button>
        ))}
      </div>

      <div className="mt-5 flex min-h-0 flex-1 flex-col" role="tabpanel">
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
