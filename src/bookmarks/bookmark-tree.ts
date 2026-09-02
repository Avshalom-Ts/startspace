// bookmark-tree.ts
//
// Pure bookmark-tree traversal helpers used by the Links page and its tests.
// These functions do not call browser APIs.

import type { BookmarkNode } from "../hooks/useBookmarks";

/** Returns the browser-owned top-level bookmark containers below wrapper roots. */
export function unwrapBookmarkRoots(tree: BookmarkNode[]): BookmarkNode[] {
  let nodes = tree;
  while (nodes.length === 1) {
    const only = nodes[0];
    if (!only || only.url || !only.children || only.title.trim()) break;
    nodes = only.children;
  }
  return nodes;
}

/** Finds a bookmark or folder by its browser-assigned ID. */
export function findBookmarkNode(tree: BookmarkNode[], id: string): BookmarkNode | null {
  for (const node of tree) {
    if (node.id === id) return node;
    const match = findBookmarkNode(node.children ?? [], id);
    if (match) return match;
  }
  return null;
}

/** Flattens all bookmark folders in depth-first display order. */
export function collectBookmarkFolders(tree: BookmarkNode[]): BookmarkNode[] {
  const folders: BookmarkNode[] = [];
  for (const node of tree) {
    if (!node.url) {
      folders.push(node);
      folders.push(...collectBookmarkFolders(node.children ?? []));
    }
  }
  return folders;
}

/** Returns the IDs of a node and every descendant. */
export function collectBookmarkNodeIds(node: BookmarkNode): string[] {
  return [node.id, ...(node.children ?? []).flatMap(collectBookmarkNodeIds)];
}

/** Pairs every link with the title of its immediate parent folder. */
export function collectBookmarkLinks(tree: BookmarkNode[]): { node: BookmarkNode; folderTitle: string }[] {
  const links: { node: BookmarkNode; folderTitle: string }[] = [];
  for (const folder of tree) {
    for (const child of folder.children ?? []) {
      if (child.url) links.push({ node: child, folderTitle: folder.title });
      else links.push(...collectBookmarkLinks([child]));
    }
  }
  return links;
}
