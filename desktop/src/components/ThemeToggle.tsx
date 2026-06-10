import { Moon, Sun } from "lucide-react";
import { useTheme } from "../hooks/ThemeContext";

type Props = {
  variant?: "nav" | "sidebar";
};

export default function ThemeToggle({ variant = "nav" }: Props) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  const sidebar = variant === "sidebar";

  return (
    <button
      type="button"
      className={
        sidebar
          ? "btn btn-sm btn-interactive theme-sidebar-btn flex h-auto min-h-0 w-full items-center gap-2 rounded-xl border-0 py-2.5 text-left text-sm font-medium btn-interactive-lime"
          : "btn btn-ghost btn-sm btn-interactive theme-btn-ghost flex items-center gap-1.5 rounded-full px-4 text-xs font-medium tracking-wide"
      }
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
    >
      {isDark ? (
        <Sun className="h-4 w-4 shrink-0 opacity-70" strokeWidth={2} aria-hidden />
      ) : (
        <Moon className="h-4 w-4 shrink-0 opacity-70" strokeWidth={2} aria-hidden />
      )}
      <span className={sidebar ? "min-w-0 flex-1 truncate" : undefined}>
        {isDark ? "Light mode" : "Dark mode"}
      </span>
    </button>
  );
}
