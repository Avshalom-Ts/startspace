// Settings for notes, including their Home page item limit.
import HomeLimitSettings from "../components/home-limit-settings";
import SettingsCard from "../components/settings-card";
import { FileText } from "lucide-react";
import SwitchRow from "../components/switch-row";

export default function NotesSettingsSection({
  homeLimit,
  onHomeLimitChange,
  notes,
  workspaceReady,
  loadRemoteNoteImages,
  updatePreference,
}: {
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
          <span aria-hidden="true">â†»</span> Refresh workspace
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
        label="Notes on Home"
        value={homeLimit}
        onChange={onHomeLimitChange}
        detail="Favorite notes appear first and count toward this limit, followed by recent notes."
      />
    </div>
  );
}
