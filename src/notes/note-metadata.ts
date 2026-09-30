// Portable Notes presentation metadata, separate from user-owned Markdown.
// The versioned sidecar is stored under the granted workspace's .startspace folder.
export type NotePreferences = {
  favorite: boolean;
  tags: string[];
  lastOpenedAt: string | null;
};
export type NoteMetadataDocument = {
  version: 1;
  notes: Record<string, NotePreferences>;
};

/** Refuses malformed or unsupported metadata instead of silently replacing it. */
export function parseNoteMetadata(raw: unknown): NoteMetadataDocument {
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    throw new Error("Invalid note metadata.");
  const document = raw as Record<string, unknown>;
  if (
    document.version !== 1 ||
    !document.notes ||
    typeof document.notes !== "object" ||
    Array.isArray(document.notes)
  )
    throw new Error("Unsupported note metadata.");
  const notes: Record<string, NotePreferences> = {};
  for (const [id, value] of Object.entries(document.notes)) {
    if (
      !/^note-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        id,
      ) ||
      !value ||
      typeof value !== "object" ||
      Array.isArray(value)
    )
      throw new Error("Invalid note metadata entry.");
    const entry = value as Record<string, unknown>;
    if (
      typeof entry.favorite !== "boolean" ||
      !Array.isArray(entry.tags) ||
      !entry.tags.every(
        (tag) =>
          typeof tag === "string" &&
          tag.trim() === tag &&
          tag.length > 0 &&
          tag.length <= 64,
      ) ||
      new Set(entry.tags).size !== entry.tags.length ||
      (entry.lastOpenedAt !== null &&
        (typeof entry.lastOpenedAt !== "string" ||
          !Number.isFinite(Date.parse(entry.lastOpenedAt))))
    )
      throw new Error("Invalid note metadata entry.");
    notes[id] = {
      favorite: entry.favorite,
      tags: [...entry.tags] as string[],
      lastOpenedAt: entry.lastOpenedAt as string | null,
    };
  }
  return { version: 1, notes };
}

/** Applies a validated change to one stable note identity without mutating the input. */
export function changeNotePreferences(
  document: NoteMetadataDocument,
  id: string,
  change: (current: NotePreferences) => NotePreferences,
): NoteMetadataDocument {
  const current = document.notes[id] ?? {
    favorite: false,
    tags: [],
    lastOpenedAt: null,
  };
  return parseNoteMetadata({
    version: 1,
    notes: { ...document.notes, [id]: change(current) },
  });
}

const fileName = "note-metadata.json";
const pending = new WeakMap<
  FileSystemDirectoryHandle,
  Promise<NoteMetadataDocument>
>();
const isMissing = (error: unknown) =>
  error instanceof DOMException && error.name === "NotFoundError";

/** Reads current metadata and its raw disk revision; missing means not yet configured. */
async function snapshot(
  workspace: FileSystemDirectoryHandle,
): Promise<{ document: NoteMetadataDocument; raw: string | null }> {
  try {
    const folder = await workspace.getDirectoryHandle(".startspace");
    const raw = await (
      await (await folder.getFileHandle(fileName)).getFile()
    ).text();
    return { document: parseNoteMetadata(JSON.parse(raw) as unknown), raw };
  } catch (error) {
    if (isMissing(error))
      return { document: { version: 1, notes: {} }, raw: null };
    throw error;
  }
}

/** Reads the latest valid sidecar without altering workspace files. */
export async function readNoteMetadata(
  workspace: FileSystemDirectoryHandle,
): Promise<NoteMetadataDocument> {
  await pending.get(workspace)?.catch(() => undefined);
  return (await snapshot(workspace)).document;
}

/** Serializes local writers and rejects a disk edit observed between read and write. */
export function updateNoteMetadata(
  workspace: FileSystemDirectoryHandle,
  workspaceId: string,
  noteId: string,
  change: (current: NotePreferences) => NotePreferences,
): Promise<NoteMetadataDocument> {
  const previous =
    pending.get(workspace) ??
    Promise.resolve({ version: 1 as const, notes: {} });
  const write = async () => {
    const before = await snapshot(workspace);
    const next = changeNotePreferences(before.document, noteId, change);
    if (JSON.stringify(next) === JSON.stringify(before.document))
      return before.document;
    if ((await snapshot(workspace)).raw !== before.raw)
      throw new Error(
        "Note metadata changed outside StartSpace. Refresh and retry.",
      );
    const folder = await workspace.getDirectoryHandle(".startspace", {
      create: true,
    });
    let created = false;
    try {
      await folder.getFileHandle(fileName);
    } catch (error) {
      if (!isMissing(error)) throw error;
      created = true;
    }
    const handle = await folder.getFileHandle(fileName, { create: true });
    try {
      const writable = await handle.createWritable();
      try {
        await writable.write(`${JSON.stringify(next, null, 2)}\n`);
        await writable.close();
      } catch (error) {
        await writable.abort().catch(() => undefined);
        throw error;
      }
    } catch (error) {
      if (created) await folder.removeEntry(fileName).catch(() => undefined);
      throw error;
    }
    return next;
  };
  const next = previous
    .catch(() => ({ version: 1 as const, notes: {} }))
    .then(() =>
      typeof navigator !== "undefined" && navigator.locks
        ? navigator.locks.request(
            `startspace:note-metadata:${workspaceId}`,
            write,
          )
        : write(),
    );
  pending.set(workspace, next);
  void next
    .finally(() => {
      if (pending.get(workspace) === next) pending.delete(workspace);
    })
    .catch(() => undefined);
  return next;
}
