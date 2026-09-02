// bookmark-tree.test.ts
//
// Verifies pure bookmark traversal used by Links CRUD without accessing real
// browser bookmarks.

import { describe, expect, it } from "vitest";
import { collectBookmarkFolders, collectBookmarkLinks, collectBookmarkNodeIds, findBookmarkNode, unwrapBookmarkRoots } from "./bookmark-tree";
import type { BookmarkNode } from "../hooks/useBookmarks";

const tree: BookmarkNode[] = [{ id: "root", title: "", children: [{ id: "bar", parentId: "root", title: "Bookmarks bar", children: [
  { id: "link-1", parentId: "bar", title: "Example", url: "https://example.test" },
  { id: "folder-1", parentId: "bar", title: "Reading", children: [{ id: "link-2", parentId: "folder-1", title: "Article", url: "https://article.test" }] },
] }] }];

describe("bookmark tree traversal", () => {
  it("unwraps the unnamed browser root", () => {
    expect(unwrapBookmarkRoots(tree).map((node) => node.id)).toEqual(["bar"]);
  });

  it("finds nested nodes and returns null for unknown IDs", () => {
    expect(findBookmarkNode(tree, "link-2")?.title).toBe("Article");
    expect(findBookmarkNode(tree, "missing")).toBeNull();
  });

  it("collects folders and links in depth-first order", () => {
    expect(collectBookmarkFolders(unwrapBookmarkRoots(tree)).map((node) => node.id)).toEqual(["bar", "folder-1"]);
    expect(collectBookmarkLinks(unwrapBookmarkRoots(tree))).toMatchObject([{ node: { id: "link-1" }, folderTitle: "Bookmarks bar" }, { node: { id: "link-2" }, folderTitle: "Reading" }]);
  });

  it("collects every descendant ID for recursive cleanup", () => {
    const folder = findBookmarkNode(tree, "bar");
    expect(folder && collectBookmarkNodeIds(folder)).toEqual(["bar", "link-1", "folder-1", "link-2"]);
  });
});
