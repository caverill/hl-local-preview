import { ArrowUp, Braces, Palette, ScrollText, Trash2, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { btnIcon, btnNeutralSm } from "../lib/buttons";

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
    <div className={`preview-card flex flex-col gap-2 ${accentClass}`}>
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 shrink-0 ${iconClass}`} strokeWidth={2} aria-hidden />
        <h3 className="theme-text text-base font-semibold tracking-tight">{title}</h3>
      </div>
      <p className="theme-text-muted font-mono text-base">{file}</p>
      {url && (
        <p className="theme-text-faint truncate font-mono text-[11px] leading-relaxed">
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
  onClearLogs: () => void | Promise<void>;
};

export default function PreviewTab({ cssUrl, jsUrl, logs, onClearLogs }: Props) {
  const logScrollRef = useRef<HTMLDivElement>(null);
  const logEndRef = useRef<HTMLDivElement>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const el = logScrollRef.current;
    if (!el) return;

    const onScroll = () => {
      setShowBackToTop(el.scrollTop > 120);
    };

    onScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ block: "end" });
  }, [logs]);

  function scrollLogsToTop() {
    logScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <PreviewCard title="CSS" file="main/styles.css" url={cssUrl} accent="purple" icon={Palette} />
        <PreviewCard title="JavaScript" file="main/main.js" url={jsUrl} accent="amber" icon={Braces} />
      </div>

      <div className="theme-surface-inner glass-inner flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="theme-border-b flex shrink-0 items-center justify-between p-4">
          <span className="section-title flex items-center gap-1.5">
            <ScrollText className="h-3.5 w-3.5 shrink-0 opacity-60" strokeWidth={2} aria-hidden />
            Activity
          </span>
          <button
            type="button"
            onClick={() => void onClearLogs()}
            className={`${btnNeutralSm} shrink-0`}
          >
            <Trash2 className="h-3.5 w-3.5 shrink-0 opacity-70" strokeWidth={2} aria-hidden />
            Clear
          </button>
        </div>
        <div className="relative min-h-0 flex-1">
          <div
            ref={logScrollRef}
            className="h-full min-h-0 overflow-y-auto overscroll-contain p-4 font-mono text-sm leading-6"
          >
            {logs.length === 0 && (
              <p className="theme-text-faint">No output yet. Start the watcher.</p>
            )}
            {logs.map((l) => (
              <div key={l.id} className={logColor(l.level)}>
                {l.message}
              </div>
            ))}
            <div ref={logEndRef} aria-hidden />
          </div>
          {showBackToTop ? (
            <button
              type="button"
              className={`${btnIcon} log-back-top`}
              onClick={scrollLogsToTop}
              aria-label="Back to top of activity log"
              title="Back to top"
            >
              <ArrowUp className="h-4 w-4" strokeWidth={2} aria-hidden />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
