import {
  Code2,
  ExternalLink,
  GitBranch,
  Globe,
  Link2,
  Paintbrush,
  Puzzle,
  type LucideIcon,
} from "lucide-react";
import { type EditorInfo } from "../lib/api";
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
  const { project, status, editors, online, running, openUrl, openInEditor, setError } =
    usePreviewContext();
  const urls = project?.urls;
  const previewLive = status?.preview_port_open ?? false;
  const watcherMode = status?.watcher_mode;
  const cssModeActive = running && modeIncludesCss(watcherMode);
  const jsModeActive = running && modeIncludesJs(watcherMode);
  const availableEditors = editors.filter((e) => e.available);

  async function handleOpenInEditor(editor: EditorInfo["id"]) {
    if (!project?.path) return;
    try {
      await openInEditor(editor, project.path);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open in editor");
    }
  }

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

      {project?.path && availableEditors.length > 0 ? (
        <button
          type="button"
          className={btnNeutralBlockLeft}
          onClick={() => handleOpenInEditor(availableEditors[0]!.id)}
        >
          <Code2 className="h-4 w-4 shrink-0 opacity-70" strokeWidth={2} aria-hidden />
          <span className="min-w-0 flex-1 truncate">Open in {availableEditors[0]!.label}</span>
        </button>
      ) : null}
    </SidebarCard>
  );
}
