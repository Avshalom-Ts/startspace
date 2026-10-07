// useBookmarkTree.ts
//
// Owns the live bookmark tree and StartSpace bookmark metadata used by Links.
// It reads and mutates Chrome's Bookmark API and stores metadata separately in
// the connected workspace under the browser-assigned Bookmark ID.

import { useCallback, useEffect, useRef, useState } from "react";
import { useWorkspace } from "./useWorkspace";
import { emptyBookmarkMetadata } from "../links/bookmark-metadata-model";
import { readBookmarkMetadata, updateBookmarkMetadata, signalBookmarkMetadata } from "../links/bookmark-workspace";
import {
  createBookmark,
  moveBookmark,
  removeBookmark,
  removeBookmarkTree,
  updateBookmark,
  type CreateBookmarkInput,
  type UpdateBookmarkInput,
} from "../bookmarks/bookmark-service";
import type { BookmarkMetadata, BookmarkNode } from "./useBookmarks";

/** Reads the full browser bookmark tree, returning null outside an extension. */
async function readBookmarkTree(): Promise<BookmarkNode[] | null> {
  const api = (globalThis as { chrome?: typeof chrome }).chrome?.bookmarks;
  if (!api) return null;
  try {
    return (await api.getTree()) as BookmarkNode[];
  } catch (error) {
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
    setError(
      result === null
        ? "Bookmarks are unavailable in this browser context."
        : null,
    );
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

  const runMutation = useCallback(
    async <Result>(operation: () => Promise<Result>): Promise<Result> => {
      setMutating(true);
      setError(null);
      try {
        const result = await operation();
        await reload();
        return result;
      } catch (failure) {
        setError(
          failure instanceof Error
            ? failure.message
            : "The bookmark operation failed. Try again.",
        );
        throw failure;
      } finally {
        setMutating(false);
      }
    },
    [reload],
  );

  return {
    tree,
    loading,
    mutating,
    error,
    clearError: () => setError(null),
    reload,
    create: (input: CreateBookmarkInput) =>
      runMutation(() => createBookmark(input)),
    update: (id: string, changes: UpdateBookmarkInput) =>
      runMutation(() => updateBookmark(id, changes)),
    move: (id: string, parentId: string) =>
      runMutation(() => moveBookmark(id, parentId)),
    remove: (id: string, recursive: boolean) =>
      runMutation(() =>
        recursive ? removeBookmarkTree(id) : removeBookmark(id),
      ),
  };
}

/** Reads and updates StartSpace metadata linked to browser Bookmark IDs. */
export function useBookmarkMetadata() {
  const { grant } = useWorkspace();
  const [metadata, setMetadata] = useState<Record<string, BookmarkMetadata>>(
    {},
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const available = !!grant.handle && !!grant.id && grant.permission === "granted";
  const requestId = useRef(0);
  const current = useRef(grant);
  current.current = grant;
  const [loadedFor, setLoadedFor] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const request = ++requestId.current;
    if (!grant.handle || !available) {
      setMetadata({});
      setLoading(false);
      setLoadedFor(null);
      setError(null);
      return;
    }
    try {
      const next = await readBookmarkMetadata(grant.handle);
      if (request !== requestId.current) return;
      setMetadata(next.bookmarks);
      setLoadedFor(grant.id);
      setError(null);
    } catch (cause) {
      if (request !== requestId.current) return;
      setMetadata({});
      setError(cause instanceof Error ? cause.message : "Could not read bookmark metadata.");
    } finally {
      if (request === requestId.current) setLoading(false);
    }
  }, [grant.handle, grant.id, available]);

  useEffect(() => {
    setLoading(available);
    void reload();
    const refresh = () => void reload();
    window.addEventListener("focus", refresh);
    window.addEventListener("startspace:bookmark-metadata-changed", refresh);
    window.addEventListener("startspace:workspace-changed", refresh);
    const channel = grant.id && typeof BroadcastChannel !== "undefined"
      ? new BroadcastChannel(`startspace:bookmark-metadata:${grant.id}`) : null;
    if (channel) channel.onmessage = refresh;
    return () => {
      requestId.current++;
      channel?.close();
      window.removeEventListener("focus", refresh);
      window.removeEventListener("startspace:bookmark-metadata-changed", refresh);
      window.removeEventListener("startspace:workspace-changed", refresh);
    };
  }, [reload, available, grant.id]);

  const mutate = useCallback(async (
    change: Parameters<typeof updateBookmarkMetadata>[2],
  ) => {
    if (!available || !grant.handle || !grant.id)
      throw new Error("Connect a workspace to save bookmark metadata.");
    const next = await updateBookmarkMetadata(grant.handle, grant.id, change);
    if (current.current.id === grant.id && current.current.handle === grant.handle) {
      setMetadata(next.bookmarks);
      setLoadedFor(grant.id);
      setError(null);
    }
    signalBookmarkMetadata(grant.id);
  }, [available, grant.handle, grant.id]);

  const removeIds = useCallback(async (ids: string[]) => {
    if (!available) return;
    await mutate((document) => ({
      ...document,
      bookmarks: Object.fromEntries(Object.entries(document.bookmarks).filter(([id]) => !ids.includes(id))),
    }));
  }, [available, mutate]);

  /** Merges a patch into one bookmark's metadata, creating the entry on first use. */
  const update = useCallback(
    async (id: string, patch: Partial<BookmarkMetadata>) => {
      const now = new Date().toISOString();
      const edited = Object.keys(patch).some((key) => key !== "lastOpenedAt");
      await mutate((document) => ({
        ...document,
        bookmarks: {
          ...document.bookmarks,
          [id]: { ...(document.bookmarks[id] ?? emptyBookmarkMetadata()), ...patch, ...(edited ? { updatedAt: now } : {}) },
        },
      }));
    },
    [mutate],
  );

  return {
    metadata: available && loadedFor === grant.id ? metadata : {},
    loading, available, error, reload, removeIds, update,
  };
}
