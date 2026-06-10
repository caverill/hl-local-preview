import { Activity, Plug, type LucideIcon } from "lucide-react";
import { usePreviewContext } from "../hooks/PreviewContext";
import SidebarCard from "./SidebarCard";

type StatusRowProps = {
  label: string;
  icon: LucideIcon;
  value: string;
  dotClass: string;
  flash?: boolean;
  valueClass?: string;
};

function StatusRow({ label, icon: Icon, value, dotClass, flash = false, valueClass = "theme-text" }: StatusRowProps) {
  return (
    <div className="pill-row">
      <span className="theme-text-muted flex items-center gap-1.5 text-xs font-medium">
        <Icon className="h-3.5 w-3.5 shrink-0 opacity-60" strokeWidth={2} aria-hidden />
        {label}
      </span>
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${dotClass} ${flash ? "animate-indicator-flash" : ""}`} />
        <span className={`text-sm font-medium uppercase tracking-wide ${valueClass}`}>{value}</span>
      </div>
    </div>
  );
}

export default function Status() {
  const { running, status } = usePreviewContext();

  const port = status?.preview_port ?? 5500;
  const portLive = status?.preview_port_open ?? false;
  const mode = status?.watcher_mode;

  return (
    <SidebarCard title="Status" icon={Activity}>
      <StatusRow
        label="Mode"
        icon={Activity}
        value={running && mode ? mode : "Stopped"}
        dotClass={running ? "accent-dot" : "bg-red-500"}
        flash={!running}
        valueClass={running ? "accent-text" : "text-red-400"}
      />
      <StatusRow
        label="Port"
        icon={Plug}
        value={`${port} ${portLive ? "live" : "closed"}`}
        dotClass={portLive ? "accent-dot" : "bg-red-500"}
        flash={!portLive}
        valueClass={portLive ? "accent-text" : "theme-text-soft"}
      />
    </SidebarCard>
  );
}
