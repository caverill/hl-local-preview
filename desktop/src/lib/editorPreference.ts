import type { EditorInfo } from "./api";

const STORAGE_KEY = "hl-preview-preferred-editor";

export function readPreferredEditor(): EditorInfo["id"] | null {
  if (typeof window === "undefined") return null;
  const value = localStorage.getItem(STORAGE_KEY);
  return value === "cursor" || value === "vscode" ? value : null;
}

export function writePreferredEditor(editor: EditorInfo["id"]) {
  localStorage.setItem(STORAGE_KEY, editor);
}

export function pickDefaultEditor(editors: EditorInfo[]): EditorInfo | null {
  const available = editors.filter((editor) => editor.available);
  if (!available.length) return null;
  const preferred = readPreferredEditor();
  return available.find((editor) => editor.id === preferred) ?? available[0]!;
}
