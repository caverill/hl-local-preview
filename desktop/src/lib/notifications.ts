import type { AppPreferences } from "./api";

export async function ensureNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

export function shouldNotify(prefs: AppPreferences | null): boolean {
  if (!prefs?.desktop_notifications) return false;
  if (typeof document === "undefined") return false;
  return document.hidden || !document.hasFocus();
}

export function notifyDesktop(title: string, body: string, prefs: AppPreferences | null) {
  if (!shouldNotify(prefs)) return;
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification(title, { body });
  } catch {
    // Ignore unsupported or blocked notifications.
  }
}
