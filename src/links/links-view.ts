// links-view.ts
//
// Pure selection, counting, filtering and sorting rules for the Links page.
// Browser data stays authoritative; these helpers only derive view state.

import type { BookmarkMetadata, BookmarkNode } from "../hooks/useBookmarks";
import type { LinkSearchItem } from "./links-search";

export type LinksView =
  | { kind: "all" }
  | { kind: "favorites" }
  | { kind: "recent" }
  | { kind: "folder"; id: string };

export type LinksSort = "name-asc" | "name-desc" | "browser";

export interface LinkFilters {
  text: string;
  favoritesOnly: boolean;
  tags: string[];
}

export const EMPTY_FILTERS: LinkFilters = {
  text: "",
  favoritesOnly: false,
  tags: [],
};
export const RECENT_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

const SAFE_SCHEMES = new Set(["http:", "https:", "ftp:", "file:"]);

/** True when the URL parses and uses a non-executable scheme. */
export function isSafeLinkUrl(url: string | undefined): url is string {
  if (!url) return false;
  try {
    return SAFE_SCHEMES.has(new URL(url).protocol);
  } catch {
    return false;
  }
}

/** Counts bookmark leaves below a node, including nested folders. */
export function countBookmarkLeaves(node: BookmarkNode): number {
  if (node.url) return 1;
  return (node.children ?? []).reduce(
    (sum, child) => sum + countBookmarkLeaves(child),
    0,
  );
}

/** Returns ancestor folders from the top-level root down to (excluding) the node. */
export function bookmarkFolderPath(
  roots: BookmarkNode[],
  id: string,
): BookmarkNode[] {
  for (const root of roots) {
    if (root.id === id) return [];
    const inner = bookmarkFolderPath(root.children ?? [], id);
    if (inner.length || (root.children ?? []).some((child) => child.id === id))
      return [root, ...inner];
  }
  return [];
}

/**
 * Returns folder IDs that match the query plus their ancestors, or null when
 * the query is empty and every folder is visible.
 */
export function matchFolderIds(
  roots: BookmarkNode[],
  query: string,
): Set<string> | null {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return null;
  const visible = new Set<string>();
  const walk = (nodes: BookmarkNode[], ancestors: string[]) => {
    for (const node of nodes) {
      if (node.url) continue;
      if (node.title.toLowerCase().includes(normalized))
        for (const id of [...ancestors, node.id]) visible.add(id);
      walk(node.children ?? [], [...ancestors, node.id]);
    }
  };
  walk(roots, []);
  return visible;
}

/** Trims tags and removes case-insensitive duplicates, keeping first spelling. */
export function normalizeTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of tags) {
    const tag = raw.trim();
    const key = tag.toLowerCase();
    if (!tag || seen.has(key)) continue;
    seen.add(key);
    result.push(tag);
  }
  return result;
}

/** True when the bookmark was opened through StartSpace within the window. */
export function isRecentlyOpened(
  meta: BookmarkMetadata | undefined,
  now: number,
): boolean {
  if (!meta?.lastOpenedAt) return false;
  const opened = Date.parse(meta.lastOpenedAt);
  return (
    Number.isFinite(opened) && now - opened <= RECENT_WINDOW_MS && opened <= now
  );
}

/** Collects links below a folder with their paths relative to that folder. */
function collectDescendantLinks(
  folder: BookmarkNode,
  folderPath: string[] = [],
): LinkSearchItem[] {
  const items: LinkSearchItem[] = [];
  for (const child of folder.children ?? []) {
    if (child.url)
      items.push({
        node: child,
        folderTitle: folder.title,
        folderPath: folderPath.join(" / "),
      });
    else
      items.push(
        ...collectDescendantLinks(child, [
          ...folderPath,
          child.title || "Untitled folder",
        ]),
      );
  }
  return items;
}

/** Selects the link set for a sidebar view before filters and sorting. */
export function selectViewLinks(
  roots: BookmarkNode[],
  view: LinksView,
  metadata: Record<string, BookmarkMetadata>,
  now: number,
): LinkSearchItem[] {
  const all = roots.flatMap((root) =>
    root.url ? [{ node: root, folderTitle: "" }] : collectDescendantLinks(root),
  );
  if (view.kind === "favorites")
    return all.filter(({ node }) => metadata[node.id]?.favorites === true);
  if (view.kind === "recent")
    return all
      .filter(({ node }) => isRecentlyOpened(metadata[node.id], now))
      .sort(
        (a, b) =>
          Date.parse(metadata[b.node.id]!.lastOpenedAt!) -
          Date.parse(metadata[a.node.id]!.lastOpenedAt!),
      );
  if (view.kind === "folder") {
    const stack = [...roots];
    while (stack.length) {
      const node = stack.shift()!;
      if (node.id === view.id) return collectDescendantLinks(node);
      stack.push(...(node.children ?? []).filter((child) => !child.url));
    }
    return [];
  }
  return all;
}

/** Applies text, favorite and tag filters combined with AND. */
export function applyLinkFilters(
  items: LinkSearchItem[],
  filters: LinkFilters,
  metadata: Record<string, BookmarkMetadata>,
): LinkSearchItem[] {
  const text = filters.text.trim().toLowerCase();
  const wanted = filters.tags.map((tag) => tag.toLowerCase());
  return items.filter(({ node }) => {
    const meta = metadata[node.id];
    const tags = (meta?.tags ?? []).map((tag) => tag.toLowerCase());
    if (filters.favoritesOnly && meta?.favorites !== true) return false;
    if (!wanted.every((tag) => tags.includes(tag))) return false;
    if (!text) return true;
    return [node.title, node.url ?? "", meta?.description ?? "", ...tags].some(
      (value) => value.toLowerCase().includes(text),
    );
  });
}

/** Sorts links by name or keeps browser order; the input is not mutated. */
export function sortLinks(
  items: LinkSearchItem[],
  sort: LinksSort,
): LinkSearchItem[] {
  if (sort === "browser") return items;
  const sorted = [...items].sort(
    (a, b) =>
      a.node.title.localeCompare(b.node.title, undefined, {
        sensitivity: "base",
      }) || a.node.id.localeCompare(b.node.id),
  );
  return sort === "name-desc" ? sorted.reverse() : sorted;
}

/** Returns every distinct tag used by the supplied links, alphabetically. */
export function collectLinkTags(
  items: LinkSearchItem[],
  metadata: Record<string, BookmarkMetadata>,
): string[] {
  return normalizeTags(
    items.flatMap(({ node }) => metadata[node.id]?.tags ?? []),
  ).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
}
