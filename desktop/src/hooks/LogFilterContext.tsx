import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  DEFAULT_LOG_FILTERS,
  readLogFilters,
  writeLogFilters,
  type LogFilterKey,
  type LogFilters,
} from "../lib/logFilters";

type LogFilterContextValue = {
  filters: LogFilters;
  search: string;
  setSearch: (value: string) => void;
  toggleFilter: (key: LogFilterKey) => void;
  filtersActive: boolean;
};

const LogFilterContext = createContext<LogFilterContextValue | null>(null);

export function LogFilterProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<LogFilters>(() => readLogFilters());
  const [search, setSearch] = useState("");

  useEffect(() => {
    writeLogFilters(filters);
  }, [filters]);

  const toggleFilter = useCallback((key: LogFilterKey) => {
    setFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const filtersActive = useMemo(
    () =>
      search.trim().length > 0 ||
      (Object.keys(DEFAULT_LOG_FILTERS) as LogFilterKey[]).some(
        (key) => filters[key] !== DEFAULT_LOG_FILTERS[key],
      ),
    [filters, search],
  );

  const value = useMemo(
    () => ({ filters, search, setSearch, toggleFilter, filtersActive }),
    [filters, search, toggleFilter, filtersActive],
  );

  return <LogFilterContext.Provider value={value}>{children}</LogFilterContext.Provider>;
}

export function useLogFilters() {
  const ctx = useContext(LogFilterContext);
  if (!ctx) {
    throw new Error("useLogFilters must be used within LogFilterProvider");
  }
  return ctx;
}
