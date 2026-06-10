import { Braces, Palette, ScrollText, Trash2, type LucideIcon } from "lucide-react";

function logColor(level: string) {
  if (level === "ok") return "log-level-ok";
  if (level === "err") return "log-level-err";
  if (level === "warn") return "log-level-warn";
  if (level === "cmd") return "log-level-cmd";
  return "theme-text-soft";
}

type PreviewCardProps = {
  title: string;
  file: string;
  url?: string;
  accent: "purple" | "amber";
  icon: LucideIcon;
};

function PreviewCard({ title, file, url, accent, icon: Icon }: PreviewCardProps) {
  const accentClass = accent === "purple" ? "preview-card-purple" : "preview-card-amber";
  const iconClass = accent === "purple" ? "text-purple-400/70" : "text-amber-400/70";

  return (
    <div className={`preview-card ${accentClass}`}>
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 shrink-0 ${iconClass}`} strokeWidth={2} aria-hidden />
        <h3 className="theme-text text-sm font-semibold tracking-tight">{title}</h3>
      </div>
      <p className="theme-text-muted mt-2 font-mono text-xs">{file}</p>
      {url && (
        <p className="theme-text-faint mt-1.5 truncate font-mono text-[11px] leading-relaxed">
          {url}
        </p>
      )}
    </div>
  );
}

type Props = {
  cssUrl?: string;
  jsUrl?: string;
  logs: { id: number; level: string; message: string }[];
  onClearLogs: () => void;
};

export default function PreviewTab({ cssUrl, jsUrl, logs, onClearLogs }: Props) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <PreviewCard title="CSS" file="main/styles.css" url={cssUrl} accent="purple" icon={Palette} />
        <PreviewCard title="JavaScript" file="main/main.js" url={jsUrl} accent="amber" icon={Braces} />
      </div>

      <div className="theme-surface-inner glass-inner flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="theme-border-b flex items-center justify-between px-4 py-3">
          <span className="section-title flex items-center gap-1.5">
            <ScrollText className="h-3.5 w-3.5 shrink-0 opacity-60" strokeWidth={2} aria-hidden />
            Activity
          </span>
          <button
            type="button"
            onClick={onClearLogs}
            className="btn btn-sm btn-interactive theme-sidebar-btn flex shrink-0 items-center gap-1.5 rounded-xl border-0 px-3 py-2 text-xs font-medium btn-interactive-lime"
          >
            <Trash2 className="h-3.5 w-3.5 shrink-0 opacity-70" strokeWidth={2} aria-hidden />
            Clear
          </button>
        </div>
        <div className="min-h-[12rem] flex-1 overflow-y-auto p-4 font-mono text-[11px] leading-6">
          {logs.length === 0 && (
            <p className="theme-text-faint">No output yet. Start the watcher.</p>
          )}
          {logs.map((l) => (
            <div key={l.id} className={logColor(l.level)}>
              {l.message}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
