import { Search } from "lucide-react";
import type { LogFilterKey } from "../lib/logFilters";
import { useLogFilters } from "../hooks/LogFilterContext";

const FILTER_OPTIONS: { id: LogFilterKey; label: string; tone: "error" | "info" | "success" | "muted" }[] = [
  { id: "errors", label: "Errors", tone: "error" },
  { id: "commands", label: "Commands", tone: "muted" },
  { id: "updates", label: "Updates", tone: "success" },
  { id: "info", label: "Info", tone: "info" },
];

export default function LogFilterControls() {
  const { filters, search, setSearch, toggleFilter } = useLogFilters();

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <div className="flex flex-wrap gap-1.5">
        {FILTER_OPTIONS.map(({ id, label, tone }) => (
          <button
            key={id}
            type="button"
            className={`log-filter-pill ${filters[id] ? "log-filter-pill-active" : ""}`}
            data-tone={filters[id] ? tone : undefined}
            aria-pressed={filters[id]}
            onClick={() => toggleFilter(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <label className="log-search-wrap flex w-full min-w-[11rem] max-w-sm shrink-0 items-center gap-2 sm:w-auto">
        <Search className="theme-text-faint h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search activity…"
          className="log-search-input min-w-0 flex-1"
        />
      </label>
    </div>
  );
}
