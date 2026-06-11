import { Activity, Clock3, Plug, SlidersHorizontal, type LucideIcon } from "lucide-react";
import { usePreviewContext } from "../hooks/PreviewContext";
import { formatBuildTime } from "../lib/time";
import SidebarCard from "./SidebarCard";

type StatusRowProps = {
  label: string;
  icon: LucideIcon;
  value: string;
  dotClass: string;
  flash?: boolean;
  valueClass?: string;
  title?: string;
};

function StatusRow({
  label,
  icon: Icon,
  value,
  dotClass,
  flash = false,
  valueClass = "theme-text",
  title,
}: StatusRowProps) {
  return (
    <div className="pill-row" title={title}>
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
    ? "status-dot-success"
    : portRestarting || portIdle
      ? "status-dot-idle"
      : "status-dot-error";
  const portValueClass = portHealthy
    ? "status-text-success"
    : portRestarting || portIdle
      ? "status-text-idle"
      : "status-text-error";

  return (
    <SidebarCard title="Status" icon={Activity}>
      <StatusRow
        label="Mode"
        icon={SlidersHorizontal}
        value={running && mode ? mode : "Stopped"}
        dotClass={running ? "status-dot-success" : "status-dot-error"}
        flash={!running}
        valueClass={running ? "status-text-success" : "status-text-error"}
      />
      <StatusRow
        label="Port"
        icon={Plug}
        value={`${port} ${portLabel}`}
        dotClass={portDotClass}
        flash={portRestarting || !portHealthy}
        valueClass={portValueClass}
      />
      <StatusRow
        label="Last rebuild"
        icon={Clock3}
        value={formatBuildTime(status?.last_rebuild_at)}
        dotClass={status?.last_rebuild_at ? "status-dot-success" : "status-dot-idle"}
        valueClass={status?.last_rebuild_at ? "theme-text-soft" : "theme-text-faint"}
        title={
          status?.last_rebuild_at
            ? "When preview/ CSS and JS were last synced from your source files. Updates on watcher saves and Rebuild once."
            : "No preview output yet. Start the watcher or use Rebuild once to generate preview/ files."
        }
      />
    </SidebarCard>
  );
}
