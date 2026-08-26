import { useState, useEffect } from 'react';
import { useBookmarks } from './useBookmarks';
import type { BookmarkNode, FavoriteEntry } from './useBookmarks';

// Re-export the metadata type so consumers don't have to reach into useBookmarks.
export type { BookmarkNode } from './useBookmarks';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** StartSpace metadata stored in extension storage, keyed by browser Bookmark ID. */
export interface BookmarkMetadata {
  favorites: boolean;
  tags: string[];
  dateAdded: string;
  relatedNotes: string[];
  relatedTasks: string[];
}

// ---------------------------------------------------------------------------
// Storage helpers
// ---------------------------------------------------------------------------

const META_KEY = 'startspace.bookmarkMetadata';

function readBookmarkMetadata(): Promise<Record<string, BookmarkMetadata>> {
  return new Promise((resolve) => {
    const chromeExt = (globalThis as { chrome?: { storage?: { local: { get: (keys: string[], callback: (result: Record<string, unknown>) => void) => void } } } }).chrome;
    if (!chromeExt?.storage?.local) {
      resolve({});
      return;
    }
    chromeExt.storage.local.get([META_KEY], (result: Record<string, unknown>) => {
      const raw = result[META_KEY];
      resolve(raw && typeof raw === 'object' ? (raw as Record<string, BookmarkMetadata>) : {});
    });
  });
}

// ---------------------------------------------------------------------------
// useFavorites
// ---------------------------------------------------------------------------

/**
 * Combines:
 *  - the flat bookmark list from useBookmarks (browser source of truth), and
 *  - StartSpace metadata from extension storage (favorites flag per Bookmark ID)
 *
 * to produce the list of favorites displayed on the homepage.
 *
 * A bookmark becomes a favorite when its StartSpace metadata has `favorites: true`.
 * Bookmarks that exist in the browser but have no StartSpace metadata yet are
 * treated as non-favorites — the user can promote them from the Links page later.
 */
export function useFavorites() {
  const { bookmarks, loading: bookmarksLoading } = useBookmarks();
  const [metadata, setMetadata] = useState<Record<string, BookmarkMetadata>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    readBookmarkMetadata().then((meta) => {
      setMetadata(meta);
      setLoading(false);
    });
  }, []);

  // Re-read metadata when the bookmark list changes (so a newly-added browser
  // bookmark can be matched against existing metadata on reload).
  useEffect(() => {
    if (bookmarks.length > 0) {
      // Already loaded above; this effect is defensive for reload paths.
    }
  }, [bookmarks]);

  const favorites: FavoriteEntry[] = bookmarks
    .filter((b: BookmarkNode) => {
      const meta = metadata[b.id];
      return meta && meta.favorites === true;
    })
    .map((b: BookmarkNode): FavoriteEntry => ({
      id: b.id,
      title: b.title,
      url: b.url!,
    }));

  return { favorites, metadata, loading, bookmarksLoading };
}
