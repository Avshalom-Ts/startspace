import type { FolderEntry, NoteEntry, NotesIndex } from "../types/notes";
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
): Promise<{ notes: NoteEntry[]; folders: FolderEntry[] }> {
  const notes: NoteEntry[] = [];
  const folders: FolderEntry[] = [];
  let directCount = 0;
  for await (const entry of directory.values()) {
    const id = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.kind === "file" && entry.name.endsWith(".md")) {
      notes.push(await readFileEntry(root, id));
      directCount++;
    } else if (entry.kind === "directory") {
      const child = await scanDirectory(root, entry, id);
      notes.push(...child.notes);
      folders.push(...child.folders);
    }
  }
  if (prefix)
    folders.unshift({
      id: prefix,
      name: prefix.split("/").pop() ?? prefix,
      noteCount: directCount,
    });
  return { notes, folders };
}

export async function scanWorkspace(
  workspace: FileSystemDirectoryHandle,
): Promise<NotesIndex> {
  try {
    const result = await scanDirectory(workspace, workspace, "");
    result.notes.sort((a, b) => a.id.localeCompare(b.id));
    result.folders.sort((a, b) => a.id.localeCompare(b.id));
    const root: FolderEntry = {
      id: "",
      name: workspace.name,
      noteCount: result.notes.filter((note) => note.folder === "").length,
    };
    return { notes: result.notes, folders: result.folders, root };
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
): Promise<NoteEntry> {
  validateNoteId(noteId);
  const parent = await directoryAt(workspace, noteFolder(noteId));
  const handle = await parent.getFileHandle(noteDisplayName(noteId) + ".md");
  const writable = await handle.createWritable();
  await writable.write(content);
  await writable.close();
  return readFileEntry(workspace, noteId);
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
  const note = await readNote(workspace, noteId);
  const parent = await directoryAt(workspace, noteFolder(noteId));
  const newName = noteDisplayName(newNoteId);
  validateName(newName);
  try {
    await parent.getFileHandle(newName + ".md");
    throw new NoteWorkspaceError(
      "already-exists",
      `A note with that name already exists: "${newNoteId}".`,
      newNoteId,
    );
  } catch (error) {
    if (!isNotFound(error)) throw error;
  }
  const handle = await parent.getFileHandle(newName + ".md", { create: true });
  const writable = await handle.createWritable();
  await writable.write(note.content);
  await writable.close();
  await parent.removeEntry(noteDisplayName(noteId) + ".md");
  return readFileEntry(workspace, newNoteId);
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
  const writable = await handle.createWritable();
  await writable.write(note.content);
  await writable.close();
  const source = await directoryAt(workspace, noteFolder(noteId));
  await source.removeEntry(noteDisplayName(noteId) + ".md");
  return readFileEntry(
    workspace,
    targetFolderId ? `${targetFolderId}/${destination}` : destination,
  );
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
    await parent.removeEntry(folderId.split("/").pop() ?? "", {
      recursive: true,
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
      await writable.write(sourceFile);
      await writable.close();
    } else if (entry.kind === "directory") {
      const targetDirectory = await destination.getDirectoryHandle(entry.name, {
        create: true,
      });
      await copyDirectory(entry, targetDirectory);
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
    await parent.removeEntry(originalName, { recursive: true });
  } catch (error) {
    if (isNotFound(error))
      throw new NoteWorkspaceError(
        "not-found",
        `Folder not found: "${folderId}".`,
        folderId,
      );
    throw error;
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
