import { useCallback, useState } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** The workspace grant for the current session.
 *
 *  For v1, the ``FileSystemDirectoryHandle`` is session-scoped: each launch the
 *  user re-grants the folder via ``showDirectoryPicker()``. The stable workspace
 *  identity (id + name) is stored in extension config so the app knows a workspace
 *  was chosen and can skip the setup prompt on subsequent launches.
 *
 *  This matches the decision in ``docs/decisions/0002-manifest-permissions-storage.md``
 *  that File System Access is runtime-gated via ``showDirectoryPicker()``.
 */
export interface WorkspaceGrant {
  /** The ``FileSystemDirectoryHandle`` granted by the user this session. */
  handle: FileSystemDirectoryHandle | null;
  /** Human-readable name for the workspace (used in UI, settings). */
  name: string;
}

// ---------------------------------------------------------------------------
// useWorkspace
// ---------------------------------------------------------------------------

/**
 * Manages the workspace selection flow:
 *
 *  1. Exposes ``chooseWorkspace()`` — calls ``showDirectoryPicker()`` to let the
 *     user pick a folder. Returns the granted ``FileSystemDirectoryHandle`` for
 *     use by the notes/tasks modules.
 *  2. When a folder is granted this session, the handle is available via ``grant``.
 *  3. The caller is responsible for persisting the workspace identity (id + name)
 *     to extension config (via ``useConfig``) so the setup prompt is skipped next time.
 *
 *  The user dismissing the picker (e.g. Escape) is not an error — it just means
 *  no workspace was chosen this time.
 */
export function useWorkspace() {
  const [grant, setGrant] = useState<WorkspaceGrant>({ handle: null, name: '' });
  const [error, setError] = useState<string | null>(null);

  const chooseWorkspace = useCallback(async (): Promise<FileSystemDirectoryHandle | null> => {
    setError(null);

    // Guard: the File System Access API must be present.
    if (typeof window === 'undefined' || !('showDirectoryPicker' in window)) {
      setError('File System Access API not available in this browser.');
      return null;
    }

    try {
      const picker = (window as { showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle> }).showDirectoryPicker;
      if (!picker) {
        setError('File System Access API not available in this browser.');
        return null;
      }
      const picked = await picker();
      setGrant({ handle: picked, name: picked.name });
      return picked;
    } catch (err: unknown) {
      // The user can dismiss the picker (e.g. Escape). That is not an error.
      if (err && typeof err === 'object' && 'name' in err && (err as { name: string }).name === 'AbortError') {
        return null;
      }
      const message = err && typeof err === 'object' && 'message' in err
        ? String((err as { message: string }).message)
        : 'Failed to choose workspace.';
      setError(message);
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setGrant({ handle: null, name: '' });
    setError(null);
  }, []);

  return { grant, error, chooseWorkspace, reset };
}
