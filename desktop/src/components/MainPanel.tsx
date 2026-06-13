import { Activity, Eye, type LucideIcon } from "lucide-react";
import { usePreviewContext } from "../hooks/PreviewContext";
import DiagnosticsTab from "./DiagnosticsTab";
import PreviewTab from "./PreviewTab";

export type MainPanelTab = "preview" | "diagnostics";

const TABS: { id: MainPanelTab; label: string; icon: LucideIcon }[] = [
  { id: "preview", label: "Preview", icon: Eye },
  { id: "diagnostics", label: "Diagnostics", icon: Activity },
];

type Props = {
  tab: MainPanelTab;
  onTabChange: (tab: MainPanelTab) => void;
};

export default function MainPanel({ tab, onTabChange }: Props) {
  const { logs, clearLogs } = usePreviewContext();

  return (
    <section className="glass-shell flex min-h-0 flex-1 flex-col p-4">
      <div role="tablist" className="theme-tab-bar flex gap-1 rounded-full p-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => onTabChange(id)}
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
        {tab === "preview" ? (
          <PreviewTab logs={logs} onClearLogs={clearLogs} />
        ) : (
          <DiagnosticsTab />
        )}
      </div>
    </section>
  );
}
