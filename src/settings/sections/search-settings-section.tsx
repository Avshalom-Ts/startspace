import SettingsCard from "../components/settings-card";
import { Search, ExternalLink } from "lucide-react";
import { BrowserSearchSettings } from "../components/browser-search-settings";

export default function SearchSettingsSection({
  searchInfo,
}: {
  searchInfo: {
    available: boolean;
    name: string | null;
  } | null;
}) {
  return (
    <div className="space-y-3">
      <SettingsCard
        title="Local search"
        subtitle="Search order and scope"
        icon={Search}
      >
        <p className="text-sm text-fg">Bookmarks â†’ Notes â†’ Tasks â†’ Web</p>
        <p className="mt-2 text-sm text-muted">
          Bookmarks, notes, and tasks are searched locally. Choosing Web runs a
          search with your browser's current default provider.
        </p>
      </SettingsCard>
      <SettingsCard
        title="Web Search"
        subtitle="Browser-managed search provider"
        icon={ExternalLink}
      >
        <p className="text-sm font-medium text-fg">
          Uses your browser&apos;s default search engine.
        </p>
        <BrowserSearchSettings />
        {!searchInfo?.available && (
          <p className="mt-2 text-xs text-muted">
            Local bookmark, note, and task search remains available when browser
            search integration is unavailable.
          </p>
        )}
      </SettingsCard>
    </div>
  );
}
