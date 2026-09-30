// notes.ts
//
// Owns the note and folder types for the Notes feature.
//
// Notes are Markdown (.md) files stored in the user's workspace folder via the
// File System Access API. A note's identity is its relative path from the
// workspace root (e.g. "welcome.md" or "ideas/plans.md"). Relationships use
// workspace-stable IDs stored separately from Markdown. Titles are extracted
// from the first H1 in the Markdown content; the filename (without extension)
// is the fallback when no H1 is present.
//
// Folders are real directories in the workspace. The Notes feature operates on
// the granted FileSystemDirectoryHandle (see useWorkspace) and does not own the
// folder — the user does.

/** A note as StartSpace sees it (derived from the on-disk Markdown file). */
export interface NoteEntry {
  /** Relative path from the workspace root, including the .md extension. */
  id: string;
  /** Portable identity for relationships; absent in demo or before migration. */
  stableId?: string;
  /** Human-readable title; from the first H1 in the file, or the filename fallback. */
  title: string;
  /** Full Markdown text of the note. */
  content: string;
  /** Logical folder (dirname of `id`); empty string for top-level notes. */
  folder: string;
  /** ISO timestamp from the file's last-modified time, or creation time when
   *  last-modified is unavailable. */
  modifiedAt: string;
}

/** A supported local image asset, indexed without loading its bytes. */
export interface ImageEntry {
  id: string;
  folder: string;
  modifiedAt: string;
}

/** A workspace folder as StartSpace sees it. */
export interface FolderEntry {
  /** Relative path from the workspace root (empty string = root). */
  id: string;
  /** Display name (the directory name). */
  name: string;
  /** Number of notes directly inside this folder (not recursive). */
  noteCount: number;
}

/** The Notes feature's view of the workspace contents. */
export interface NotesIndex {
  /** Every note StartSpace knows about, in workspace order (top-level first,
   *  then folders in name order, notes within each folder in name order). */
  notes: NoteEntry[];
  /** Historical paths retained for relationships created before stable IDs. */
  noteAliases?: Record<string, string>;
  /** Supported image files available in the folder content list. */
  images?: ImageEntry[];
  /** Every folder in the workspace, including empty folders, in name order. */
  folders: FolderEntry[];
  /** The root folder entry (empty id); always present when the index is
   *  non-empty. */
  root: FolderEntry;
}
