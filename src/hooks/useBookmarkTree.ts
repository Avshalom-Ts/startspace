import { useState, useEffect, useCallback } from 'react';
import type { BookmarkNode, BookmarkMetadata } from './useBookmarks';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Reuse the chrome global access pattern from useBookmarks.
const chromeBookmarks: typeof globalThis.chrome | undefined = (
  globalThis as { chrome?: typeof globalThis.chrome }
).chrome;

function readBookmarkTree(): Promise<BookmarkNode[] | null> {
  if (!chromeBookmarks?.bookmarks) {
    return Promise.resolve(null);
  }
  return chromeBookmarks.bookmarks.getTree()
    .then((result) => (result as unknown as BookmarkNode[]) ?? [])
    .catch((err) => {
      console.warn('[StartSpace] chrome.bookmarks.getTree failed:', err);
      return null;
    });
}

// ---------------------------------------------------------------------------
// useBookmarkTree
// ---------------------------------------------------------------------------

/**
 * Reads the full bookmark tree (with folder structure preserved) from the
 * Chrome Bookmarks API. Unlike useBookmarks (which flattens to leaf nodes),
 * this returns the tree as-is so the Links page can render folders with their
 * children.
 *
 * Returns the root-level nodes (top-level bookmark bars, other toolbars, etc.).
 * StartSpace renders each top-level node as a folder.
 */
export function useBookmarkTree() {
  const [tree, setTree] = useState<BookmarkNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const result = await readBookmarkTree();

    if (result === null) {
      setTree([]);
      setLoading(false);
      return;
    }

    setTree(result);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { tree, loading, error, reload: load };
}

// ---------------------------------------------------------------------------
// useBookmarkMetadata — extension storage reads for StartSpace metadata.
// ---------------------------------------------------------------------------

const META_KEY = 'startspace.bookmarkMetadata';

function readBookmarkMetadata(): Promise<Record<string, BookmarkMetadata>> {
  return new Promise((resolve) => {
    const chromeExt = (globalThis as {
      chrome?: {
        storage?: {
          local: {
            get: (
              keys: string[],
              callback: (result: Record<string, unknown>) => void
            ) => void;
          };
        };
      };
    }).chrome;

    if (!chromeExt?.storage?.local) {
      resolve({});
      return;
    }

    chromeExt.storage.local.get([META_KEY], (result: Record<string, unknown>) => {
      const raw = result[META_KEY];
      resolve(
        raw && typeof raw === 'object'
          ? (raw as Record<string, BookmarkMetadata>)
          : {}
      );
    });
  });
}

export function useBookmarkMetadata() {
  const [metadata, setMetadata] = useState<Record<string, BookmarkMetadata>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    readBookmarkMetadata().then((meta) => {
      setMetadata(meta);
      setLoading(false);
    });
  }, []);

  return { metadata, loading };
}
