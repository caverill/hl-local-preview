import { Activity, Plug, SlidersHorizontal, type LucideIcon } from "lucide-react";
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
      <span className="theme-text-muted flex items-center gap-1.5 text-base font-medium">
        <Icon className="h-3.5 w-3.5 shrink-0 opacity-60" strokeWidth={2} aria-hidden />
        {label}
      </span>
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${dotClass} ${flash ? "animate-indicator-flash" : ""}`} />
        <span className={`text-[11px] font-medium uppercase tracking-wide ${valueClass}`}>{value}</span>
      </div>
    </div>
  );
}

export default function Status() {
  const { running, status, restarting } = usePreviewContext();

  const port = status?.preview_port ?? 5500;
  const portOpen = status?.preview_port_open ?? false;
  const portHealthy = running && portOpen;
  const mode = status?.watcher_mode;

  const portRestarting = restarting && !portOpen;
  const portIdle = portOpen && !running;
  const portLabel = portHealthy ? "live" : portRestarting ? "restarting" : portIdle ? "idle" : "closed";
  const portDotClass = portHealthy
    ? "accent-dot"
    : portRestarting || portIdle
      ? "status-dot-idle"
      : "bg-red-500";
  const portValueClass = portHealthy
    ? "accent-text"
    : portRestarting || portIdle
      ? "status-text-idle"
      : "text-red-400";

  return (
    <SidebarCard title="Status" icon={Activity}>
      <StatusRow
        label="Mode"
        icon={SlidersHorizontal}
        value={running && mode ? mode : "Stopped"}
        dotClass={running ? "accent-dot" : "bg-red-500"}
        flash={!running}
        valueClass={running ? "accent-text" : "text-red-400"}
      />
      <StatusRow
        label="Port"
        icon={Plug}
        value={`${port} ${portLabel}`}
        dotClass={portDotClass}
        flash={portRestarting || !portHealthy}
        valueClass={portValueClass}
      />
    </SidebarCard>
  );
}
