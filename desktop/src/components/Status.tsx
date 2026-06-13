import { Activity, Clock3, Plug, SlidersHorizontal, Unplug, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { usePreviewContext } from "../hooks/PreviewContext";
import { btnGhostSm } from "../lib/buttons";
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
  const { running, status, restarting, killPreviewPort, setError } = usePreviewContext();
  const [freeingPort, setFreeingPort] = useState(false);

  const port = status?.preview_port ?? 5500;
  const portOpen = status?.preview_port_open ?? false;
  const httpOk = status?.preview_http_ok ?? false;
  const rootMatches = status?.preview_root_matches ?? false;
  const portHealthy = running && portOpen && httpOk && rootMatches;
  const mode = status?.watcher_mode;

  const portRestarting = restarting && !portOpen;
  const portIdle = portOpen && !running;
  const portStale = portOpen && !httpOk;
  const portWrongRoot = httpOk && !rootMatches;

  let portLabel = "closed";
  if (portHealthy) portLabel = "live";
  else if (portRestarting) portLabel = "restarting";
  else if (portIdle) portLabel = portStale ? "stale" : "idle";
  else if (running && portOpen) portLabel = portStale ? "stale" : portWrongRoot ? "wrong root" : "starting";

  const portDotClass = portHealthy
    ? "status-dot-success"
    : portRestarting || portIdle
      ? "status-dot-idle"
      : running && portOpen
        ? "status-dot-warning"
        : "status-dot-error";
  const portValueClass = portHealthy
    ? "status-text-success"
    : portRestarting || portIdle
      ? "status-text-idle"
      : running && portOpen
        ? "status-text-warning"
        : "status-text-error";

  const showFreePort = !running && portOpen;

  async function handleFreePort() {
    setFreeingPort(true);
    setError("");
    try {
      await killPreviewPort();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not free preview port");
    } finally {
      setFreeingPort(false);
    }
  }

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
        flash={portRestarting || (running && !portHealthy)}
        valueClass={portValueClass}
        title={
          portStale && status?.preview_port_listener
            ? `Port in use by ${status.preview_port_listener} — not the preview server`
            : portWrongRoot && status?.preview_serve_root
              ? `Serving ${status.preview_serve_root}`
              : undefined
        }
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
      {showFreePort ? (
        <button
          type="button"
          className={`${btnGhostSm} mt-1 w-full tracking-wide`}
          disabled={freeingPort}
          onClick={() => void handleFreePort()}
        >
          <Unplug className="h-3 w-3 shrink-0 inline-block" strokeWidth={2} aria-hidden />
          {freeingPort ? "Freeing port…" : `Free port ${port}`}
        </button>
      ) : null}
    </SidebarCard>
  );
}
