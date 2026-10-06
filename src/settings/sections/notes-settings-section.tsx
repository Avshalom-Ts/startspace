import SettingsCard from "../components/settings-card";
import { FileText } from "lucide-react";

export default function NotesSettingsSection({
  notes,
  workspaceReady,
}: {
  notes: any;
  workspaceReady: boolean;
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
          <li>Markdown preview avoids loading remote images.</li>
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
    </div>
  );
}
