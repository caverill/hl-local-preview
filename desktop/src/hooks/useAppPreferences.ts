import { usePreviewContext } from "./PreviewContext";
import { ensureNotificationPermission } from "../lib/notifications";

export function useAppPreferences() {
  const { online, preferences, savePreferences, setError } = usePreviewContext();

  function setAutoStartWatcher(checked: boolean) {
    void savePreferences({ auto_start_watcher: checked }).catch((e) => {
      setError(e instanceof Error ? e.message : "Could not save preference");
    });
  }

  function setDesktopNotifications(checked: boolean) {
    void (async () => {
      if (checked) {
        const granted = await ensureNotificationPermission();
        if (!granted) {
          setError("Desktop notifications are blocked in your browser settings.");
          return;
        }
      }
      await savePreferences({ desktop_notifications: checked });
    })().catch((e) => {
      setError(e instanceof Error ? e.message : "Could not save preference");
    });
  }

  return {
    online,
    preferences,
    setAutoStartWatcher,
    setDesktopNotifications,
  };
}
