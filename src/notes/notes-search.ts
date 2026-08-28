// notes-search.ts
//
// Pure note search helpers: title/content matching and result scoring.
// Browser-API-free, so these are naturally unit-testable (see
// .rule/testing-rules.md).

import type { NoteEntry } from '../types/notes';

/** A note search result with a match reason. */
export interface NoteSearchResult {
  /** The matched note. */
  note: NoteEntry;
  /** Why this note matched: 'title' (title contains the query) or 'content'
   *  (content contains the query). */
  matchType: 'title' | 'content';
  /** A relevance hint: notes whose title matches are ranked above those whose
   *  content matches; ties are broken by modifiedAt (newest first). */
  relevance: number;
}

/** Searches notes by title and content.
 *
 *  @param notes - The notes to search.
 *  @param query - The search query. Empty queries return nothing.
 *  @returns Matched notes with match reasons and relevance, sorted by
 *    relevance (title matches first, then newest).
 */
export function searchNotes(notes: NoteEntry[], query: string): NoteSearchResult[] {
  if (!query || query.trim().length === 0) return [];
  const normalized = query.trim().toLowerCase();
  const results: NoteSearchResult[] = [];

  for (const note of notes) {
    const titleLower = note.title.toLowerCase();
    const contentLower = note.content.toLowerCase();
    let matchType: 'title' | 'content' | null = null;

    if (titleLower.includes(normalized)) {
      matchType = 'title';
    } else if (contentLower.includes(normalized)) {
      matchType = 'content';
    }

    if (matchType) {
      const relevance = matchType === 'title' ? 2 : 1;
      results.push({ note, matchType, relevance });
    }
  }

  results.sort((a, b) => {
    if (a.relevance !== b.relevance) return b.relevance - a.relevance;
    return b.note.modifiedAt.localeCompare(a.note.modifiedAt);
  });

  return results;
}

/** Like searchNotes but only returns note ids (for callers that want a flat
 *  list of matches without the full NoteEntry). */
export function searchNoteIds(notes: NoteEntry[], query: string): string[] {
  return searchNotes(notes, query).map((r) => r.note.id);
}
