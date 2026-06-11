import { ChevronDown, type LucideIcon } from "lucide-react";
import { useEffect, useId, useState, type ReactNode } from "react";

const STORAGE_PREFIX = "hl-preview-sidebar-collapsed:";

type Props = {
  id: string;
  title: string;
  icon?: LucideIcon;
  defaultCollapsed?: boolean;
  contentClassName?: string;
  children: ReactNode;
};

function readCollapsed(cardId: string, defaultCollapsed: boolean): boolean {
  if (typeof window === "undefined") return defaultCollapsed;
  const stored = localStorage.getItem(`${STORAGE_PREFIX}${cardId}`);
  if (stored === "true") return true;
  if (stored === "false") return false;
  return defaultCollapsed;
}

export default function CollapsibleSidebarCard({
  id,
  title,
  icon: Icon,
  defaultCollapsed = false,
  contentClassName = "gap-2",
  children,
}: Props) {
  const panelId = useId();
  const [collapsed, setCollapsed] = useState(() => readCollapsed(id, defaultCollapsed));

  useEffect(() => {
    localStorage.setItem(`${STORAGE_PREFIX}${id}`, String(collapsed));
  }, [collapsed, id]);

  return (
    <div className="glass-shell w-80">
      <div className="flex flex-col gap-3 p-4">
        <button
          type="button"
          className="sidebar-collapse-trigger flex w-full items-center gap-2 text-left"
          aria-expanded={!collapsed}
          aria-controls={panelId}
          onClick={() => setCollapsed((open) => !open)}
        >
          <h2 className="section-title flex min-w-0 flex-1 items-center gap-1.5">
            {Icon && <Icon className="h-3.5 w-3.5 shrink-0 opacity-60" strokeWidth={2} aria-hidden />}
            <span className="truncate">{title}</span>
          </h2>
          <ChevronDown
            className={`sidebar-collapse-chevron h-3.5 w-3.5 shrink-0 opacity-50 ${collapsed ? "" : "sidebar-collapse-chevron-open"}`}
            strokeWidth={2}
            aria-hidden
          />
        </button>
        {!collapsed ? (
          <div id={panelId} className={`flex flex-col ${contentClassName}`}>
            {children}
          </div>
        ) : null}
      </div>
    </div>
  );
}
