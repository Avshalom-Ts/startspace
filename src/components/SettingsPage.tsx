import { WorkspaceSetupPrompt } from './WorkspaceSetup';

// ---------------------------------------------------------------------------
// SettingsPage
// ---------------------------------------------------------------------------

/**
 * Configuration view for StartSpace. Currently exposes the workspace folder
 * setup so the user can pick or change the local folder notes/tasks live in.
 */
export function SettingsPage() {
  return (
    <section className="w-full">
      <h2 className="text-sm font-medium uppercase tracking-wide text-muted mb-3">
        Settings
      </h2>

      <div>
        <h3 className="text-base font-medium text-fg mb-1">Workspace</h3>
        <p className="text-sm text-muted mb-4">
          Notes and tasks are stored as files in a folder you choose on your computer.
        </p>
        <WorkspaceSetupPrompt />
      </div>
    </section>
  );
}
