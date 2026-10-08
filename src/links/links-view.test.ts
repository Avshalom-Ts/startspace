// Verifies Links view rules with synthetic bookmarks only.
import { describe, expect, it } from "vitest";
import type { BookmarkMetadata, BookmarkNode } from "../hooks/useBookmarks";
import {
  applyLinkFilters,
  bookmarkFolderPath,
  collectLinkTags,
  countBookmarkLeaves,
  EMPTY_FILTERS,
  isSafeLinkUrl,
  matchFolderIds,
  normalizeTags,
  selectViewLinks,
  sortLinks,
} from "./links-view";

const roots: BookmarkNode[] = [
  {
    id: "bar",
    title: "Bookmarks bar",
    children: [
      { id: "b", parentId: "bar", title: "beta", url: "https://beta.test" },
      {
        id: "work",
        parentId: "bar",
        title: "Work",
        children: [
          {
            id: "infra",
            parentId: "work",
            title: "Infrastructure",
            children: [
              {
                id: "a",
                parentId: "infra",
                title: "Alpha",
                url: "https://alpha.test",
              },
            ],
          },
          {
            id: "c",
            parentId: "work",
            title: "Gamma",
            url: "https://gamma.test",
          },
        ],
      },
    ],
  },
];

const meta = (patch: Partial<BookmarkMetadata>): BookmarkMetadata => ({
  favorites: false,
  tags: [],
  dateAdded: "2026-01-01T00:00:00Z",
  relatedNotes: [],
  relatedTasks: [],
  ...patch,
});
const now = Date.parse("2026-09-30T12:00:00Z");
const metadata: Record<string, BookmarkMetadata> = {
  a: meta({
    favorites: true,
    tags: ["Infra", "lab"],
    lastOpenedAt: "2026-09-29T00:00:00Z",
  }),
  b: meta({
    tags: ["infra"],
    lastOpenedAt: "2026-09-20T00:00:00Z",
    description: "Docs portal",
  }),
  c: meta({ lastOpenedAt: "2026-07-01T00:00:00Z" }),
};

describe("links view", () => {
  it("counts descendant bookmarks and resolves folder paths", () => {
    expect(countBookmarkLeaves(roots[0]!)).toBe(3);
    expect(bookmarkFolderPath(roots, "a").map((node) => node.id)).toEqual([
      "bar",
      "work",
      "infra",
    ]);
    expect(bookmarkFolderPath(roots, "bar")).toEqual([]);
  });

  it("matches folders and preserves ancestors", () => {
    expect(matchFolderIds(roots, "  ")).toBeNull();
    expect([...matchFolderIds(roots, "infra")!]).toEqual([
      "bar",
      "work",
      "infra",
    ]);
  });

  it("selects all, folder descendants, favorites and 30-day recent", () => {
    expect(
      selectViewLinks(roots, { kind: "all" }, metadata, now).map(
        (i) => i.node.id,
      ),
    ).toEqual(["b", "a", "c"]);
    expect(
      selectViewLinks(roots, { kind: "folder", id: "work" }, metadata, now).map(
        (i) => [i.node.id, i.folderPath],
      ),
    ).toEqual([
      ["a", "Infrastructure"],
      ["c", ""],
    ]);
    expect(
      selectViewLinks(roots, { kind: "favorites" }, metadata, now).map(
        (i) => i.node.id,
      ),
    ).toEqual(["a"]);
    expect(
      selectViewLinks(roots, { kind: "recent" }, metadata, now).map(
        (i) => i.node.id,
      ),
    ).toEqual(["a", "b"]);
  });

  it("combines text, favorite and tag filters with AND", () => {
    const all = selectViewLinks(roots, { kind: "all" }, metadata, now);
    expect(
      applyLinkFilters(
        all,
        { ...EMPTY_FILTERS, tags: ["INFRA"] },
        metadata,
      ).map((i) => i.node.id),
    ).toEqual(["b", "a"]);
    expect(
      applyLinkFilters(
        all,
        { ...EMPTY_FILTERS, tags: ["infra", "lab"] },
        metadata,
      ).map((i) => i.node.id),
    ).toEqual(["a"]);
    expect(
      applyLinkFilters(
        all,
        { text: "portal", favoritesOnly: false, tags: [] },
        metadata,
      ).map((i) => i.node.id),
    ).toEqual(["b"]);
    expect(
      applyLinkFilters(
        all,
        { text: "", favoritesOnly: true, tags: ["infra"] },
        metadata,
      ).map((i) => i.node.id),
    ).toEqual(["a"]);
  });

  it("sorts by name and keeps browser order", () => {
    const all = selectViewLinks(roots, { kind: "all" }, metadata, now);
    expect(sortLinks(all, "name-asc").map((i) => i.node.id)).toEqual([
      "a",
      "b",
      "c",
    ]);
    expect(sortLinks(all, "name-desc").map((i) => i.node.id)).toEqual([
      "c",
      "b",
      "a",
    ]);
    expect(sortLinks(all, "browser")).toBe(all);
  });

  it("normalizes tags and collects distinct tags", () => {
    expect(normalizeTags([" Lab ", "lab", "", "Home"])).toEqual([
      "Lab",
      "Home",
    ]);
    const all = selectViewLinks(roots, { kind: "all" }, metadata, now);
    expect(collectLinkTags(all, metadata)).toEqual(["infra", "lab"]);
  });

  it("rejects executable URL schemes", () => {
    expect(isSafeLinkUrl("https://example.test")).toBe(true);
    expect(isSafeLinkUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeLinkUrl("data:text/html,x")).toBe(false);
    expect(isSafeLinkUrl("not a url")).toBe(false);
  });
});
