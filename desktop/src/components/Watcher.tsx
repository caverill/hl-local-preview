import {
  Eye,
  Layers,
  Palette,
  RotateCw,
  Square,
  Braces,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { usePreviewContext } from "../hooks/PreviewContext";
import SidebarCard from "./SidebarCard";

type WatcherMode = "both" | "css" | "js";

const MODE_ICONS: Record<WatcherMode, LucideIcon> = {
  css: Palette,
  js: Braces,
  both: Layers,
};

function isWatcherMode(value: string): value is WatcherMode {
  return value === "both" || value === "css" || value === "js";
}

function isActive(mode: WatcherMode, activeMode: WatcherMode | null, running: boolean) {
  return running && activeMode === mode;
}

function inactiveClass(inactive: boolean) {
  return inactive ? "pointer-events-none opacity-40" : "";
}

type WatcherButtonProps = {
  label: string;
  icon: LucideIcon;
  className: string;
  inactive?: boolean;
  onClick?: () => void;
};

function WatcherButton({ label, icon: Icon, className, inactive = false, onClick }: WatcherButtonProps) {
  return (
    <button
      type="button"
      className={`btn btn-sm btn-interactive relative flex h-auto min-h-0 items-center justify-center rounded-xl border-0 py-2.5 text-sm font-medium ${className} ${inactiveClass(inactive)}`}
      aria-disabled={inactive}
      onClick={inactive ? undefined : onClick}
    >
      <Icon
        className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 shrink-0 opacity-80"
        strokeWidth={2}
        aria-hidden
      />
      <span>{label}</span>
    </button>
  );
}

type ModeButtonProps = {
  mode: WatcherMode;
  label: string;
  activeMode: WatcherMode | null;
  running: boolean;
  startDisabled: boolean;
  pendingMode: WatcherMode | null;
  onClick: () => void;
};

function ModeButton({
  mode,
  label,
  activeMode,
  running,
  startDisabled,
  pendingMode,
  onClick,
}: ModeButtonProps) {
  const active = isActive(mode, activeMode, running) || pendingMode === mode;
  const inactive = !active && startDisabled;
  const ModeIcon = MODE_ICONS[mode];

  const content = (
    <>
      <ModeIcon
        className={`absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 ${active ? "" : "opacity-70"}`}
        strokeWidth={2}
        aria-hidden
      />
      <span>{label}</span>
    </>
  );

  if (active) {
    return (
      <div
        aria-pressed="true"
        className="mode-active accent-btn-solid relative flex w-full items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold"
      >
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      className={`btn-interactive theme-sidebar-btn relative flex h-auto min-h-0 w-full items-center justify-center rounded-xl border-0 px-4 py-2.5 text-sm font-medium btn-interactive-lime ${inactiveClass(inactive)}`}
      aria-disabled={inactive}
      onClick={inactive ? undefined : onClick}
    >
      {content}
    </button>
  );
}

export default function Watcher() {
  const { online, running, status, startWatcher, stopWatcher, restartWatcher, setError } =
    usePreviewContext();
  const [busy, setBusy] = useState(false);
  const [pendingMode, setPendingMode] = useState<WatcherMode | null>(null);

  const activeMode: WatcherMode | null =
    running && status?.watcher_mode && isWatcherMode(status.watcher_mode)
      ? status.watcher_mode
      : null;

  useEffect(() => {
    if (running && activeMode) setPendingMode(null);
  }, [running, activeMode]);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
    } catch (e) {
      setPendingMode(null);
      setError(e instanceof Error ? e.message : "Watcher action failed");
    } finally {
      setBusy(false);
    }
  }

  const startDisabled = !online || running || busy;
  const controlDisabled = !running || busy;

  function startMode(mode: WatcherMode) {
    setPendingMode(mode);
    run(() => startWatcher(mode));
  }

  return (
    <SidebarCard title="Watcher" icon={Eye}>
      <ModeButton
        mode="css"
        label="CSS Only"
        activeMode={activeMode}
        running={running}
        startDisabled={startDisabled}
        pendingMode={pendingMode}
        onClick={() => startMode("css")}
      />
      <ModeButton
        mode="js"
        label="JS Only"
        activeMode={activeMode}
        running={running}
        startDisabled={startDisabled}
        pendingMode={pendingMode}
        onClick={() => startMode("js")}
      />
      <ModeButton
        mode="both"
        label="CSS & JS"
        activeMode={activeMode}
        running={running}
        startDisabled={startDisabled}
        pendingMode={pendingMode}
        onClick={() => startMode("both")}
      />
      <div className="theme-divider" />
      <WatcherButton
        label="Restart"
        icon={RotateCw}
        className="btn-interactive theme-sidebar-btn btn-interactive-lime"
        inactive={controlDisabled}
        onClick={() => run(restartWatcher)}
      />
      <WatcherButton
        label="Stop"
        icon={Square}
        className="bg-red-500/90 text-white hover:bg-red-500 btn-interactive-danger"
        inactive={controlDisabled}
        onClick={() => run(stopWatcher)}
      />
    </SidebarCard>
  );
}
