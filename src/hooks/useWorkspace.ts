import { useCallback, useEffect, useState } from "react";

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
  /** Device-local registration identity, independent of the directory name. */
  id: string | null;
  /** Human-readable name for the workspace (used in UI, settings). */
  name: string;
  /** Whether this handle currently has read/write permission. */
  permission: PermissionState;
}

const WORKSPACE_DB = "startspace.workspace";
const WORKSPACE_STORE = "handles";
type RegisteredHandle = { id: string; handle: FileSystemDirectoryHandle };

export function loadPersistedHandle(): Promise<RegisteredHandle | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === "undefined") {
      resolve(null);
      return;
    }
    const request = indexedDB.open(WORKSPACE_DB, 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore(WORKSPACE_STORE);
    request.onerror = () => resolve(null);
    request.onsuccess = () => {
      const transaction = request.result.transaction(WORKSPACE_STORE, "readwrite");
      const store = transaction.objectStore(WORKSPACE_STORE);
      const get = store.get("current");
      let result: RegisteredHandle | null = null;
      get.onsuccess = () => {
        const stored = get.result as RegisteredHandle | FileSystemDirectoryHandle | null;
        if (!stored) return;
        result = "handle" in stored ? stored : { id: crypto.randomUUID(), handle: stored };
        if (!("handle" in stored)) {
          store.put(result, "current");
          store.put(result, `workspace:${result.id}`);
        }
      };
      get.onerror = () => resolve(null);
      transaction.oncomplete = () => resolve(result);
      transaction.onerror = () => resolve(null);
    };
  });
}

export function persistHandle(registration: RegisteredHandle | null): Promise<void> {
  return new Promise((resolve) => {
    if (typeof indexedDB === "undefined") {
      resolve();
      return;
    }
    const request = indexedDB.open(WORKSPACE_DB, 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore(WORKSPACE_STORE);
    request.onerror = () => resolve();
    request.onsuccess = () => {
      const transaction = request.result.transaction(
        WORKSPACE_STORE,
        "readwrite",
      );
      const store = transaction.objectStore(WORKSPACE_STORE);
      store.put(registration, "current");
      if (registration) store.put(registration, `workspace:${registration.id}`);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => resolve();
    };
  });
}

/** Reuses the registration of an already-known directory, even with duplicate names. */
export async function registerHandle(handle: FileSystemDirectoryHandle): Promise<RegisteredHandle> {
  const existing = await new Promise<RegisteredHandle[]>((resolve) => {
    if (typeof indexedDB === "undefined") { resolve([]); return; }
    const request = indexedDB.open(WORKSPACE_DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(WORKSPACE_STORE);
    request.onerror = () => resolve([]);
    request.onsuccess = () => {
      const get = request.result.transaction(WORKSPACE_STORE, "readonly").objectStore(WORKSPACE_STORE).getAll();
      get.onsuccess = () => resolve((get.result as unknown[]).filter((value): value is RegisteredHandle => !!value && typeof value === "object" && "handle" in value && "id" in value));
      get.onerror = () => resolve([]);
    };
  });
  for (const registration of existing) {
    try {
      if (await handle.isSameEntry(registration.handle)) return { ...registration, handle };
    } catch { continue; }
  }
  return { id: crypto.randomUUID(), handle };
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
  const [grant, setGrant] = useState<WorkspaceGrant>({
    handle: null,
    id: null,
    name: "",
    permission: "denied",
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void loadPersistedHandle().then(async (registration) => {
      if (!active || !registration) return;
      const { handle, id } = registration;
      try {
        const permission = await (
          handle as FileSystemDirectoryHandle & {
            queryPermission?: (descriptor: {
              mode: "read" | "readwrite";
            }) => Promise<PermissionState>;
          }
        ).queryPermission?.({ mode: "readwrite" });
        if (active)
          setGrant({
            handle,
            id,
            name: handle.name,
            permission: permission ?? "prompt",
          });
      } catch {
        await persistHandle(null);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const update = async () => {
      const registration = await loadPersistedHandle();
      if (registration) setGrant({ ...registration, name: registration.handle.name, permission: "granted" });
    };
    window.addEventListener("startspace:workspace-selected", update);
    return () => window.removeEventListener("startspace:workspace-selected", update);
  }, []);

  const chooseWorkspace =
    useCallback(async (): Promise<FileSystemDirectoryHandle | null> => {
      setError(null);

      if (typeof window === "undefined" || !("showDirectoryPicker" in window)) {
        setError("File System Access API not available in this browser.");
        return null;
      }

      try {
        if (grant.handle && grant.permission !== "granted") {
          const requestPermission = (
            grant.handle as FileSystemDirectoryHandle & {
              requestPermission?: (descriptor: {
                mode: "read" | "readwrite";
              }) => Promise<PermissionState>;
            }
          ).requestPermission;
          const permission = requestPermission
            ? await requestPermission.call(grant.handle, { mode: "readwrite" })
            : "granted";
          const registration = { id: grant.id ?? crypto.randomUUID(), handle: grant.handle };
          setGrant({
            handle: grant.handle,
            id: registration.id,
            name: grant.handle.name,
            permission,
          });
          if (permission !== "granted") {
            setError("Workspace permission was not granted.");
            return null;
          }
          await persistHandle(registration);
          window.dispatchEvent(new Event("startspace:workspace-selected"));
          return grant.handle;
        }

        const picker = (
          window as {
            showDirectoryPicker?: (options?: {
              mode?: "read" | "readwrite";
            }) => Promise<FileSystemDirectoryHandle>;
          }
        ).showDirectoryPicker;
        if (!picker) {
          setError("File System Access API not available in this browser.");
          return null;
        }
        const picked = await picker({ mode: "readwrite" });
        const registration = await registerHandle(picked);
        await persistHandle(registration);
        setGrant({ ...registration, name: picked.name, permission: "granted" });
        window.dispatchEvent(new Event("startspace:workspace-selected"));
        return picked;
      } catch (err: unknown) {
        if (
          err &&
          typeof err === "object" &&
          "name" in err &&
          (err as { name: string }).name === "AbortError"
        )
          return null;
        const message =
          err && typeof err === "object" && "message" in err
            ? String((err as { message: string }).message)
            : "Failed to choose workspace.";
        setError(message);
        return null;
      }
    }, [grant.handle, grant.id, grant.permission]);

  const reset = useCallback(() => {
    setGrant({ handle: null, id: null, name: "", permission: "denied" });
    setError(null);
    void persistHandle(null);
  }, []);

  return { grant, error, chooseWorkspace, reset };
}
