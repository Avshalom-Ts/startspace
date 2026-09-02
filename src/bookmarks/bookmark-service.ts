// bookmark-service.ts
//
// Mutation boundary around Chrome's Bookmarks API. The browser remains the
// source of truth and must grant the manifest `bookmarks` permission.

import type { BookmarkNode } from "../hooks/useBookmarks";

export interface CreateBookmarkInput { parentId: string; title: string; url?: string }
export interface UpdateBookmarkInput { title?: string; url?: string }

/** User-safe error raised when a bookmark operation cannot be completed. */
export class BookmarkOperationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BookmarkOperationError";
  }
}

/** Returns the Chrome bookmarks API or raises an availability error. */
function getBookmarksApi(): typeof chrome.bookmarks {
  const api = (globalThis as { chrome?: typeof chrome }).chrome?.bookmarks;
  if (!api) throw new BookmarkOperationError("Bookmark management is unavailable in this browser context.");
  return api;
}

/** Converts an unknown browser failure into a stable user-facing error. */
function operationFailed(action: string, error: unknown): BookmarkOperationError {
  console.warn(`[StartSpace] bookmark ${action} failed`, error);
  return new BookmarkOperationError(`The browser could not ${action} the bookmark. Try again.`);
}

/** Creates a bookmark link or folder below the requested browser folder. */
export async function createBookmark(input: CreateBookmarkInput): Promise<BookmarkNode> {
  try { return await getBookmarksApi().create(input) as BookmarkNode; }
  catch (error) { throw operationFailed("create", error); }
}

/** Updates the title and, for links, URL of an existing node. */
export async function updateBookmark(id: string, changes: UpdateBookmarkInput): Promise<BookmarkNode> {
  try { return await getBookmarksApi().update(id, changes) as BookmarkNode; }
  catch (error) { throw operationFailed("update", error); }
}

/** Moves an existing bookmark node into another folder. */
export async function moveBookmark(id: string, parentId: string): Promise<BookmarkNode> {
  try { return await getBookmarksApi().move(id, { parentId }) as BookmarkNode; }
  catch (error) { throw operationFailed("move", error); }
}

/** Deletes a link or an empty folder from the browser bookmark store. */
export async function removeBookmark(id: string): Promise<void> {
  try { await getBookmarksApi().remove(id); }
  catch (error) { throw operationFailed("delete", error); }
}

/** Recursively deletes a folder and all descendants from the browser store. */
export async function removeBookmarkTree(id: string): Promise<void> {
  try { await getBookmarksApi().removeTree(id); }
  catch (error) { throw operationFailed("delete", error); }
}
