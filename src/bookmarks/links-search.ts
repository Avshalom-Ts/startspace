// links-search.ts
//
// Provides the pure, browser-independent filtering used by the Links page.
// Bookmark data remains owned by the browser; this module only filters the
// in-memory link cards supplied by the page.

import type { BookmarkNode } from "../hooks/useBookmarks";
import type { BookmarkMetadata } from "../hooks/useBookmarks";

/** A bookmark link paired with the title of its immediate parent folder. */
export interface LinkSearchItem {
  node: BookmarkNode;
  folderTitle: string;
}

/**
 * Filters link cards by bookmark title or URL using a case-insensitive
 * substring match. An empty query returns every supplied card.
 *
 * @param links - Link cards available to the Links page.
 * @param query - User-entered search text.
 * @returns Matching cards in their original bookmark-tree order.
 */
export function filterLinks(links: LinkSearchItem[], query: string): LinkSearchItem[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return links;

  return links.filter(({ node }) =>
    node.title.toLowerCase().includes(normalized)
    || node.url?.toLowerCase().includes(normalized),
  );
}

/**
 * Returns only link cards marked as favorites in StartSpace metadata.
 *
 * @param links - Link cards available to the Links page.
 * @param metadata - StartSpace metadata keyed by browser Bookmark ID.
 * @returns Favorite cards in their original bookmark-tree order.
 */
export function filterFavoriteLinks(
  links: LinkSearchItem[],
  metadata: Record<string, BookmarkMetadata>,
): LinkSearchItem[] {
  return links.filter(({ node }) => metadata[node.id]?.favorites === true);
}
