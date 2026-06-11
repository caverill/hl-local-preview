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
import {
  btnActiveBlock,
  btnDangerBlock,
  btnDisabled,
  btnNeutralBlock,
  btnRestartingBlock,
} from "../lib/buttons";
import { usePreviewContext } from "../hooks/PreviewContext";
import { isSetupReady } from "../lib/setup";
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
  return inactive ? btnDisabled : "";
}

type WatcherButtonProps = {
  label: string;
  icon: LucideIcon;
  className: string;
  inactive?: boolean;
  spinning?: boolean;
  onClick?: () => void;
};

function WatcherButton({
  label,
  icon: Icon,
  className,
  inactive = false,
  spinning = false,
  onClick,
}: WatcherButtonProps) {
  return (
    <button
      type="button"
      className={`${className} ${inactiveClass(inactive)}`}
      aria-disabled={inactive}
      aria-busy={spinning}
      onClick={inactive ? undefined : onClick}
    >
      <Icon
        className={`absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 shrink-0 opacity-80 ${spinning ? "animate-spin" : ""}`}
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
        className={`${btnActiveBlock} mode-active`}
      >
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      className={`${btnNeutralBlock} ${inactiveClass(inactive)}`}
      aria-disabled={inactive}
      onClick={inactive ? undefined : onClick}
    >
      {content}
    </button>
  );
}

export default function Watcher() {
  const {
    online,
    running,
    status,
    project,
    startWatcher,
    stopWatcher,
    restartWatcher,
    restarting,
    setError,
  } = usePreviewContext();
  const setupReady = isSetupReady(project);
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

  const startDisabled = !setupReady || !online || running || busy;
  const controlDisabled = !setupReady || !running;
  const stopDisabled = controlDisabled || busy;

  function startMode(mode: WatcherMode) {
    setPendingMode(mode);
    run(() => startWatcher(mode));
  }

  return (
    <SidebarCard title="Watcher" icon={Eye} disabled={!setupReady}>
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
        label={restarting ? "Restarting…" : "Restart"}
        icon={RotateCw}
        className={restarting ? btnRestartingBlock : btnNeutralBlock}
        inactive={controlDisabled || (busy && !restarting)}
        spinning={restarting}
        onClick={() => run(restartWatcher)}
      />
      <WatcherButton
        label="Stop"
        icon={Square}
        className={btnDangerBlock}
        inactive={stopDisabled}
        onClick={() => run(stopWatcher)}
      />
    </SidebarCard>
  );
}
