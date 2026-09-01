// search.ts
//
// Owns the central search orchestration for the homepage search bar:
// Bookmarks → Notes → Tasks → Web.
//
// This module is browser-API-free and side-effect-free so the ranking and
// fallback logic are deterministic unit-test targets (see
// .rule/testing-rules.md). Data gathering (Bookmark API, File System Access
// workspace scan, extension config) lives in use-search-data.ts; rendering
// lives in SearchResults.tsx.

import { searchNotes, type NoteSearchResult } from '../notes/notes-search';
import { filterTasks, type Task } from '../tasks/tasks-model';
import type { BookmarkNode } from '../hooks/useBookmarks';
import type { NoteEntry } from '../types/notes';
import type { WebSearchEngine } from '../hooks/useConfig';

/** Default maximum number of results shown per group. */
export const DEFAULT_GROUP_LIMIT = 5;

/** A bookmark that matched the query, with its match reason. */
export interface BookmarkSearchResult {
  /** The matched bookmark (a leaf node with a `url`). */
  bookmark: BookmarkNode;
  /** Why it matched: 'title' ranks above 'url'. */
  matchType: 'title' | 'url';
}

/** The grouped output of one orchestrated search, in display order. */
export interface SearchResults {
  bookmarks: BookmarkSearchResult[];
  notes: NoteSearchResult[];
  tasks: Task[];
  /** Fully-built web search URL for the fallback step, or null when the
   *  query is empty. */
  webUrl: string | null;
  /** The engine used for the web fallback (for labeling the UI). */
  engine: WebSearchEngine;
}

/**
 * Flattens a bookmark tree into leaf bookmark nodes (nodes with a `url`).
 * Folders are skipped. Returns the input unchanged when it is already flat.
 *
 * @param nodes - The bookmark tree (or any subtree of it).
 * @returns All leaf bookmarks in depth-first order.
 */
export function flattenBookmarks(nodes: BookmarkNode[]): BookmarkNode[] {
  const leaves: BookmarkNode[] = [];
  const walk = (list: BookmarkNode[]) => {
    for (const node of list) {
      if (node.url) leaves.push(node);
      if (node.children) walk(node.children);
    }
  };
  walk(nodes);
  return leaves;
}

/**
 * Searches bookmarks by title and URL (case-insensitive substring match).
 *
 * @param bookmarks - Leaf bookmark nodes to search (see flattenBookmarks).
 * @param query - The search query. Empty queries return nothing.
 * @returns Matches sorted by relevance: title matches first, then URL matches.
 */
export function searchBookmarks(bookmarks: BookmarkNode[], query: string): BookmarkSearchResult[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];

  const results: BookmarkSearchResult[] = [];
  for (const bookmark of bookmarks) {
    if (bookmark.title.toLowerCase().includes(normalized)) {
      results.push({ bookmark, matchType: 'title' });
    } else if (bookmark.url?.toLowerCase().includes(normalized)) {
      results.push({ bookmark, matchType: 'url' });
    }
  }
  results.sort((a, b) => (a.matchType === b.matchType ? 0 : a.matchType === 'title' ? -1 : 1));
  return results;
}

/**
 * Builds the web search URL for the fallback step by substituting the
 * URL-encoded query into the engine's `urlTemplate` at the `{query}` marker.
 *
 * @param engine - The configured web search engine.
 * @param query - The raw search query.
 * @returns The absolute search URL, or null when the query is empty.
 */
export function buildWebSearchUrl(engine: WebSearchEngine, query: string): string | null {
  const trimmed = query.trim();
  if (!trimmed) return null;
  return engine.urlTemplate.replace('{query}', encodeURIComponent(trimmed));
}

/**
 * Runs one orchestrated search across all local sources, in product order:
 * Bookmarks → Notes → Tasks → Web. Local groups are independent (the order is
 * a display order, not a short-circuit); the web fallback URL is always
 * provided so the UI can offer it regardless of local matches.
 *
 * @param input - The data to search: the bookmark tree, all notes, all tasks,
 *   and the configured web search engine.
 * @param query - The search query. Empty queries produce empty groups and a
 *   null webUrl.
 * @param limit - Maximum results per group (default DEFAULT_GROUP_LIMIT).
 * @returns Grouped, ranked results plus the web fallback URL.
 */
export function orchestrateSearch(
  input: {
    bookmarkTree: BookmarkNode[];
    notes: NoteEntry[];
    tasks: Task[];
    engine: WebSearchEngine;
  },
  query: string,
  limit: number = DEFAULT_GROUP_LIMIT,
): SearchResults {
  const normalized = query.trim();
  if (!normalized) {
    return { bookmarks: [], notes: [], tasks: [], webUrl: null, engine: input.engine };
  }

  return {
    bookmarks: searchBookmarks(flattenBookmarks(input.bookmarkTree), normalized).slice(0, limit),
    notes: searchNotes(input.notes, normalized).slice(0, limit),
    tasks: filterTasks(input.tasks, normalized).slice(0, limit),
    webUrl: buildWebSearchUrl(input.engine, normalized),
    engine: input.engine,
  };
}
