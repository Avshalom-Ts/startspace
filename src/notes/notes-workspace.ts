import type {
  FolderEntry,
  ImageEntry,
  NoteEntry,
  NotesIndex,
} from "../types/notes";
import {
  extractTitleFromMarkdown,
  noteDisplayName,
  noteFolder,
  parentFolder,
} from "../types/notes-path";

export class NoteWorkspaceError extends Error {
  readonly kind:
    | "unavailable"
    | "access-revoked"
    | "invalid-path"
    | "already-exists"
    | "not-found"
    | "io"
    | "unknown";
  readonly detail: string;

  constructor(
    kind: NoteWorkspaceError["kind"],
    message: string,
    detail = message,
  ) {
    super(message);
    this.name = "NoteWorkspaceError";
    this.kind = kind;
    this.detail = detail;
  }
}

const isNotFound = (error: unknown) =>
  error instanceof DOMException && error.name === "NotFoundError";
const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

const imageTypes: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
};

/** Resolves only workspace-relative raster images; never follows absolute or URL paths. */
export function imageMimeType(path: string): string | null {
  return imageTypes[path.split(".").pop()?.toLowerCase() ?? ""] ?? null;
}

/** Rejects image paths that escape the granted workspace or use unsafe formats. */
function validateImagePath(path: string): string {
  if (
    !path ||
    /[\\\0?#]/.test(path) ||
    path.startsWith("/") ||
    path
      .split("/")
      .some(
        (part) =>
          !part || part === "." || part === ".." || part.startsWith("."),
      )
  )
    throw new NoteWorkspaceError("invalid-path", "Invalid image path.");
  const mime = imageMimeType(path);
  if (!mime)
    throw new NoteWorkspaceError("invalid-path", "Unsupported image format.");
  return mime;
}

/** Reads a supported image through the granted workspace handle, rejecting escaped paths. */
export async function readWorkspaceImage(
  workspace: FileSystemDirectoryHandle,
  path: string,
): Promise<Blob> {
  const mime = validateImagePath(path);
  try {
    const parent = await directoryAt(workspace, noteFolder(path));
    const file = await (
      await parent.getFileHandle(path.split("/").pop()!)
    ).getFile();
    return new Blob([await file.arrayBuffer()], { type: mime });
  } catch (error) {
    if (isNotFound(error))
      throw new NoteWorkspaceError("not-found", "Image not found.");
    throw error;
  }
}

/** Moves or renames a raster image without changing its format or losing the source on copy failure. */
export async function moveImage(
  workspace: FileSystemDirectoryHandle,
  path: string,
  targetFolder: string,
  newName: string,
): Promise<string> {
  validateImagePath(path);
  validateName(newName);
  if (imageMimeType(newName) !== imageMimeType(path) || newName.startsWith("."))
    throw new NoteWorkspaceError(
      "invalid-path",
      "Keep the image's original file extension.",
    );
  const destination = targetFolder ? `${targetFolder}/${newName}` : newName;
  validateImagePath(destination);
  if (destination === path)
    throw new NoteWorkspaceError(
      "invalid-path",
      "Choose a different name or folder.",
    );
  const target = await directoryAt(workspace, targetFolder);
  try {
    await target.getFileHandle(newName);
    throw new NoteWorkspaceError(
      "already-exists",
      `A file already exists: "${destination}".`,
    );
  } catch (error) {
    if (!isNotFound(error)) throw error;
  }
  const source = await directoryAt(workspace, noteFolder(path));
  const sourceName = path.split("/").pop()!;
  const file = await (await source.getFileHandle(sourceName)).getFile();
  const handle = await target.getFileHandle(newName, { create: true });
  try {
    const writable = await handle.createWritable();
    try {
      await writable.write(file);
      await writable.close();
    } catch (error) {
      await writable.abort().catch(() => undefined);
      throw error;
    }
    const copied = await (await handle.getFile()).arrayBuffer();
    const original = await file.arrayBuffer();
    const originalBytes = new Uint8Array(original);
    if (
      copied.byteLength !== original.byteLength ||
      !new Uint8Array(copied).every(
        (byte, index) => byte === originalBytes[index],
      )
    )
      throw new Error("Image copy did not match the source.");
  } catch (error) {
    throw new NoteWorkspaceError(
      "io",
      `Could not verify "${destination}". "${path}" was kept. Check both files before retrying: ${errorMessage(error)}`,
    );
  }
  try {
    await source.removeEntry(sourceName);
  } catch (error) {
    throw new NoteWorkspaceError(
      "io",
      `Image copied to "${destination}" but could not remove "${path}". Both files may remain: ${errorMessage(error)}`,
    );
  }
  return destination;
}

/** Removes an image file from the granted workspace after UI confirmation. */
export async function deleteImage(
  workspace: FileSystemDirectoryHandle,
  path: string,
): Promise<void> {
  validateImagePath(path);
  await (
    await directoryAt(workspace, noteFolder(path))
  ).removeEntry(path.split("/").pop()!);
}

function validateNoteId(noteId: string): void {
  if (
    !noteId.endsWith(".md") ||
    noteId.includes("..") ||
    noteId.startsWith("/") ||
    noteId.includes("\\")
  ) {
    throw new NoteWorkspaceError(
      "invalid-path",
      `Invalid note path: "${noteId}".`,
      noteId,
    );
  }
}

function validateName(name: string): void {
  if (!name.trim() || name === "." || name === ".." || /[\\/\0]/.test(name)) {
    throw new NoteWorkspaceError(
      "invalid-path",
      `Invalid name: "${name}".`,
      name,
    );
  }
}

async function directoryAt(
  root: FileSystemDirectoryHandle,
  path: string,
): Promise<FileSystemDirectoryHandle> {
  let current = root;
  for (const part of path.split("/").filter(Boolean)) {
    try {
      current = await current.getDirectoryHandle(part);
    } catch (error) {
      if (isNotFound(error))
        throw new NoteWorkspaceError(
          "not-found",
          `Folder not found: "${path}".`,
          path,
        );
      throw error;
    }
  }
  return current;
}

async function readFileEntry(
  root: FileSystemDirectoryHandle,
  id: string,
): Promise<NoteEntry> {
  const folder = noteFolder(id);
  const name = noteDisplayName(id) + ".md";
  const parent = await directoryAt(root, folder);
  const file = await (await parent.getFileHandle(name)).getFile();
  const content = await file.text();
  return {
    id,
    title: extractTitleFromMarkdown(content) || noteDisplayName(id),
    content,
    folder,
    modifiedAt: new Date(file.lastModified).toISOString(),
  };
}

async function scanDirectory(
  root: FileSystemDirectoryHandle,
  directory: FileSystemDirectoryHandle,
  prefix: string,
): Promise<{
  notes: NoteEntry[];
  images: ImageEntry[];
  folders: FolderEntry[];
}> {
  const notes: NoteEntry[] = [];
  const images: ImageEntry[] = [];
  const folders: FolderEntry[] = [];
  let directCount = 0;
  for await (const entry of directory.values()) {
    if (entry.name.startsWith(".")) continue;
    const id = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.kind === "file" && entry.name.endsWith(".md")) {
      notes.push(await readFileEntry(root, id));
      directCount++;
    } else if (entry.kind === "file" && imageMimeType(entry.name)) {
      const file = await entry.getFile();
      images.push({
        id,
        folder: prefix,
        modifiedAt: new Date(file.lastModified).toISOString(),
      });
    } else if (entry.kind === "directory") {
      const child = await scanDirectory(root, entry, id);
      notes.push(...child.notes);
      images.push(...child.images);
      folders.push(...child.folders);
    }
  }
  if (prefix)
    folders.unshift({
      id: prefix,
      name: prefix.split("/").pop() ?? prefix,
      noteCount: directCount,
    });
  return { notes, images, folders };
}

