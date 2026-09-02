// useBookmarkTree.ts
//
// Owns the live bookmark tree and StartSpace bookmark metadata used by Links.
// It reads and mutates Chrome's Bookmark API and stores metadata separately in
// chrome.storage.local under the browser-assigned Bookmark ID.

import { useCallback, useEffect, useState } from "react";
import { createBookmark, moveBookmark, removeBookmark, removeBookmarkTree, updateBookmark, type CreateBookmarkInput, type UpdateBookmarkInput } from "../bookmarks/bookmark-service";
import type { BookmarkMetadata, BookmarkNode } from "./useBookmarks";

const META_KEY = "startspace.bookmarkMetadata";

/** Reads the full browser bookmark tree, returning null outside an extension. */
async function readBookmarkTree(): Promise<BookmarkNode[] | null> {
  const api = (globalThis as { chrome?: typeof chrome }).chrome?.bookmarks;
  if (!api) return null;
  try { return await api.getTree() as BookmarkNode[]; }
  catch (error) {
    console.warn("[StartSpace] bookmark tree read failed", error);
    return null;
  }
}

/** Exposes a synchronized bookmark tree and all supported CRUD operations. */
export function useBookmarkTree() {
  const [tree, setTree] = useState<BookmarkNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [mutating, setMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const result = await readBookmarkTree();
    setTree(result ?? []);
    setLoading(false);
    setError(result === null ? "Bookmarks are unavailable in this browser context." : null);
  }, []);

  useEffect(() => void reload(), [reload]);

  useEffect(() => {
    const api = (globalThis as { chrome?: typeof chrome }).chrome?.bookmarks;
    if (!api) return;
    const refresh = () => void reload();
    api.onCreated.addListener(refresh);
    api.onChanged.addListener(refresh);
    api.onMoved.addListener(refresh);
    api.onRemoved.addListener(refresh);
    return () => {
      api.onCreated.removeListener(refresh);
      api.onChanged.removeListener(refresh);
      api.onMoved.removeListener(refresh);
      api.onRemoved.removeListener(refresh);
    };
  }, [reload]);

  const runMutation = useCallback(async <Result,>(operation: () => Promise<Result>): Promise<Result> => {
    setMutating(true);
    setError(null);
    try {
      const result = await operation();
      await reload();
      return result;
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "The bookmark operation failed. Try again.");
      throw failure;
    } finally { setMutating(false); }
  }, [reload]);

  return {
    tree, loading, mutating, error, clearError: () => setError(null), reload,
    create: (input: CreateBookmarkInput) => runMutation(() => createBookmark(input)),
    update: (id: string, changes: UpdateBookmarkInput) => runMutation(() => updateBookmark(id, changes)),
    move: (id: string, parentId: string) => runMutation(() => moveBookmark(id, parentId)),
    remove: (id: string, recursive: boolean) => runMutation(() => recursive ? removeBookmarkTree(id) : removeBookmark(id)),
  };
}

/** Reads and updates StartSpace metadata linked to browser Bookmark IDs. */
export function useBookmarkMetadata() {
  const [metadata, setMetadata] = useState<Record<string, BookmarkMetadata>>({});
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const storage = (globalThis as { chrome?: typeof chrome }).chrome?.storage?.local;
    if (!storage) { setMetadata({}); setLoading(false); return; }
    const result = await storage.get([META_KEY]);
    const raw = result[META_KEY];
    setMetadata(raw && typeof raw === "object" ? raw as Record<string, BookmarkMetadata> : {});
    setLoading(false);
  }, []);

  useEffect(() => void reload(), [reload]);

  const removeIds = useCallback(async (ids: string[]) => {
    const storage = (globalThis as { chrome?: typeof chrome }).chrome?.storage?.local;
    if (!storage) return;
    const result = await storage.get([META_KEY]);
    const raw = result[META_KEY];
    const next = raw && typeof raw === "object" ? { ...raw as Record<string, BookmarkMetadata> } : {};
    for (const id of ids) delete next[id];
    await storage.set({ [META_KEY]: next });
    setMetadata(next);
  }, []);

  return { metadata, loading, reload, removeIds };
}
