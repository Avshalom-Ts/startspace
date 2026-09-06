import { useEffect, useState } from "react";
import { useConfig } from "../hooks/useConfig";
import type { WorkspaceRef } from "../hooks/useConfig";
import { useWorkspace } from "../hooks/useWorkspace";

// ---------------------------------------------------------------------------
// WorkspaceSetupPrompt
// ---------------------------------------------------------------------------

/**
 * Shown when the user has not yet chosen a workspace folder.
 * Calls showDirectoryPicker() via useWorkspace, persists the result to
 * chrome.storage.local via useConfig, so the homepage is shown on
 * subsequent launches.
 */
export function WorkspaceSetupPrompt() {
  const { grant, error, chooseWorkspace, reset } = useWorkspace();
  const { config, save: saveConfig } = useConfig();
  const [pickedName, setPickedName] = useState<string>("");

  // Persist the workspace identity to extension config when a folder is granted.
  useEffect(() => {
    if (
      grant.handle &&
      config &&
      config.currentWorkspace?.name !== grant.handle.name
    ) {
      const ref: WorkspaceRef = {
        id: `ws-${grant.handle.name}`,
        name: grant.handle.name,
      };
      void saveConfig({ ...config, currentWorkspace: ref });
      setPickedName(grant.handle.name);
    } else if (grant.handle) {
      setPickedName(grant.handle.name);
    }
  }, [grant.handle, config, saveConfig]);

  const done = !!grant.handle && grant.permission === "granted";
  const remembered = !!grant.handle && !done;

  return (
    <div className="w-full max-w-xl">
      <div className="rounded-lg border border-border bg-surface p-6 text-center">
        <h2 className="text-lg font-medium text-fg mb-2">
          Choose your workspace
        </h2>
        <p className="text-sm text-muted mb-4">
          StartSpace stores your notes, tasks, and workspace metadata in a
          folder on your computer. Pick a folder to get started.
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={done ? reset : chooseWorkspace}
            className="rounded-md border border-border bg-page px-4 py-2 text-sm font-medium text-fg transition-colors hover:border-fg/40 hover:bg-page hover:text-accent focus-visible:outline-2 focus-visible:outline-fg"
          >
            {done
              ? "Choose a different folder"
              : remembered
                ? "Reconnect workspace folder"
                : "Choose workspace folder"}
          </button>

          {error ? (
            <p className="text-sm text-red-500">{error}</p>
          ) : done ? (
            <p className="text-sm text-muted">
              Selected: <span className="text-fg">{pickedName}</span>
            </p>
          ) : null}
        </div>

        <p className="mt-4 text-xs text-muted">
          Your browser prompts you to grant access to the folder. StartSpace
          does not upload or share your files — everything stays on your
          computer.
        </p>
      </div>
    </div>
  );
}
