import { useState } from "react";
import SettingsCard from "../components/settings-card";
import { Link2, SlidersHorizontal } from "lucide-react";
import { useConfig, DEFAULT_PREFERENCES } from "../../hooks/useConfig";
import { useNotifications } from "../../notifications/notification-context";
import { WebsiteAccess } from "../components/website-access";
import SwitchRow from "../components/switch-row";

export default function LinksSettingsSection({
  showSaved,
}: {
  showSaved: () => void;
}) {
  const { config, save } = useConfig();
  const notifications = useNotifications();
  const preferences = { ...DEFAULT_PREFERENCES, ...config?.preferences };
  const changePreference = async (
    key: "fetchDescriptionOnSave" | "fetchDescriptionOnNewTab",
    value: boolean,
  ) => {
    if (!config) return;
    try {
      await save({ ...config, preferences: { ...preferences, [key]: value } });
      showSaved();
    } catch (error) {
      notifications.error(
        error instanceof Error ? error.message : "Setting could not be saved.",
      );
    }
  };
  const [linksLayout, setLinksLayout] = useState<"grid" | "list">(() =>
    localStorage.getItem("startspace.links.layout") === "list"
      ? "list"
      : "grid",
  );

  const selectLinksLayout = (value: "grid" | "list") => {
    setLinksLayout(value);
    localStorage.setItem("startspace.links.layout", value);
    window.dispatchEvent(
      new CustomEvent("startspace:links-layout-changed", { detail: value }),
    );
    showSaved();
  };

  return (
    <div className="space-y-3">
      <SettingsCard
        title="Bookmarks"
        subtitle="The browser remains the source of truth"
        icon={Link2}
      >
        <p className="text-sm text-muted">
          Names, URLs, folders, and deletion are managed by your browser.
          StartSpace stores favorites, tags, descriptions, and recent-open
          timestamps in .startspace/bookmark-metadata.json in the connected
          workspace.
        </p>
      </SettingsCard>
      <SettingsCard
        title="descriptions"
        subtitle="Editable website descriptions, saved in your workspace"
        icon={Link2}
      >
        <div className="space-y-3">
          {(
            [
              [
                "fetchDescriptionOnSave",
                "Fetch a description after saving a new bookmark",
              ],
              [
                "fetchDescriptionOnNewTab",
                "Fetch one missing description when a New Tab opens",
              ],
            ] as const
          ).map(([key, label]) => (
            <SwitchRow
              key={key}
              label={label}
              checked={preferences[key]}
              disabled={!config}
              onChange={(value) => void changePreference(key, value)}
            />
          ))}
          <p className="text-sm text-muted">
            Automatic fetching skips every existing description. Failed attempts
            leave an editable message, so they are not retried automatically.
            Fetch description in a link's details replaces its description
            directly.
          </p>
          <WebsiteAccess />
        </div>
      </SettingsCard>
      <SettingsCard
        title="Default Links layout"
        subtitle="Choose how bookmarks open in StartSpace"
        icon={SlidersHorizontal}
      >
        <div
          role="radiogroup"
          aria-label="Default Links layout"
          className="flex gap-2"
        >
          {(["grid", "list"] as const).map((layout) => (
            <button
              key={layout}
              type="button"
              role="radio"
              aria-checked={linksLayout === layout}
              onClick={() => selectLinksLayout(layout)}
              className={`min-h-9 rounded-md border px-4 text-sm capitalize ${linksLayout === layout ? "border-accent bg-accent/10 text-fg" : "border-border text-muted hover:text-fg"}`}
            >
              {layout}
            </button>
          ))}
        </div>
      </SettingsCard>
    </div>
  );
}
