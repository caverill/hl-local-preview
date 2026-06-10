import { Minus, Plus } from "lucide-react";
import { useTheme } from "../hooks/ThemeContext";

export default function FontSizeControl() {
  const {
    fontSize,
    increaseFontSize,
    decreaseFontSize,
    canIncreaseFontSize,
    canDecreaseFontSize,
  } = useTheme();

  return (
    <div className="flex flex-col gap-1.5 mt-2">
      <span className="text-[11px] font-medium uppercase tracking-[0.12em] theme-text-muted">
        Font size
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="btn btn-sm btn-interactive theme-sidebar-btn flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-0 p-0 btn-interactive-lime"
          onClick={decreaseFontSize}
          disabled={!canDecreaseFontSize}
          aria-label="Decrease font size"
          title="Decrease font size"
        >
          <Minus className="h-4 w-4" strokeWidth={2} aria-hidden />
        </button>
        <span className="flex-1 text-center text-sm font-medium tabular-nums theme-text-body">
          {fontSize}px
        </span>
        <button
          type="button"
          className="btn btn-sm btn-interactive theme-sidebar-btn flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-0 p-0 btn-interactive-lime"
          onClick={increaseFontSize}
          disabled={!canIncreaseFontSize}
          aria-label="Increase font size"
          title="Increase font size"
        >
          <Plus className="h-4 w-4" strokeWidth={2} aria-hidden />
        </button>
      </div>
    </div>
  );
}
