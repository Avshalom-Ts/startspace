import { useState } from "react";
import SettingsCard from "../components/settings-card";
import { Link2, SlidersHorizontal } from "lucide-react";

export default function LinksSettingsSection({
  showSaved,
}: {
  showSaved: () => void;
}) {
  const [linksLayout, setLinksLayout] = useState<"grid" | "list">(() =>
    localStorage.getItem("startspace.links.layout") === "list" ? "list" : "grid",
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
          timestamps locally.
        </p>
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
