// Settings for notes, including independent Home and search item limits.
import HomeLimitSettings from "../components/home-limit-settings";
import SettingsCard from "../components/settings-card";
import { FileText, RefreshCw } from "lucide-react";
import SwitchRow from "../components/switch-row";

export default function NotesSettingsSection({
  searchLimit,
  onSearchLimitChange,
  homeLimit,
  onHomeLimitChange,
  notes,
  workspaceReady,
  loadRemoteNoteImages,
  updatePreference,
}: {
  searchLimit: number;
  onSearchLimitChange: (value: number) => void;
  homeLimit: number;
  onHomeLimitChange: (value: number) => void;
  notes: any;
  workspaceReady: boolean;
  loadRemoteNoteImages: boolean;
  updatePreference: (value: boolean) => void;
}) {
  return (
    <div className="space-y-3">
      <SettingsCard
        title="Notes behavior"
        subtitle="Ordinary Markdown files in your workspace"
        icon={FileText}
      >
        <ul className="space-y-2 text-sm text-muted">
          <li>Notes are stored as Markdown files in the selected workspace.</li>
          <li>
            Edits autosave after a short pause; conflicts preserve your draft.
          </li>
          <li>
            Markdown preview loads workspace images without a network request.
          </li>
        </ul>
        <button
          type="button"
          onClick={() => void notes.refresh()}
          disabled={!workspaceReady || notes.loading}
          className="mt-3 inline-flex min-h-9 items-center gap-2 rounded-md border border-border px-3 text-sm text-fg hover:bg-page disabled:opacity-50"
        >
          <RefreshCw size={16} aria-hidden="true" /> Refresh workspace
        </button>
      </SettingsCard>

      <SettingsCard
        title="Markdown privacy"
        subtitle="Control external content in note previews"
        icon={FileText}
      >
        <SwitchRow
          label="Load remote images"
          detail="When enabled, previews may contact the public HTTP(S) image hosts named in a note. This setting applies to all Notes previews."
          checked={loadRemoteNoteImages}
          onChange={updatePreference}
        />
      </SettingsCard>
      <HomeLimitSettings
        feature="Notes"
        homeLabel="Notes on Home"
        homeDetail="Favorite notes appear first and count toward this limit, followed by recent notes."
        homeLimit={homeLimit}
        onHomeLimitChange={onHomeLimitChange}
        searchLimit={searchLimit}
        onSearchLimitChange={onSearchLimitChange}
      />
    </div>
  );
}
