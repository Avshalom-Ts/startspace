// Verifies the explicit migration from legacy extension bookmark relationships.

import { expect, it } from "vitest";
import { emptyBookmarkMetadata } from "../links/bookmark-metadata-model";
import {
  hasLegacyBookmarkLinks,
  mergeLegacyBookmarkLinks,
} from "./legacy-bookmark-links";

const stableId = "note-00000000-0000-4000-8000-000000000001";
const notes = [{
  id: "Plans/release.md",
  stableId,
  title: "Release",
  content: "",
  folder: "Plans",
  modifiedAt: "2026-10-13T00:00:00.000Z",
}];

it("detects legacy links only for bookmarks in the current browser profile", () => {
  const legacy = {
    current: { relatedNotes: ["Plans/release.md"] },
    stale: { relatedNotes: ["Plans/release.md"] },
  };
  expect(hasLegacyBookmarkLinks(legacy, new Set(["current"]))).toBe(true);
  expect(hasLegacyBookmarkLinks(legacy, new Set(["other"]))).toBe(false);
});

it("imports current legacy bookmark links as stable note IDs without replacing workspace metadata", () => {
  const document = {
    version: 1 as const,
    bookmarks: {
      current: {
        ...emptyBookmarkMetadata(),
        tags: ["keep"],
        relatedNotes: ["missing.md"],
      },
    },
  };
  const result = mergeLegacyBookmarkLinks(
    document,
    {
      current: { relatedNotes: ["Plans/release.md", "Plans/release.md"] },
      stale: { relatedNotes: ["Plans/release.md"] },
      malformed: { relatedNotes: [3] },
    },
    notes,
    new Set(["current"]),
  );
  expect(result.imported).toBe(1);
  expect(result.document.bookmarks.current).toMatchObject({
    tags: ["keep"],
    relatedNotes: ["missing.md", stableId],
  });
  expect(result.document.bookmarks.stale).toBeUndefined();
});

it("retains a missing legacy note reference so people can relink it later", () => {
  const result = mergeLegacyBookmarkLinks(
    { version: 1, bookmarks: {} },
    { current: { relatedNotes: ["removed.md"] } },
    notes,
    new Set(["current"]),
  );
  expect(result.document.bookmarks.current?.relatedNotes).toEqual(["removed.md"]);
});