export async function scanWorkspace(
  workspace: FileSystemDirectoryHandle,
): Promise<NotesIndex> {
  try {
    const result = await scanDirectory(workspace, workspace, "");
    result.notes.sort((a, b) => a.id.localeCompare(b.id));
    result.images.sort((a, b) => a.id.localeCompare(b.id));
    result.folders.sort((a, b) => a.id.localeCompare(b.id));
    const root: FolderEntry = {
      id: "",
      name: workspace.name,
      noteCount: result.notes.filter((note) => note.folder === "").length,
    };
    return {
      notes: result.notes,
      images: result.images,
      folders: result.folders,
      root,
    };
  } catch (error) {
    if (error instanceof NoteWorkspaceError) throw error;
    throw new NoteWorkspaceError(
      "io",
      `Unable to scan workspace: ${errorMessage(error)}`,
      errorMessage(error),
    );
  }
}

export async function createNote(
  workspace: FileSystemDirectoryHandle,
  folderId: string,
  noteId: string,
  content: string,
): Promise<NoteEntry> {
  validateNoteId(noteId);
  const name = noteDisplayName(noteId);
  validateName(name);
  const parent = await directoryAt(workspace, folderId);
  try {
    await parent.getFileHandle(name + ".md");
    throw new NoteWorkspaceError(
      "already-exists",
      `A note with that name already exists: "${noteId}".`,
      noteId,
    );
  } catch (error) {
    if (!isNotFound(error)) throw error;
  }
  const handle = await parent.getFileHandle(name + ".md", { create: true });
  const writable = await handle.createWritable();
  await writable.write(content);
  await writable.close();
  return readFileEntry(
    workspace,
    folderId ? `${folderId}/${name}.md` : `${name}.md`,
  );
}

