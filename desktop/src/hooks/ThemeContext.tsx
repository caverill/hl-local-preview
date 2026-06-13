import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Theme = "light" | "dark";

const STORAGE_KEY = "hl-preview-theme";
const FONT_SIZE_STORAGE_KEY = "hl-preview-font-size";

export const MIN_FONT_SIZE = 14;
export const MAX_FONT_SIZE = 22;
export const DEFAULT_FONT_SIZE = 16;
const FONT_SIZE_STEP = 1;

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
}

export function applyFontSize(size: number) {
  document.documentElement.style.fontSize = `${size}px`;
}

export function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function getInitialFontSize(): number {
  if (typeof window === "undefined") return DEFAULT_FONT_SIZE;
  const stored = Number(localStorage.getItem(FONT_SIZE_STORAGE_KEY));
  if (!Number.isFinite(stored)) return DEFAULT_FONT_SIZE;
  return Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, stored));
}

type ThemeContextValue = {
  theme: Theme;
  fontSize: number;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  increaseFontSize: () => void;
  decreaseFontSize: () => void;
  canIncreaseFontSize: boolean;
  canDecreaseFontSize: boolean;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => getInitialTheme());
  const [fontSize, setFontSizeState] = useState<number>(() => getInitialFontSize());

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    applyFontSize(fontSize);
    localStorage.setItem(FONT_SIZE_STORAGE_KEY, String(fontSize));
  }, [fontSize]);

  const setTheme = (next: Theme) => setThemeState(next);
  const toggleTheme = () => setThemeState((t) => (t === "dark" ? "light" : "dark"));
  const increaseFontSize = () =>
    setFontSizeState((size) => Math.min(MAX_FONT_SIZE, size + FONT_SIZE_STEP));
  const decreaseFontSize = () =>
    setFontSizeState((size) => Math.max(MIN_FONT_SIZE, size - FONT_SIZE_STEP));

  return (
    <ThemeContext.Provider
      value={{
        theme,
        fontSize,
        setTheme,
        toggleTheme,
        increaseFontSize,
        decreaseFontSize,
        canIncreaseFontSize: fontSize < MAX_FONT_SIZE,
        canDecreaseFontSize: fontSize > MIN_FONT_SIZE,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
