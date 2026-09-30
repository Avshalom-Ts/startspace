// Versioned workspace metadata mapping stable note identities to Markdown paths.
// File paths still locate notes; only relationships use the stable IDs.
export type NoteIdentities = {
  version: 1;
  notes: Record<string, string>;
  aliases: Record<string, string>;
};

const validPath = (path: string) =>
  path.endsWith(".md") &&
  !path.startsWith("/") &&
  !path.includes("\\") &&
  !path.split("/").some((part) => !part || part === "." || part === "..");
const hasOwn = (record: object, key: string) =>
  Object.prototype.hasOwnProperty.call(record, key);

/** Validates version, safe paths, unique IDs and path collisions before use. */
export function parseNoteIdentities(raw: unknown): NoteIdentities {
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    throw new Error("Invalid note identity metadata.");
  const value = raw as Record<string, unknown>;
  if (
    value.version !== 1 ||
    !value.notes ||
    typeof value.notes !== "object" ||
    Array.isArray(value.notes) ||
    !value.aliases ||
    typeof value.aliases !== "object" ||
    Array.isArray(value.aliases)
  )
    throw new Error("Unsupported note identity metadata.");
  const paths = new Set<string>();
  for (const [id, path] of Object.entries(value.notes)) {
    if (
      !/^note-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        id,
      ) ||
      typeof path !== "string" ||
      !validPath(path) ||
      paths.has(path)
    )
      throw new Error("Invalid or duplicate note identity.");
    paths.add(path);
  }
  for (const [path, id] of Object.entries(value.aliases))
    if (
      !validPath(path) ||
      typeof id !== "string" ||
      !hasOwn(value.notes, id) ||
      paths.has(path)
    )
      throw new Error("Invalid note path alias.");
  return {
    version: 1,
    notes: value.notes as Record<string, string>,
    aliases: value.aliases as Record<string, string>,
  };
}

/** Assigns identities to new paths without replacing existing entries. */
export function reconcileNoteIdentities(
  document: NoteIdentities,
  paths: string[],
  createId: () => string = () => `note-${crypto.randomUUID()}`,
): NoteIdentities {
  const notes = { ...parseNoteIdentities(document).notes };
  const aliases = { ...document.aliases };
  const known = new Set(Object.values(notes));
  for (const path of paths) {
    if (!validPath(path)) throw new Error("Invalid note path.");
    if (hasOwn(aliases, path))
      throw new Error("Note path collides with an earlier link.");
    if (known.has(path)) continue;
    const id = createId();
    if (hasOwn(notes, id)) throw new Error("Note identity collision.");
    notes[id] = path;
    known.add(path);
  }
  return parseNoteIdentities({ version: 1, notes, aliases });
}

/** Changes a location without changing its stable identity; refuses occupied targets. */
export function relocateNoteIdentity(
  document: NoteIdentities,
  from: string,
  to: string,
): NoteIdentities {
  const notes = { ...parseNoteIdentities(document).notes };
  const id = Object.keys(notes).find((key) => notes[key] === from);
  if (!id) throw new Error("Note identity not found.");
  if (
    !validPath(to) ||
    Object.values(notes).includes(to) ||
    (hasOwn(document.aliases, to) && document.aliases[to] !== id)
  )
    throw new Error("Note path collision.");
  notes[id] = to;
  const aliases = { ...document.aliases, [from]: id };
  delete aliases[to];
  return { version: 1, notes, aliases };
}

/** Updates every note under a renamed folder while retaining earlier paths. */
export function relocateNoteFolder(
  document: NoteIdentities,
  from: string,
  to: string,
): NoteIdentities {
  if (from === to) return parseNoteIdentities(document);
  let updated = parseNoteIdentities(document);
  for (const path of Object.values(document.notes).filter((path) =>
    path.startsWith(`${from}/`),
  ))
    updated = relocateNoteIdentity(
      updated,
      path,
      `${to}${path.slice(from.length)}`,
    );
  return updated;
}

