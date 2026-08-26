import { useState, useEffect, useCallback } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A node in the Chrome bookmark tree. The API shape is fairly stable. */
export interface BookmarkNode {
  /** Unique ID assigned by the browser — this is what StartSpace uses to link metadata. */
  id: string;
  /** Bookmark title (for folders this is the folder name). */
  title: string;
  /** URL is present only on leaf bookmark nodes, not on folders. */
  url?: string;
  /** Child nodes — present on folders; may be empty. */
  children?: BookmarkNode[];
}

/** StartSpace metadata stored in extension storage, keyed by browser Bookmark ID. */
export interface BookmarkMetadata {
  /** Whether this bookmark is a favorite — shown on the homepage. */
  favorites: boolean;
  /** User-assigned tags. */
  tags: string[];
  /** When StartSpace first saw/linked this bookmark. */
  dateAdded: string;
  /** Note identities (relative paths) linked to this bookmark. */
  relatedNotes: string[];
  /** Task IDs linked to this bookmark. */
  relatedTasks: string[];
}

/** Composite view of a bookmark as rendered on the homepage favorites. */
export interface FavoriteEntry {
  id: string;
  title: string;
  url: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Flatten a bookmark tree into a flat list of leaf bookmark nodes (nodes
 * that have a `url`). Folders are skipped.
 */
function flattenBookmarks(nodes: BookmarkNode[]): BookmarkNode[] {
  const leaves: BookmarkNode[] = [];

  function walk(list: BookmarkNode[]) {
    for (const node of list) {
      if (node.url) {
        leaves.push(node);
      }
      if (node.children) {
        walk(node.children);
      }
    }
  }

  walk(nodes);
  return leaves;
}

// The Chrome extension type declarations are loaded via the "chrome" type
// package and the bundler resolves the runtime `chrome` global inside the
// extension context. Guard against missing globals so the code also compiles
// and runs gracefully outside an extension page (e.g. during preview/dev).

const chromeBookmarks: typeof globalThis.chrome | undefined = (
  globalThis as { chrome?: typeof globalThis.chrome }
).chrome;

/**
 * Try to read the bookmark tree from the Chrome Bookmarks API. Returns `null`
 * when the API is unavailable (e.g. outside an extension context) so the UI
 * can render a graceful empty state rather than throwing.
 */
async function readBookmarkTree(): Promise<BookmarkNode[] | null> {
  if (!chromeBookmarks?.bookmarks) {
    return null;
  }

  try {
    const result = await chromeBookmarks.bookmarks.getTree();
    // getTree returns BookmarkTreeNode[] — map to our narrower shape.
    return (result as unknown as BookmarkNode[]) ?? [];
  } catch (err) {
    console.warn("[StartSpace] chrome.bookmarks.getTree failed:", err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// useBookmarks
// ---------------------------------------------------------------------------

/**
 * Reads the browser's bookmark tree via the Bookmarks API and exposes it as
 * a flat list of leaf bookmarks plus a loading state.
 *
 * The browser is the source of truth for bookmark data (URL, name, folder
 * structure, Bookmark ID). StartSpace reads it here and links its own
 * metadata (favorites, tags, related notes/tasks) by Bookmark ID elsewhere.
 */
export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<BookmarkNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const tree = await readBookmarkTree();
    if (tree === null) {
      // API unavailable — not an error, just no bookmarks reachable.
      setBookmarks([]);
      setLoading(false);
      return;
    }

    const flat = flattenBookmarks(tree);
    setBookmarks(flat);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { bookmarks, loading, error, reload: load };
}
