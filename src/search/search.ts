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

import { searchNotes, type NoteSearchResult } from "../notes/notes-search";
import { filterTasks, type Task } from "../tasks/tasks-model";
import type { BookmarkNode } from "../hooks/useBookmarks";
import type { NoteEntry } from "../types/notes";

/** Default maximum number of results shown per group. */
export const DEFAULT_GROUP_LIMIT = 5;
export type SearchScope = "all" | "bookmarks" | "notes" | "tasks" | "web";

/** A bookmark that matched the query, with its match reason. */
export interface BookmarkSearchResult {
  /** The matched bookmark (a leaf node with a `url`). */
  bookmark: BookmarkNode;
  /** Why it matched: 'title' ranks above 'url'. */
  matchType: "title" | "url";
}

/** The grouped output of one orchestrated search, in display order. */
export interface SearchResults {
  bookmarks: BookmarkSearchResult[];
  notes: NoteSearchResult[];
  tasks: Task[];
  /** Query passed to the browser search API only after user activation. */
  webQuery: string | null;
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
export function searchBookmarks(
  bookmarks: BookmarkNode[],
  query: string,
): BookmarkSearchResult[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];

  const results: BookmarkSearchResult[] = [];
  for (const bookmark of bookmarks) {
    if (bookmark.title.toLowerCase().includes(normalized)) {
      results.push({ bookmark, matchType: "title" });
    } else if (bookmark.url?.toLowerCase().includes(normalized)) {
      results.push({ bookmark, matchType: "url" });
    }
  }
  results.sort((a, b) =>
    a.matchType === b.matchType ? 0 : a.matchType === "title" ? -1 : 1,
  );
  return results;
}

/**
 * Runs one orchestrated search across all local sources, in product order:
 * Bookmarks → Notes → Tasks → Web. Local groups are independent (the order is
 * a display order, not a short-circuit); the web fallback query is always
 * provided so the UI can offer it regardless of local matches.
 *
 * @param input - The data to search: the bookmark tree, all notes, all tasks,
 *   with no provider configuration.
 * @param query - The search query. Empty queries produce empty groups and a
 *   null webQuery.
 * @param limit - Maximum results per group (default DEFAULT_GROUP_LIMIT).
 * @returns Grouped, ranked results plus the web fallback query.
 */
export function orchestrateSearch(
  input: {
    bookmarkTree: BookmarkNode[];
    notes: NoteEntry[];
    tasks: Task[];
  },
  query: string,
  limit: number = DEFAULT_GROUP_LIMIT,
  scope: SearchScope = "all",
): SearchResults {
  const normalized = query.trim();
  if (!normalized) {
    return { bookmarks: [], notes: [], tasks: [], webQuery: null };
  }

  return {
    bookmarks:
      scope === "all" || scope === "bookmarks"
        ? searchBookmarks(
            flattenBookmarks(input.bookmarkTree),
            normalized,
          ).slice(0, limit)
        : [],
    notes:
      scope === "all" || scope === "notes"
        ? searchNotes(input.notes, normalized).slice(0, limit)
        : [],
    tasks:
      scope === "all" || scope === "tasks"
        ? filterTasks(input.tasks, normalized).slice(0, limit)
        : [],
    webQuery: scope === "all" || scope === "web" ? normalized : null,
  };
}
