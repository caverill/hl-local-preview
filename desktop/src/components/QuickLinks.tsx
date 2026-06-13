import {
  ExternalLink,
  GitBranch,
  Globe,
  Link2,
  Paintbrush,
  Puzzle,
  type LucideIcon,
} from "lucide-react";
import { btnDisabled, btnNeutralBlockLeft } from "../lib/buttons";
import { usePreviewContext } from "../hooks/PreviewContext";
import SidebarCard from "./SidebarCard";

type LinkButtonProps = {
  label: string;
  icon: LucideIcon;
  url?: string;
  inactive?: boolean;
  onOpen: (url: string) => void;
};

function LinkButton({ label, icon: Icon, url, inactive = false, onOpen }: LinkButtonProps) {
  const disabled = inactive || !url;

  return (
    <button
      type="button"
      className={`${btnNeutralBlockLeft} ${disabled ? btnDisabled : ""}`}
      aria-disabled={disabled}
      onClick={disabled ? undefined : () => onOpen(url!)}
    >
      <Icon className="h-4 w-4 shrink-0 opacity-70" strokeWidth={2} aria-hidden />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {!disabled && <ExternalLink className="h-3 w-3 shrink-0 opacity-35" strokeWidth={2} aria-hidden />}
    </button>
  );
}

function modeIncludesCss(mode: string | null | undefined) {
  return mode === "css" || mode === "both";
}

function modeIncludesJs(mode: string | null | undefined) {
  return mode === "js" || mode === "both";
}

export default function QuickLinks() {
  const { project, status, online, running, openUrl } = usePreviewContext();
  const urls = project?.urls;
  const previewLive = status?.preview_port_open ?? false;
  const watcherMode = status?.watcher_mode;
  const cssModeActive = running && modeIncludesCss(watcherMode);
  const jsModeActive = running && modeIncludesJs(watcherMode);

  return (
    <SidebarCard title="Quick Links" icon={Link2}>
      <LinkButton
        label="Stylus Install"
        icon={Paintbrush}
        url={urls?.stylus}
        inactive={!cssModeActive || !previewLive}
        onOpen={openUrl}
      />
      <LinkButton
        label="Tampermonkey Install"
        icon={Puzzle}
        url={urls?.tampermonkey_loader}
        inactive={!jsModeActive || !online}
        onOpen={openUrl}
      />
      <LinkButton label="Dev Site" icon={Globe} url={urls?.site} onOpen={openUrl} />
      <LinkButton
        label="GitHub Repository"
        icon={GitBranch}
        url={project?.remote_web_url ?? undefined}
        inactive={!project?.remote_web_url}
        onOpen={openUrl}
      />
    </SidebarCard>
  );
}
