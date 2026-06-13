import { ChevronDown, FolderOpen, FolderSearch } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { formatRecentDir } from "../lib/logFilters";
import { btnLink } from "../lib/buttons";

type Props = {
  currentPath?: string;
  recentDirs: string[];
  running: boolean;
  disabled?: boolean;
  onSwitch: (path: string) => void | Promise<void>;
  onOpenFolder: () => void;
  onBrowseSetup: () => void;
};

function uniqueDirs(currentPath: string | undefined, recentDirs: string[]) {
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const dir of [currentPath, ...recentDirs]) {
    if (!dir || seen.has(dir)) continue;
    seen.add(dir);
    ordered.push(dir);
  }
  return ordered;
}

export default function ProjectSwitcher({
  currentPath,
  recentDirs,
  running,
  disabled = false,
  onSwitch,
  onOpenFolder,
  onBrowseSetup,
}: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const options = uniqueDirs(currentPath, recentDirs);
  const menuDisabled = disabled || running;

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const triggerLabel = currentPath ? formatRecentDir(currentPath) : "Choose project folder";
  const triggerTitle = running
    ? "Stop the watcher before switching projects"
    : currentPath ?? "Open Setup to choose a project folder";

  return (
    <div ref={rootRef} className="flex min-w-0 max-w-full items-center gap-2">
      <div className="relative flex items-center min-w-0 flex-1">
        <button
          type="button"
          className={`project-switcher-trigger w-full ${menuDisabled ? "project-switcher-trigger-disabled" : ""}`}
          disabled={menuDisabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          title={triggerTitle}
          onClick={() => {
            if (!menuDisabled) setOpen((value) => !value);
          }}
        >
          <span className="min-w-0 flex-1 truncate text-left font-mono text-sm">{triggerLabel}</span>
          <ChevronDown
            className={`h-3.5 w-3.5 shrink-0 opacity-50 transition-transform ${open ? "rotate-180" : ""}`}
            strokeWidth={2}
            aria-hidden
          />
        </button>

        {open && !menuDisabled ? (
          <div className="project-switcher-menu" role="listbox" aria-label="Recent projects">
            {options.length ? (
              options.map((dir) => {
                const active = dir === currentPath;
                return (
                  <button
                    key={dir}
                    type="button"
                    role="option"
                    aria-selected={active}
                    className={`project-switcher-item ${active ? "project-switcher-item-active" : ""}`}
                    title={dir}
                    onClick={() => {
                      setOpen(false);
                      if (!active) void onSwitch(dir);
                    }}
                  >
                    <span className="block truncate font-mono text-sm">{formatRecentDir(dir)}</span>
                    <span className="theme-text-faint block truncate text-[10px]">{dir}</span>
                  </button>
                );
              })
            ) : (
              <p className="theme-text-faint px-3 py-2 text-sm">No recent projects yet.</p>
            )}
            <button
              type="button"
              className="project-switcher-item project-switcher-item-action"
              onClick={() => {
                setOpen(false);
                onBrowseSetup();
              }}
            >
              <FolderSearch className="h-3.5 w-3.5 shrink-0 opacity-70" strokeWidth={2} aria-hidden />
              Browse for folder in setup…
            </button>
          </div>
        ) : null}
      </div>

      {currentPath ? (
        <button
          type="button"
          className={`${btnLink} mt-0.5 shrink-0 p-1`}
          onClick={onOpenFolder}
          title={`Open folder in Finder: ${currentPath}`}
          aria-label="Open project folder in Finder"
        >
          <FolderOpen className="h-3.5 w-3.5 opacity-60" strokeWidth={2} aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
