import type { BookmarkMetadata } from "../hooks/useBookmarks";

export interface BookmarkMetadataDocument {
  version: 1;
  bookmarks: Record<string, BookmarkMetadata>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isStrings(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

export function parseBookmarkMetadata(value: unknown): Record<string, BookmarkMetadata> {
  if (!isRecord(value)) throw new Error("Invalid bookmark metadata.");
  const entries: [string, BookmarkMetadata][] = [];
  for (const [id, entry] of Object.entries(value)) {
    if (
      !id || !isRecord(entry) ||
      typeof entry.favorites !== "boolean" ||
      !isStrings(entry.tags) ||
      typeof entry.dateAdded !== "string" ||
      !isStrings(entry.relatedNotes) ||
      !isStrings(entry.relatedTasks) ||
      ["description", "lastOpenedAt", "updatedAt"].some(
        (key) => entry[key] !== undefined && typeof entry[key] !== "string",
      )
    ) throw new Error("Invalid bookmark metadata. Refresh and check the workspace file.");
    entries.push([id, {
      favorites: entry.favorites,
      tags: entry.tags,
      dateAdded: entry.dateAdded,
      relatedNotes: entry.relatedNotes,
      relatedTasks: entry.relatedTasks,
      ...(typeof entry.description === "string" ? { description: entry.description } : {}),
      ...(typeof entry.lastOpenedAt === "string" ? { lastOpenedAt: entry.lastOpenedAt } : {}),
      ...(typeof entry.updatedAt === "string" ? { updatedAt: entry.updatedAt } : {}),
    }]);
  }
  return Object.fromEntries(entries);
}

export function parseBookmarkDocument(value: unknown): BookmarkMetadataDocument {
  if (!isRecord(value) || value.version !== 1)
    throw new Error("Unsupported or invalid .startspace/bookmark-metadata.json.");
  return { version: 1, bookmarks: parseBookmarkMetadata(value.bookmarks) };
}

export function emptyBookmarkMetadata(): BookmarkMetadata {
  return {
    favorites: false, tags: [], dateAdded: new Date().toISOString(),
    relatedNotes: [], relatedTasks: [],
  };
}