export async function readNote(
  workspace: FileSystemDirectoryHandle,
  noteId: string,
): Promise<NoteEntry> {
  validateNoteId(noteId);
  try {
    return await readFileEntry(workspace, noteId);
  } catch (error) {
    if (error instanceof NoteWorkspaceError) throw error;
    if (isNotFound(error))
      throw new NoteWorkspaceError(
        "not-found",
        `Note not found: "${noteId}".`,
        noteId,
      );
    throw new NoteWorkspaceError(
      "io",
      `Unable to read note: ${errorMessage(error)}`,
      errorMessage(error),
    );
  }
}

export async function writeNote(
  workspace: FileSystemDirectoryHandle,
  noteId: string,
  content: string,
  expectedContent?: string,
): Promise<NoteEntry> {
  validateNoteId(noteId);
  const operation = async () => {
    const parent = await directoryAt(workspace, noteFolder(noteId));
    const handle = await parent.getFileHandle(noteDisplayName(noteId) + ".md");
    if (
      expectedContent !== undefined &&
      (await (await handle.getFile()).text()) !== expectedContent
    ) {
      throw new NoteWorkspaceError(
        "io",
        "This file changed on disk. Your draft has not been overwritten.",
      );
    }
    const writable = await handle.createWritable();
    try {
      await writable.write(content);
      if (
        expectedContent !== undefined &&
        (await (await handle.getFile()).text()) !== expectedContent
      )
        throw new NoteWorkspaceError(
          "io",
          "This file changed on disk while saving. Your draft has not been overwritten.",
        );
      await writable.close();
    } catch (error) {
      await writable.abort().catch(() => undefined);
      throw error;
    }
    return readFileEntry(workspace, noteId);
  };
  return typeof navigator !== "undefined" && navigator.locks
    ? navigator.locks.request(
        `startspace:note-write:${workspace.name}/${noteId}`,
        operation,
      )
    : operation();
}

export async function deleteNote(
  workspace: FileSystemDirectoryHandle,
  noteId: string,
): Promise<void> {
  validateNoteId(noteId);
  const parent = await directoryAt(workspace, noteFolder(noteId));
  try {
    await parent.removeEntry(noteDisplayName(noteId) + ".md");
  } catch (error) {
    if (isNotFound(error))
      throw new NoteWorkspaceError(
        "not-found",
        `Note not found: "${noteId}".`,
        noteId,
      );
    throw error;
  }
}

export async function renameNote(
  workspace: FileSystemDirectoryHandle,
  noteId: string,
  newNoteId: string,
): Promise<NoteEntry> {
  validateNoteId(noteId);
  validateNoteId(newNoteId);
  if (noteFolder(noteId) !== noteFolder(newNoteId))
    throw new NoteWorkspaceError(
      "invalid-path",
      "Rename cannot change folders.",
      newNoteId,
    );
  return moveNote(
    workspace,
    noteId,
    noteFolder(noteId),
    newNoteId.split("/").pop()!,
  );
}

