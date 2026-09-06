// links-search.test.ts
//
// Verifies the pure title and URL filtering used by the Links page without
// reading real browser bookmarks.

import { describe, expect, it } from "vitest";
import { filterFavoriteLinks, filterLinks, type LinkSearchItem } from "./links-search";

const links: LinkSearchItem[] = [
  { node: { id: "1", title: "TypeScript Handbook", url: "https://typescriptlang.org/docs" }, folderTitle: "Development" },
  { node: { id: "2", title: "Chess", url: "https://lichess.org" }, folderTitle: "Games" },
];

describe("filterLinks", () => {
  it("returns all links for an empty query", () => {
    expect(filterLinks(links, "  ")).toEqual(links);
  });

  it("matches titles case-insensitively", () => {
    expect(filterLinks(links, "typescript")).toEqual([links[0]]);
  });

  it("matches bookmark URLs case-insensitively", () => {
    expect(filterLinks(links, "LICHESS.ORG")).toEqual([links[1]]);
  });

  it("returns no links when nothing matches", () => {
    expect(filterLinks(links, "recipes")).toEqual([]);
  });
});

describe("filterFavoriteLinks", () => {
  it("returns only links marked as favorites", () => {
    expect(filterFavoriteLinks(links, {
      "2": {
        favorites: true,
        tags: [],
        dateAdded: "2026-09-03T00:00:00.000Z",
        relatedNotes: [],
        relatedTasks: [],
      },
    })).toEqual([links[1]]);
  });

  it("returns no links when none are favorites", () => {
    expect(filterFavoriteLinks(links, {})).toEqual([]);
  });
});
