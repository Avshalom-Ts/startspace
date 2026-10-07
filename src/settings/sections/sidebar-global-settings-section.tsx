import { Download, Folder, Link2, Upload } from "lucide-react";
import SettingsCard from "../components/settings-card";
import CapabilityRow from "../components/capability-row";

export default function SidebarGlobalSettingsSection({
  workspace,
  config,
  workspaceReady,
  chooseWorkspace,
  disconnectWorkspace,
  exportBackup,
  restoreInputRef,
  importBackup,
  backupBusy,
  bookmarkApiAvailable,
  searchInfo,
  fileSystemStatus,
}: {
  workspace: any;
  config: any;
  workspaceReady: boolean;
  chooseWorkspace: () => Promise<void>;
  disconnectWorkspace: () => void;
  exportBackup: () => Promise<void>;
  restoreInputRef: React.RefObject<HTMLInputElement | null>;
  importBackup: (file: File | undefined) => Promise<void>;
  backupBusy: boolean;
  bookmarkApiAvailable: boolean;
  searchInfo: any;
  fileSystemStatus: string;
}) {
  return (
    <aside className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 min-[1024px]:col-start-2 min-[1600px]:col-start-3 min-[1600px]:row-start-1 min-[1600px]:flex min-[1600px]:min-h-0 min-[1600px]:flex-col min-[1600px]:overflow-y-auto">
      <SettingsCard
        title="Workspace"
        subtitle="Current workspace location"
        icon={Folder}
      >
        <p
          className="truncate text-sm text-fg"
          title={
            workspace.grant.handle
              ? workspace.grant.name
              : (config?.currentWorkspace?.name ?? "No workspace selected")
          }
        >
          {workspace.grant.handle
            ? workspace.grant.name
            : (config?.currentWorkspace?.name ?? "No workspace selected")}
        </p>
        <p className="mt-1 text-xs text-muted">
          {workspaceReady
            ? "Connected"
            : workspace.grant.handle || config?.currentWorkspace
              ? "Permission required"
              : "Not selected"}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void chooseWorkspace()}
            className="min-h-9 flex-1 rounded-md border border-border px-2 text-xs text-fg hover:bg-page"
          >
            {workspaceReady
              ? "Change location"
              : workspace.grant.handle || config?.currentWorkspace
                ? "Reconnect"
                : "Choose workspace"}
          </button>
        </div>
        {workspaceReady && (
          <button
            type="button"
            onClick={disconnectWorkspace}
            className="mt-2 text-xs text-muted underline hover:text-red-500"
          >
            Disconnect
          </button>
        )}
      </SettingsCard>

      <SettingsCard
        title="Data Management"
        subtitle="Backup and restore your StartSpace data"
        icon={Download}
      >
        {!workspaceReady && (
          <p className="mb-2 text-xs text-muted">
            Connect a workspace before exporting or restoring.
          </p>
        )}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => void exportBackup()}
            disabled={!workspaceReady || !config || backupBusy}
            className="inline-flex min-h-9 items-center justify-center gap-1 rounded-md border border-border px-2 text-xs text-fg hover:bg-page disabled:opacity-50"
          >
            <Download size={14} aria-hidden="true" /> Export
          </button>
          <button
            type="button"
            onClick={() => restoreInputRef.current?.click()}
            disabled={!workspaceReady || backupBusy}
            className="inline-flex min-h-9 items-center justify-center gap-1 rounded-md border border-border px-2 text-xs text-fg hover:bg-page disabled:opacity-50"
          >
            <Upload size={14} aria-hidden="true" /> Restore
          </button>
        </div>
        <input
          ref={restoreInputRef}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          disabled={!workspaceReady || backupBusy}
          onChange={(event) => {
            const input = event.currentTarget;
            void importBackup(input.files?.[0]).finally(() => {
              input.value = "";
            });
          }}
        />
      </SettingsCard>

      <SettingsCard
        title="Browser Integration"
        subtitle="Capabilities available to StartSpace"
        icon={Link2}
      >
        <CapabilityRow
          label="Bookmarks API"
          status={bookmarkApiAvailable ? "Available" : "Unavailable"}
        />
        <CapabilityRow
          label="Search API"
          status={
            searchInfo === null
              ? "Checking"
              : searchInfo.available
                ? "Available"
                : "Unavailable"
          }
        />
        <CapabilityRow label="File System Access" status={fileSystemStatus} />
      </SettingsCard>
    </aside>
  );
}
