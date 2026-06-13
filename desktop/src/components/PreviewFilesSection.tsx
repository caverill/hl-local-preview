import { Braces, ChevronDown, Palette, FileBracesCorner, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { usePreviewContext } from "../hooks/PreviewContext";
import type { EditorInfo } from "../lib/api";
import { writePreferredEditor } from "../lib/editorPreference";

type PreviewCardProps = {
  title: string;
  file: string;
  url?: string;
  tone: "purple" | "yellow";
  icon: LucideIcon;
  editors: EditorInfo[];
  disabled?: boolean;
  onOpen: (editor: EditorInfo["id"], file: string) => void | Promise<void>;
  onMissingEditor: () => void;
};

function PreviewCard({
  title,
  file,
  url,
  tone,
  icon: Icon,
  editors,
  disabled = false,
  onOpen,
  onMissingEditor,
}: PreviewCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const cardClass = tone === "purple" ? "preview-card-purple" : "preview-card-yellow";
  const iconClass = tone === "purple" ? "icon-purple" : "icon-yellow";
  const availableEditors = editors.filter((editor) => editor.available);

  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(event: MouseEvent) {
      if (!cardRef.current?.contains(event.target as Node)) setMenuOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  async function openWith(editor: EditorInfo["id"]) {
    writePreferredEditor(editor);
    setMenuOpen(false);
    await onOpen(editor, file);
  }

  function handleClick() {
    if (disabled) return;
    if (!availableEditors.length) {
      onMissingEditor();
      return;
    }
    if (availableEditors.length === 1) {
      void openWith(availableEditors[0]!.id);
      return;
    }
    setMenuOpen((open) => !open);
  }

  function handlePickEditor(event: React.MouseEvent, editor: EditorInfo["id"]) {
    event.stopPropagation();
    void openWith(editor);
  }

  return (
    <div ref={cardRef} className="relative min-w-0">
      <button
        type="button"
        className={`preview-card preview-card-button flex w-full flex-col gap-2 text-left ${cardClass} ${disabled ? "preview-card-button-disabled" : ""}`}
        disabled={disabled}
        title={disabled ? undefined : `Open ${file} in your editor`}
        onClick={() => void handleClick()}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <Icon className={`h-4 w-4 shrink-0 ${iconClass}`} strokeWidth={2} aria-hidden />
            <h3 className="theme-text text-base font-semibold tracking-tight">{title}</h3>
          </div>
          {!disabled && availableEditors.length > 1 ? (
            <ChevronDown className="theme-text-faint h-3.5 w-3.5 shrink-0 opacity-60" strokeWidth={2} aria-hidden />
          ) : null}
        </div>
        <p className="theme-text-muted font-mono text-sm">{file}</p>
        {url ? (
          <p className="theme-text-faint truncate font-mono text-[11px] leading-relaxed">{url}</p>
        ) : (
          <p className="theme-text-faint text-[11px] leading-snug">Click to open source file</p>
        )}
      </button>

      {menuOpen && availableEditors.length > 1 ? (
        <div className="preview-card-editor-menu" role="menu" aria-label={`Open ${file}`}>
          {availableEditors.map((editor) => (
            <button
              key={editor.id}
              type="button"
              role="menuitem"
              className="preview-card-editor-item"
              onClick={(event) => handlePickEditor(event, editor.id)}
            >
              Open in {editor.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

type Props = {
  cssUrl?: string;
  jsUrl?: string;
};

export default function PreviewFilesSection({ cssUrl, jsUrl }: Props) {
  const { project, editors, openInEditor, setError } = usePreviewContext();
  const hasProject = Boolean(project?.path);

  async function handleOpen(editor: EditorInfo["id"], file: string) {
    if (!project?.path) return;
    try {
      await openInEditor(editor, file);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open in editor");
    }
  }

  function handleMissingEditor() {
    setError("Install Cursor or VS Code, or add the cursor/code command to your PATH.");
  }

  return (
    <section className="diagnostics-section flex min-w-0 flex-col gap-2 p-2">
      <div>
        <h2 className="section-title flex items-center gap-1.5">
          <FileBracesCorner className="h-3.5 w-3.5 shrink-0 opacity-60" strokeWidth={2} aria-hidden />
          Preview files
        </h2>
        <p className="theme-text-faint mt-1 text-[11px] leading-snug">
          Click a card to open the source file in Cursor or VS Code.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <PreviewCard
          title="CSS"
          file="main/styles.css"
          url={cssUrl}
          tone="purple"
          icon={Palette}
          editors={editors}
          disabled={!hasProject}
          onOpen={handleOpen}
          onMissingEditor={handleMissingEditor}
        />
        <PreviewCard
          title="JavaScript"
          file="main/main.js"
          url={jsUrl}
          tone="yellow"
          icon={Braces}
          editors={editors}
          disabled={!hasProject}
          onOpen={handleOpen}
          onMissingEditor={handleMissingEditor}
        />
      </div>
    </section>
  );
}
