// Pure list presentation rules for Notes. File paths remain current identities.
import type { NoteEntry } from "../types/notes";
export type NotesView = "all" | "folder" | "recent" | "favorites";
/** Uses the real filename for the new layout, without altering legacy H1 indexing. */
export function fileTitle(note: NoteEntry): string {
  return note.id.split("/").pop()?.replace(/\.md$/i, "") ?? note.title;
}
/** Returns a short plain-text summary, skipping the document heading. */
export function noteExcerpt(note: NoteEntry): string {
  return note.content
    .replace(/^# .+$/m, "")
    .replace(/[#*_\x60>\[\]]/g, "")
    .trim()
    .split("\n")
    .filter(Boolean)
    .join(" ")
    .slice(0, 150);
}
/** Filters locally by view and full content; sorts deterministically without mutation. */
export function visibleNotes(
  notes: NoteEntry[],
  view: NotesView,
  folder: string,
  query: string,
  recent: string[],
  favorites: string[],
  sort: "modified" | "name",
) {
  const text = query.trim().toLowerCase();
  return notes
    .filter(
      (note) =>
        (!text ||
          (fileTitle(note) + "\n" + note.content)
            .toLowerCase()
            .includes(text)) &&
        (view === "all" ||
          (view === "folder" && note.folder === folder) ||
          (view === "recent" && recent.includes(note.id)) ||
          (view === "favorites" && favorites.includes(note.id))),
    )
    .sort((a, b) =>
      view === "recent"
        ? recent.indexOf(a.id) - recent.indexOf(b.id)
        : sort === "name"
          ? fileTitle(a).localeCompare(fileTitle(b))
          : b.modifiedAt.localeCompare(a.modifiedAt) ||
            a.id.localeCompare(b.id),
    );
}
