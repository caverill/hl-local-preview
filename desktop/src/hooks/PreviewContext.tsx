import { createContext, useContext, type ReactNode } from "react";
import { usePreview } from "./usePreview";

type PreviewContextValue = ReturnType<typeof usePreview>;

const PreviewContext = createContext<PreviewContextValue | null>(null);

export function PreviewProvider({ children }: { children: ReactNode }) {
  const value = usePreview();
  return <PreviewContext.Provider value={value}>{children}</PreviewContext.Provider>;
}

export function usePreviewContext() {
  const ctx = useContext(PreviewContext);
  if (!ctx) {
    throw new Error("usePreviewContext must be used within PreviewProvider");
  }
  return ctx;
}
