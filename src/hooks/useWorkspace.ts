import { useCallback, useEffect, useState } from 'react';

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
  /** Whether this handle currently has read/write permission. */
  permission: PermissionState;
}

const WORKSPACE_DB = 'startspace.workspace';
const WORKSPACE_STORE = 'handles';

function loadPersistedHandle(): Promise<FileSystemDirectoryHandle | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') { resolve(null); return; }
    const request = indexedDB.open(WORKSPACE_DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(WORKSPACE_STORE);
    request.onerror = () => resolve(null);
    request.onsuccess = () => {
      const transaction = request.result.transaction(WORKSPACE_STORE, 'readonly');
      const get = transaction.objectStore(WORKSPACE_STORE).get('current');
      get.onsuccess = () => resolve((get.result as FileSystemDirectoryHandle | undefined) ?? null);
      get.onerror = () => resolve(null);
    };
  });
}

function persistHandle(handle: FileSystemDirectoryHandle | null): Promise<void> {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') { resolve(); return; }
    const request = indexedDB.open(WORKSPACE_DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(WORKSPACE_STORE);
    request.onerror = () => resolve();
    request.onsuccess = () => {
      const transaction = request.result.transaction(WORKSPACE_STORE, 'readwrite');
      transaction.objectStore(WORKSPACE_STORE).put(handle, 'current');
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => resolve();
    };
  });
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
  const [grant, setGrant] = useState<WorkspaceGrant>({ handle: null, name: '', permission: 'denied' });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void loadPersistedHandle().then(async (handle) => {
      if (!active || !handle) return;
      try {
        const permission = await (handle as FileSystemDirectoryHandle & {
          queryPermission?: (descriptor: { mode: 'read' | 'readwrite' }) => Promise<PermissionState>;
        }).queryPermission?.({ mode: 'readwrite' });
        if (active) setGrant({ handle, name: handle.name, permission: permission ?? 'prompt' });
      } catch {
        await persistHandle(null);
      }
    });
    return () => { active = false; };
  }, []);

  const chooseWorkspace = useCallback(async (): Promise<FileSystemDirectoryHandle | null> => {
    setError(null);

    if (typeof window === 'undefined' || !('showDirectoryPicker' in window)) {
      setError('File System Access API not available in this browser.');
      return null;
    }

    try {
      if (grant.handle && grant.permission !== 'granted') {
        const requestPermission = (grant.handle as FileSystemDirectoryHandle & {
          requestPermission?: (descriptor: { mode: 'read' | 'readwrite' }) => Promise<PermissionState>;
        }).requestPermission;
        const permission = requestPermission
          ? await requestPermission.call(grant.handle, { mode: 'readwrite' })
          : 'granted';
        setGrant({ handle: grant.handle, name: grant.handle.name, permission });
        if (permission !== 'granted') {
          setError('Workspace permission was not granted.');
          return null;
        }
        await persistHandle(grant.handle);
        return grant.handle;
      }

      const picker = (window as { showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle> }).showDirectoryPicker;
      if (!picker) {
        setError('File System Access API not available in this browser.');
        return null;
      }
      const picked = await picker();
      setGrant({ handle: picked, name: picked.name, permission: 'granted' });
      await persistHandle(picked);
      return picked;
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'name' in err && (err as { name: string }).name === 'AbortError') return null;
      const message = err && typeof err === 'object' && 'message' in err ? String((err as { message: string }).message) : 'Failed to choose workspace.';
      setError(message);
      return null;
    }
  }, [grant.handle, grant.permission]);

  const reset = useCallback(() => {
    setGrant({ handle: null, name: '', permission: 'denied' });
    setError(null);
    void persistHandle(null);
  }, []);

  return { grant, error, chooseWorkspace, reset };
}