/** Retires a deleted note's identity so reusing its filename cannot inherit links. */
export function forgetNoteIdentity(
  document: NoteIdentities,
  path: string,
): NoteIdentities {
  const id = Object.keys(document.notes).find(
    (key) => document.notes[key] === path,
  );
  if (!id) throw new Error("Note identity not found.");
  const notes = { ...document.notes };
  delete notes[id];
  const aliases = Object.fromEntries(
    Object.entries(document.aliases).filter(([, target]) => target !== id),
  );
  return parseNoteIdentities({ version: 1, notes, aliases });
}

/** Resolves legacy path links to stable IDs while retaining missing links verbatim. */
export function stableNoteReference(
  document: NoteIdentities,
  reference: string,
): string {
  return (
    Object.keys(document.notes).find(
      (id) => document.notes[id] === reference,
    ) ??
    document.aliases[reference] ??
    reference
  );
}

/** Converts path-based edges, retaining missing targets and removing duplicate IDs. */
export function migrateNoteReferences(
  document: NoteIdentities,
  references: string[],
): string[] {
  return [
    ...new Set(
      references.map((reference) => stableNoteReference(document, reference)),
    ),
  ];
}

/** Matches a stored stable ID or legacy path to a visible note. */
export function matchesNoteReference(
  reference: string,
  path: string,
  stableId: string | undefined,
  aliases: Record<string, string> = {},
): boolean {
  return (
    reference === stableId ||
    reference === path ||
    (!!stableId && aliases[reference] === stableId)
  );
}

const metadataFolder = ".startspace";
const metadataFile = "note-identities.json";
const updates = new WeakMap<
  FileSystemDirectoryHandle,
  Promise<NoteIdentities>
>();
const missing = (error: unknown) =>
  error instanceof DOMException && error.name === "NotFoundError";

/** Reads the versioned sidecar; a missing file is an unmigrated workspace. */
export async function readNoteIdentities(
  workspace: FileSystemDirectoryHandle,
): Promise<NoteIdentities> {
  try {
    const folder = await workspace.getDirectoryHandle(metadataFolder);
    const file = await (await folder.getFileHandle(metadataFile)).getFile();
    return parseNoteIdentities(JSON.parse(await file.text()) as unknown);
  } catch (error) {
    if (missing(error)) return { version: 1, notes: {}, aliases: {} };
    throw error;
  }
}

/** Serializes local metadata updates and writes a complete replacement via createWritable. */
export function updateNoteIdentities(
  workspace: FileSystemDirectoryHandle,
  change: (document: NoteIdentities) => NoteIdentities,
): Promise<NoteIdentities> {
  const previous =
    updates.get(workspace) ??
    Promise.resolve({ version: 1 as const, notes: {}, aliases: {} });
  const update = async () => {
    const before = await readNoteIdentities(workspace);
    const next = parseNoteIdentities(change(before));
    if (JSON.stringify(next) === JSON.stringify(before)) return before;
    const folder = await workspace.getDirectoryHandle(metadataFolder, {
      create: true,
    });
    let created = false;
    try {
      await folder.getFileHandle(metadataFile);
    } catch (error) {
      if (!missing(error)) throw error;
      created = true;
    }
    const handle = await folder.getFileHandle(metadataFile, { create: true });
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
      if (created)
        await folder.removeEntry(metadataFile).catch(() => undefined);
      throw error;
    }
    return next;
  };
  const next = previous
    .catch(() => ({ version: 1 as const, notes: {}, aliases: {} }))
    .then(() =>
      typeof navigator !== "undefined" && navigator.locks
        ? navigator.locks.request(
            `startspace:note-identities:${workspace.name}`,
            update,
          )
        : update(),
    );
  updates.set(workspace, next);
  void next
    .finally(() => {
      if (updates.get(workspace) === next) updates.delete(workspace);
    })
    .catch(() => undefined);
  return next;
}

/** Reconciles scanned files into a persistent portable identity map. */
export function ensureNoteIdentities(
  workspace: FileSystemDirectoryHandle,
  paths: string[],
): Promise<NoteIdentities> {
  return updateNoteIdentities(workspace, (document) =>
    reconcileNoteIdentities(document, paths),
  );
}
