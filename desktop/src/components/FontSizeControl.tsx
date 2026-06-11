import { Minus, Plus, Type } from "lucide-react";
import { useTheme } from "../hooks/ThemeContext";
import { btnIcon } from "../lib/buttons";

export default function FontSizeControl() {
  const {
    fontSize,
    increaseFontSize,
    decreaseFontSize,
    canIncreaseFontSize,
    canDecreaseFontSize,
  } = useTheme();

  return (
    <div className="sidebar-static-row gap-3">
      <Type className="h-4 w-4 shrink-0 opacity-70" strokeWidth={2} aria-hidden />
      <span className="min-w-0 flex-1 truncate text-base">Font size</span>
      <div className="font-size-controls">
        <button
          type="button"
          className={`${btnIcon} font-size-step-btn`}
          onClick={decreaseFontSize}
          disabled={!canDecreaseFontSize}
          aria-label="Decrease font size"
          title="Decrease font size"
        >
          <Minus className="h-4 w-4" strokeWidth={2} aria-hidden />
        </button>
        <span className="min-w-[2.5rem] text-center text-base font-medium tabular-nums theme-text-body">
          {fontSize}px
        </span>
        <button
          type="button"
          className={`${btnIcon} font-size-step-btn`}
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