export async function moveNote(
  workspace: FileSystemDirectoryHandle,
  noteId: string,
  targetFolderId: string,
  newNoteName: string,
): Promise<NoteEntry> {
  validateNoteId(noteId);
  validateName(newNoteName);
  const note = await readNote(workspace, noteId);
  const target = await directoryAt(workspace, targetFolderId);
  const destination = newNoteName.endsWith(".md")
    ? newNoteName
    : `${newNoteName}.md`;
  try {
    await target.getFileHandle(destination);
    throw new NoteWorkspaceError(
      "already-exists",
      `A note with that name already exists: "${destination}".`,
      destination,
    );
  } catch (error) {
    if (!isNotFound(error)) throw error;
  }
  const handle = await target.getFileHandle(destination, { create: true });
  const nextId = targetFolderId
    ? `${targetFolderId}/${destination}`
    : destination;
  try {
    const writable = await handle.createWritable();
    try {
      await writable.write(note.content);
      await writable.close();
    } catch (error) {
      await writable.abort().catch(() => undefined);
      throw error;
    }
    if (
      (await (await handle.getFile()).text()) !== note.content ||
      (await readNote(workspace, noteId)).content !== note.content
    )
      throw new Error("The source or destination changed during the move.");
  } catch (error) {
    throw new NoteWorkspaceError(
      "io",
      `Could not verify "${nextId}". "${noteId}" was kept. Check both files before retrying: ${errorMessage(error)}`,
    );
  }
  const source = await directoryAt(workspace, noteFolder(noteId));
  try {
    await source.removeEntry(noteDisplayName(noteId) + ".md");
  } catch (error) {
    throw new NoteWorkspaceError(
      "io",
      `Copied to "${nextId}" but could not remove "${noteId}". Check both files: ${errorMessage(error)}`,
    );
  }
  return readFileEntry(workspace, nextId);
}

export async function createFolder(
  workspace: FileSystemDirectoryHandle,
  folderId: string,
  folderName: string,
): Promise<FolderEntry> {
  validateName(folderName);
  const parent = await directoryAt(workspace, folderId);
  try {
    await parent.getDirectoryHandle(folderName);
    throw new NoteWorkspaceError(
      "already-exists",
      `A folder with that name already exists: "${folderName}".`,
      folderName,
    );
  } catch (error) {
    if (!isNotFound(error)) throw error;
  }
  await parent.getDirectoryHandle(folderName, { create: true });
  const id = folderId ? `${folderId}/${folderName}` : folderName;
  return { id, name: folderName, noteCount: 0 };
}

export async function deleteFolder(
  workspace: FileSystemDirectoryHandle,
  folderId: string,
): Promise<void> {
  if (!folderId)
    throw new NoteWorkspaceError(
      "invalid-path",
      "The root folder cannot be deleted.",
      folderId,
    );
  const parent = await directoryAt(workspace, parentFolder(folderId));
  try {
    const target = await parent.getDirectoryHandle(
      folderId.split("/").pop() ?? "",
    );
    for await (const _entry of target.values()) {
      throw new NoteWorkspaceError(
        "io",
        `Folder is not empty: "${folderId}".`,
        folderId,
      );
    }
    await parent.removeEntry(folderId.split("/").pop() ?? "", {
      recursive: false,
    });
  } catch (error) {
    if (isNotFound(error))
      throw new NoteWorkspaceError(
        "not-found",
        `Folder not found: "${folderId}".`,
        folderId,
      );
    throw error;
  }
}

/**
 * Copies every entry from one directory into another using the File System
 * Access API. Folder renames require a copy because the API has no rename
 * operation; all workspace files are preserved, not just Markdown notes.
 *
 * @param source - Existing granted directory to copy.
 * @param destination - Empty granted directory that receives the entries.
 */
async function copyDirectory(
  source: FileSystemDirectoryHandle,
  destination: FileSystemDirectoryHandle,
): Promise<void> {
  for await (const entry of source.values()) {
    if (entry.kind === "file") {
      const sourceFile = await entry.getFile();
      const targetFile = await destination.getFileHandle(entry.name, {
        create: true,
      });
      const writable = await targetFile.createWritable();
      try {
        await writable.write(sourceFile);
        await writable.close();
      } catch (error) {
        await writable.abort().catch(() => undefined);
        throw error;
      }
    } else if (entry.kind === "directory") {
      const targetDirectory = await destination.getDirectoryHandle(entry.name, {
        create: true,
      });
      await copyDirectory(entry, targetDirectory);
    }
  }
}

