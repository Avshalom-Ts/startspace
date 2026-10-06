import SettingsCard from "../components/settings-card";
import { Folder } from "lucide-react";

export default function WorkspaceSettingsSection({
  workspaceReady,
  workspace,
  chooseWorkspace,
  disconnectWorkspace,
}: {
  workspaceReady: boolean;
  workspace: any;
  chooseWorkspace: () => Promise<void>;
  disconnectWorkspace: () => void;
}) {
  return (
    <div className="space-y-3">
      <SettingsCard
        title="Workspace access"
        subtitle="Choose a local folder for Markdown notes and tasks"
        icon={Folder}
      >
        <p className="text-sm text-muted">
          Your browser manages the extension installation. You choose the folder
          containing your data. Changing location does not move files.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void chooseWorkspace()}
            className="min-h-9 rounded-md bg-accent px-3 text-sm font-medium text-accent-foreground"
          >
            {workspaceReady
              ? "Change location"
              : workspace.grant.handle
                ? "Reconnect workspace"
                : "Choose workspace"}
          </button>
          {workspaceReady && (
            <button
              type="button"
              onClick={disconnectWorkspace}
              className="min-h-9 rounded-md border border-border px-3 text-sm text-fg hover:bg-page"
            >
              Disconnect
            </button>
          )}
        </div>
        {workspace.error && (
          <p className="mt-2 text-sm text-red-500" role="alert">
            {workspace.error}
          </p>
        )}
      </SettingsCard>
    </div>
  );
}
