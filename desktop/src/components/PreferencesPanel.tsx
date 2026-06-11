import { Settings2 } from "lucide-react";
import { useAppPreferences } from "../hooks/useAppPreferences";
import CollapsibleSidebarCard from "./CollapsibleSidebarCard";
import FontSizeControl from "./FontSizeControl";
import PreferenceToggle from "./PreferenceToggle";
import ThemeToggle from "./ThemeToggle";

export default function PreferencesPanel() {
  const { online, preferences, setAutoStartWatcher, setDesktopNotifications } = useAppPreferences();

  return (
    <CollapsibleSidebarCard
      id="preferences"
      title="Preferences"
      icon={Settings2}
      defaultCollapsed
      contentClassName="gap-2"
    >
      <p className="theme-text-faint text-[11px] leading-snug">
        Appearance and launch options. Saved locally in this browser.
      </p>
      <ThemeToggle variant="sidebar" />
      <FontSizeControl />
      <PreferenceToggle
        label="Auto-start watcher"
        description="Start last mode when the app opens"
        checked={preferences?.auto_start_watcher ?? false}
        disabled={!online}
        onChange={setAutoStartWatcher}
      />
      <PreferenceToggle
        label="Desktop notifications"
        description="Alert when the window is in the background"
        checked={preferences?.desktop_notifications ?? false}
        disabled={!online}
        onChange={setDesktopNotifications}
      />
    </CollapsibleSidebarCard>
  );
}
