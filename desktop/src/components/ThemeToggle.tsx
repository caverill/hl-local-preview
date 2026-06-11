import { Moon, Sun } from "lucide-react";
import { useTheme } from "../hooks/ThemeContext";
import { btnGhostSm, btnNeutralBlockLeft } from "../lib/buttons";

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
      className={sidebar ? btnNeutralBlockLeft : `${btnGhostSm} tracking-wide`}
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
