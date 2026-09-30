// Device-local crash recovery for one unsaved Markdown buffer per registered
// workspace. Never writes drafts into the user's filesystem without consent.
export type SavedDraft = {
  version: 1;
  noteId: string;
  content: string;
  baseline: string;
};

const pending = new Map<string, Promise<void>>();

/** Reads a validated draft without treating malformed storage as note content. */
export async function readDraft(
  workspaceId: string,
): Promise<SavedDraft | null> {
  await pending.get(workspaceId)?.catch(() => undefined);
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("startspace.workspace", 1);
    request.onerror = () => reject(request.error);
    request.onupgradeneeded = () => request.result.createObjectStore("handles");
    request.onsuccess = () => {
      const database = request.result;
      const get = database
        .transaction("handles", "readonly")
        .objectStore("handles")
        .get(`draft:${workspaceId}`);
      get.onsuccess = () => {
        const value: unknown = get.result;
        resolve(
          value &&
            typeof value === "object" &&
            (value as SavedDraft).version === 1 &&
            typeof (value as SavedDraft).noteId === "string" &&
            /^(?!\/|.*\\)(?!.*(?:^|\/)\.\.?\/).+\.md$/.test(
              (value as SavedDraft).noteId,
            ) &&
            typeof (value as SavedDraft).content === "string" &&
            typeof (value as SavedDraft).baseline === "string" &&
            (value as SavedDraft).content !== (value as SavedDraft).baseline
            ? (value as SavedDraft)
            : null,
        );
        database.close();
      };
      get.onerror = () => {
        database.close();
        reject(get.error);
      };
    };
  });
}

/** Serializes writes and deletion so an older keystroke cannot restore a saved draft. */
export function writeDraft(
  workspaceId: string,
  draft: SavedDraft | null,
): Promise<void> {
  const previous = pending.get(workspaceId) ?? Promise.resolve();
  const next = previous
    .catch(() => undefined)
    .then(
      () =>
        new Promise<void>((resolve, reject) => {
          const request = indexedDB.open("startspace.workspace", 1);
          request.onerror = () => reject(request.error);
          request.onupgradeneeded = () =>
            request.result.createObjectStore("handles");
          request.onsuccess = () => {
            const database = request.result;
            const transaction = database.transaction("handles", "readwrite");
            const store = transaction.objectStore("handles");
            if (draft) store.put(draft, `draft:${workspaceId}`);
            else store.delete(`draft:${workspaceId}`);
            transaction.oncomplete = () => {
              database.close();
              resolve();
            };
            transaction.onerror = () => {
              database.close();
              reject(transaction.error);
            };
          };
        }),
    );
  pending.set(workspaceId, next);
  void next
    .finally(() => {
      if (pending.get(workspaceId) === next) pending.delete(workspaceId);
    })
    .catch(() => undefined);
  return next;
}