/** Compares a copied directory tree byte-for-byte before the source is removed. */
async function verifyDirectory(
  source: FileSystemDirectoryHandle,
  destination: FileSystemDirectoryHandle,
): Promise<void> {
  const sourceEntries = [];
  const destinationEntries = [];
  for await (const entry of source.values()) sourceEntries.push(entry);
  for await (const entry of destination.values())
    destinationEntries.push(entry);
  if (sourceEntries.length !== destinationEntries.length)
    throw new Error("Directory entry count differs.");
  for (const entry of sourceEntries) {
    const copied = destinationEntries.find(
      (item) => item.name === entry.name && item.kind === entry.kind,
    );
    if (!copied) throw new Error(`Missing copied entry: ${entry.name}`);
    if (entry.kind === "directory" && copied.kind === "directory")
      await verifyDirectory(entry, copied);
    else if (entry.kind === "file" && copied.kind === "file") {
      const original = new Uint8Array(
        await (await entry.getFile()).arrayBuffer(),
      );
      const result = new Uint8Array(
        await (await copied.getFile()).arrayBuffer(),
      );
      if (
        original.length !== result.length ||
        !original.every((byte, index) => byte === result[index])
      )
        throw new Error(`Copied file differs: ${entry.name}`);
    }
  }
}

/**
 * Renames a real workspace directory by copying its contents to a new sibling
 * and removing the original directory. The File System Access API exposes no
 * native directory-rename operation.
 *
 * @param workspace - Granted root directory for the Notes workspace.
 * @param folderId - Relative path of the folder to rename; the root is invalid.
 * @param newName - New single-segment directory name.
 * @returns The renamed folder's updated entry.
 * @throws {NoteWorkspaceError} If the path is invalid, missing, or occupied.
 */
export async function renameFolder(
  workspace: FileSystemDirectoryHandle,
  folderId: string,
  newName: string,
): Promise<FolderEntry> {
  if (!folderId)
    throw new NoteWorkspaceError(
      "invalid-path",
      "The root folder cannot be renamed.",
      folderId,
    );
  validateName(newName);
  const parentId = parentFolder(folderId);
  const parent = await directoryAt(workspace, parentId);
  const originalName = folderId.split("/").pop() ?? "";
  if (originalName === newName)
    return { id: folderId, name: newName, noteCount: 0 };
  try {
    await parent.getDirectoryHandle(newName);
    throw new NoteWorkspaceError(
      "already-exists",
      `A folder with that name already exists: "${newName}".`,
      newName,
    );
  } catch (error) {
    if (!isNotFound(error)) throw error;
  }
  try {
    const source = await parent.getDirectoryHandle(originalName);
    const destination = await parent.getDirectoryHandle(newName, {
      create: true,
    });
    await copyDirectory(source, destination);
    await verifyDirectory(source, destination);
    await parent.removeEntry(originalName, { recursive: true });
  } catch (error) {
    if (isNotFound(error))
      throw new NoteWorkspaceError(
        "not-found",
        `Folder not found: "${folderId}".`,
        folderId,
      );
    throw new NoteWorkspaceError(
      "io",
      `Could not verify or finish renaming "${folderId}" to "${parentId ? `${parentId}/` : ""}${newName}". Check both folders before retrying: ${errorMessage(error)}`,
    );
  }
  const id = parentId ? `${parentId}/${newName}` : newName;
  return { id, name: newName, noteCount: 0 };
}

export interface ImportResult {
  imported: string[];
  skipped: { name: string; reason: string }[];
  failed: { name: string; error: string }[];
  targetFolderId: string;
}

export async function importMarkdownFiles(
  workspace: FileSystemDirectoryHandle,
  targetFolderId: string,
  files: File[],
): Promise<ImportResult> {
  const parent = await directoryAt(workspace, targetFolderId);
  const result: ImportResult = {
    imported: [],
    skipped: [],
    failed: [],
    targetFolderId,
  };
  for (const file of files) {
    if (!file.name.toLowerCase().endsWith(".md")) {
      result.skipped.push({ name: file.name, reason: "Not a Markdown file" });
      continue;
    }
    try {
      await parent.getFileHandle(file.name);
      result.skipped.push({ name: file.name, reason: "Already exists" });
      continue;
    } catch (error) {
      if (!isNotFound(error)) {
        result.failed.push({ name: file.name, error: errorMessage(error) });
        continue;
      }
    }
    try {
      const handle = await parent.getFileHandle(file.name, { create: true });
      const writable = await handle.createWritable();
      await writable.write(await file.text());
      await writable.close();
      result.imported.push(
        targetFolderId ? `${targetFolderId}/${file.name}` : file.name,
      );
    } catch (error) {
      result.failed.push({ name: file.name, error: errorMessage(error) });
    }
  }
  return result;
}
