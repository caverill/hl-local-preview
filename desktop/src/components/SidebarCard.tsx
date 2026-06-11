import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type Props = {
  title: string;
  icon?: LucideIcon;
  className?: string;
  disabled?: boolean;
  children: ReactNode;
};

export default function SidebarCard({
  title,
  icon: Icon,
  className = "",
  disabled = false,
  children,
}: Props) {
  return (
    <div
      className={`glass-shell w-64 ${disabled ? "pointer-events-none opacity-45" : ""} ${className}`.trim()}
      aria-disabled={disabled || undefined}
    >
      <div className="flex flex-col gap-3 p-4">
        <h2 className="section-title flex items-center gap-1.5">
          {Icon && <Icon className="h-3.5 w-3.5 shrink-0 opacity-60" strokeWidth={2} aria-hidden />}
          {title}
        </h2>
        <div className="flex flex-col gap-2">{children}</div>
      </div>
    </div>
  );
}
