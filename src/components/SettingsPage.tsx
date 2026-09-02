import { WorkspaceSetupPrompt } from "./WorkspaceSetup";
import { WEB_SEARCH_ENGINES, useConfig } from "../hooks/useConfig";
import { useWorkspace } from "../hooks/useWorkspace";
import { useEffect, useState } from "react";
import {
  createBackup,
  downloadBackup,
  restoreBackup,
} from "../backup/backup-service";
import { BackupValidationError } from "../backup/backup-format";

// ---------------------------------------------------------------------------
// SettingsPage
// ---------------------------------------------------------------------------

/**
 * Configuration view for workspace selection, web fallback, and portable
 * backup/restore. Backup actions only touch the user-selected local workspace
 * and StartSpace-owned extension storage.
 */
export function SettingsPage() {
  const { config, loading, save } = useConfig();
  const { grant } = useWorkspace();
  const workspaceReady =
    !loading && !!grant.handle && grant.permission === "granted";
  const [selectedTemplate, setSelectedTemplate] = useState(
    WEB_SEARCH_ENGINES[0]!.urlTemplate,
  );
  const [message, setMessage] = useState<string | null>(null);
  const [backupBusy, setBackupBusy] = useState(false);
  const [backupMessage, setBackupMessage] = useState<string | null>(null);
  const [backupError, setBackupError] = useState<string | null>(null);

  useEffect(() => {
    if (!config) return;
    setSelectedTemplate(config.webSearchEngine.urlTemplate);
  }, [config]);

  const saveEngine = async () => {
    const engine = WEB_SEARCH_ENGINES.find(
      (candidate) => candidate.urlTemplate === selectedTemplate,
    );
    if (!config || !engine) return;
    await save({
      ...config,
      webSearchEngine: engine,
    });
    setMessage("Web search engine saved.");
  };

  /** Exports settings, bookmark metadata, theme, and workspace files as JSON. */
  const exportBackup = async () => {
    if (!grant.handle || !config) return;
    setBackupBusy(true);
    setBackupMessage(null);
    setBackupError(null);
    try {
      const backup = await createBackup(grant.handle, config);
      downloadBackup(backup);
      setBackupMessage(
        `Backup exported with ${backup.workspace.files.length} workspace file${backup.workspace.files.length === 1 ? "" : "s"}.`,
      );
    } catch {
      setBackupError(
        "Backup could not be created. Reconnect the workspace and try again.",
      );
    } finally {
      setBackupBusy(false);
    }
  };

  /** Validates and restores the single backup file selected by the user. */
  const importBackup = async (file: File | undefined) => {
    if (!file || !grant.handle || !config) return;
    setBackupBusy(true);
    setBackupMessage(null);
    setBackupError(null);
    try {
      const summary = await restoreBackup(
        await file.text(),
        grant.handle,
        config,
      );
      setBackupMessage(
        `Backup restored: ${summary.filesRestored} workspace file${summary.filesRestored === 1 ? "" : "s"} and ${summary.bookmarkMetadataEntries} bookmark metadata entr${summary.bookmarkMetadataEntries === 1 ? "y" : "ies"}.`,
      );
    } catch (error) {
      setBackupError(
        error instanceof BackupValidationError
          ? error.message
          : "Backup could not be restored. No unrelated workspace files were deleted.",
      );
    } finally {
      setBackupBusy(false);
    }
  };

  return (
    <section className="w-full flex flex-col justify-center items-center">
      <div>
        <h3 className="text-base font-medium text-fg mb-1">Workspace</h3>
        <p className="text-sm text-muted mb-4">
          Notes and tasks are stored as files in a folder you choose on your
          computer.
        </p>
        {!workspaceReady && (
          <div
            className="mb-4 rounded-md border border-accent/50 bg-page p-3 text-sm text-fg"
            role="alert"
          >
            Workspace folder is not selected. Notes and tasks are currently
            disabled until you choose one below.
          </div>
        )}
        <WorkspaceSetupPrompt />
      </div>

      <div className="mt-8 w-xl border-t border-border pt-6">
        <h3 className="mb-1 text-base font-medium text-fg">Web search</h3>
        <p className="mb-4 text-sm text-muted">
          Used when the homepage search falls through to the web.
        </p>
        <div className="grid gap-3">
          <label className="text-sm text-fg">
            Search engine
            <select
              value={selectedTemplate}
              onChange={(event) => setSelectedTemplate(event.target.value)}
              className="mt-1 w-full border border-border bg-surface px-3 py-2 text-sm text-fg focus:outline-none"
            >
              {WEB_SEARCH_ENGINES.map((engine) => (
                <option key={engine.urlTemplate} value={engine.urlTemplate}>
                  {engine.name}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-center gap-3">
            <button
              onClick={() => void saveEngine()}
              disabled={loading}
              className="border border-border bg-page px-3 py-2 text-sm text-fg hover:border-fg/40 disabled:opacity-50"
            >
              Save web search
            </button>
            {message && (
              <span className="text-sm text-muted" role="status">
                {message}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 w-full max-w-xl border-t border-border pt-6">
        <h3 className="mb-1 text-base font-medium text-fg">
          Backup and restore
        </h3>
        <p className="mb-4 text-sm text-muted">
          Export one portable JSON file containing workspace files, settings,
          theme, and bookmark-linked metadata. Restore overwrites matching files
          but never deletes other files already in the selected workspace.
        </p>
        {!workspaceReady && (
          <p className="mb-3 text-sm text-muted" role="status">
            Connect a workspace before exporting or restoring a backup.
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void exportBackup()}
            disabled={!workspaceReady || !config || backupBusy}
            className="rounded-md border border-border bg-page px-3 py-2 text-sm text-fg hover:border-fg/40 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {backupBusy ? "Working…" : "Export backup"}
          </button>
          <label
            className={`rounded-md border border-border bg-page px-3 py-2 text-sm text-fg hover:border-fg/40 ${!workspaceReady || backupBusy ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
          >
            Restore backup
            <input
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
          </label>
        </div>
        {backupMessage && (
          <p className="mt-3 text-sm text-muted" role="status">
            {backupMessage}
          </p>
        )}
        {backupError && (
          <p className="mt-3 text-sm text-red-500" role="alert">
            {backupError}
          </p>
        )}
      </div>
    </section>
  );
}
