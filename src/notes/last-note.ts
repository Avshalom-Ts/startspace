// Stores only a relative note path for each registered workspace, alongside
// the device-local File System Access handle. No note content is persisted.
type Selection = { version: 1; noteId: string };

/** Reads a versioned selection; unknown and malformed values are ignored. */
export function readLastNote(workspaceId: string): Promise<string | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === "undefined") {
      resolve(null);
      return;
    }
    const request = indexedDB.open("startspace.workspace", 1);
    request.onerror = () => resolve(null);
    request.onupgradeneeded = () => request.result.createObjectStore("handles");
    request.onsuccess = () => {
      const get = request.result
        .transaction("handles", "readonly")
        .objectStore("handles")
        .get(`note:${workspaceId}`);
      get.onsuccess = () => {
        const value = get.result as Selection | undefined;
        resolve(
          value?.version === 1 &&
            typeof value.noteId === "string" &&
            !value.noteId.startsWith("/") &&
            !value.noteId.includes("..") &&
            value.noteId.endsWith(".md")
            ? value.noteId
            : null,
        );
      };
      get.onerror = () => resolve(null);
    };
  });
}

/** Replaces or clears the remembered path after an app-managed note change. */
export function writeLastNote(
  workspaceId: string,
  noteId: string | null,
): Promise<void> {
  return new Promise((resolve) => {
    if (typeof indexedDB === "undefined") {
      resolve();
      return;
    }
    const request = indexedDB.open("startspace.workspace", 1);
    request.onerror = () => resolve();
    request.onupgradeneeded = () => request.result.createObjectStore("handles");
    request.onsuccess = () => {
      const transaction = request.result.transaction("handles", "readwrite");
      const store = transaction.objectStore("handles");
      if (noteId)
        store.put(
          { version: 1, noteId } satisfies Selection,
          `note:${workspaceId}`,
        );
      else store.delete(`note:${workspaceId}`);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => resolve();
    };
  });
}
