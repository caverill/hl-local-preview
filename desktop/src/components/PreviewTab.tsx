import { ArrowUp, ScrollText, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLogFilters } from "../hooks/LogFilterContext";
import type { LogEntry } from "../lib/api";
import { btnIcon, btnNeutralSm } from "../lib/buttons";
import { filterLogs } from "../lib/logFilters";
import LogFilterControls from "./LogFilterControls";

function logColor(level: string) {
  if (level === "ok") return "log-level-ok";
  if (level === "err") return "log-level-err";
  if (level === "warn") return "log-level-warn";
  if (level === "cmd") return "log-level-cmd";
  return "log-level-info";
}

type Props = {
  logs: LogEntry[];
  onClearLogs: () => void | Promise<void>;
};

export default function PreviewTab({ logs, onClearLogs }: Props) {
  const logScrollRef = useRef<HTMLDivElement>(null);
  const logEndRef = useRef<HTMLDivElement>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const { filters, search, filtersActive } = useLogFilters();
  const visibleLogs = filterLogs(logs, filters, search);

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
  }, [visibleLogs]);

  function scrollLogsToTop() {
    logScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="theme-surface-inner glass-inner flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="theme-border-b flex shrink-0 flex-col gap-3 p-4">
        <div className="flex items-center justify-between gap-3">
          <span className="section-title flex items-center gap-1.5">
            <ScrollText className="h-3.5 w-3.5 shrink-0 opacity-60" strokeWidth={2} aria-hidden />
            Activity
            {filtersActive ? (
              <span className="theme-text-faint font-normal normal-case tracking-normal">
                {visibleLogs.length}/{logs.length}
              </span>
            ) : null}
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
        <LogFilterControls />
      </div>
      <div className="relative min-h-0 flex-1">
        <div
          ref={logScrollRef}
          className="h-full min-h-0 overflow-y-auto overscroll-contain p-4 font-mono text-sm leading-6"
        >
          {logs.length === 0 && (
            <p className="theme-text-faint">No output yet. Start the watcher or rebuild once.</p>
          )}
          {logs.length > 0 && visibleLogs.length === 0 && (
            <p className="theme-text-faint">No lines match the current filters.</p>
          )}
          {visibleLogs.map((l) => (
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
  );
}
