// Explicit migration of legacy extension-stored bookmark-to-note relationships.
//
// The legacy `startspace.bookmarkMetadata` Chrome storage entry predates
// workspace-owned bookmark metadata. This module imports only note relations
// after the person chooses to migrate them; browser bookmarks remain the source
// of truth and relationship metadata is written to the connected workspace.

import type { BookmarkMetadata } from "../hooks/useBookmarks";
import { emptyBookmarkMetadata } from "../links/bookmark-metadata-model";
import type { BookmarkMetadataDocument } from "../links/bookmark-metadata-model";
import type { NoteEntry } from "../types/notes";

export const LEGACY_BOOKMARK_METADATA_KEY = "startspace.bookmarkMetadata";

type LegacyBookmarkMetadata = Record<string, unknown>;

/**
 * Reads the pre-workspace bookmark metadata from extension storage.
 *
 * @returns The untrusted legacy record, or null when extension storage is
 * unavailable or the key has never been saved. It does not modify storage.
 */
export async function readLegacyBookmarkMetadata(): Promise<LegacyBookmarkMetadata | null> {
  const storage = (globalThis as { chrome?: typeof chrome }).chrome?.storage?.local;
  if (!storage) return null;
  return new Promise((resolve) => {
    storage.get(LEGACY_BOOKMARK_METADATA_KEY, (result) => {
      const value = result?.[LEGACY_BOOKMARK_METADATA_KEY];
      resolve(value && typeof value === "object" && !Array.isArray(value)
        ? value as LegacyBookmarkMetadata
        : null);
    });
  });
}

/**
 * Clears only successfully importable note links from legacy extension storage.
 *
 * @param legacy - The storage snapshot that was just imported.
 * @param bookmarkIds - Current browser-assigned bookmark IDs that were eligible.
 * @throws If extension storage is unavailable or rejects the write. Call this
 * only after the workspace metadata write succeeds, so the source remains on
 * failure.
 */
export async function clearImportedLegacyBookmarkLinks(
  legacy: LegacyBookmarkMetadata,
  bookmarkIds: Set<string>,
): Promise<void> {
  const storage = (globalThis as { chrome?: typeof chrome }).chrome?.storage?.local;
  if (!storage) throw new Error("Legacy bookmark metadata is no longer available.");
  const next = Object.fromEntries(Object.entries(legacy).map(([id, entry]) => {
    if (
      !bookmarkIds.has(id) || !entry || typeof entry !== "object" || Array.isArray(entry) ||
      !Array.isArray((entry as { relatedNotes?: unknown }).relatedNotes) ||
      !(entry as { relatedNotes: unknown[] }).relatedNotes.every((item) => typeof item === "string")
    ) return [id, entry];
    const { relatedNotes: _, ...remaining } = entry as Record<string, unknown>;
    return [id, remaining];
  }));
  await new Promise<void>((resolve, reject) => {
    storage.set({ [LEGACY_BOOKMARK_METADATA_KEY]: next }, () => {
      const message = (globalThis as { chrome?: typeof chrome }).chrome?.runtime?.lastError?.message;
      if (message) reject(new Error(message));
      else resolve();
    });
  });
}

/**
 * Reports whether legacy metadata contains a relation for a bookmark that is
 * still present in the current browser profile.
 *
 * @param legacy - Untrusted legacy metadata returned by extension storage.
 * @param bookmarkIds - Current browser-assigned leaf bookmark IDs.
 * @returns True when an explicit import can add at least one saved relation.
 */
export function hasLegacyBookmarkLinks(
  legacy: LegacyBookmarkMetadata | null,
  bookmarkIds: Set<string>,
): boolean {
  return !!legacy && Object.entries(legacy).some(([id, entry]) =>
    bookmarkIds.has(id) &&
    !!entry && typeof entry === "object" && !Array.isArray(entry) &&
    Array.isArray((entry as { relatedNotes?: unknown }).relatedNotes) &&
    (entry as { relatedNotes: unknown[] }).relatedNotes.some((item) => typeof item === "string"),
  );
}

/** Resolves a legacy path or stable ID to the relationship value used today. */
function currentNoteReference(reference: string, notes: NoteEntry[]): string {
  const note = notes.find((candidate) =>
    candidate.id === reference || candidate.stableId === reference,
  );
  return note?.stableId ?? note?.id ?? reference;
}

/** Removes duplicate relation values without changing their first-seen order. */
function unique(values: string[]): string[] {
  return [...new Set(values)];
}

/**
 * Merges valid legacy note relations into a workspace metadata document.
 *
 * @param document - Valid, current workspace bookmark metadata.
 * @param legacy - Untrusted extension-stored metadata from the old format.
 * @param notes - Current workspace notes used to convert old paths to stable IDs.
 * @param bookmarkIds - Current browser-assigned bookmark IDs; stale IDs are ignored.
 * @returns A new document and the number of relations newly added. Missing note
 * references are retained so they remain visible and can be relinked later.
 */
export function mergeLegacyBookmarkLinks(
  document: BookmarkMetadataDocument,
  legacy: LegacyBookmarkMetadata,
  notes: NoteEntry[],
  bookmarkIds: Set<string>,
): { document: BookmarkMetadataDocument; imported: number } {
  let imported = 0;
  const bookmarks: Record<string, BookmarkMetadata> = { ...document.bookmarks };
  for (const [bookmarkId, entry] of Object.entries(legacy)) {
    if (!bookmarkIds.has(bookmarkId) || !entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const relatedNotes = (entry as { relatedNotes?: unknown }).relatedNotes;
    if (!Array.isArray(relatedNotes) || !relatedNotes.every((item) => typeof item === "string")) continue;
    const current = bookmarks[bookmarkId] ?? emptyBookmarkMetadata();
    const next = unique([
      ...current.relatedNotes,
      ...relatedNotes.map((reference) => currentNoteReference(reference, notes)),
    ]);
    imported += next.length - current.relatedNotes.length;
    if (next.length !== current.relatedNotes.length)
      bookmarks[bookmarkId] = { ...current, relatedNotes: next };
  }
  return { document: { ...document, bookmarks }, imported };
}
