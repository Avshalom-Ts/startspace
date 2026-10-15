// search.test.ts
//
// Unit tests for the pure search orchestration module (search.ts): bookmark
// flattening and ranking, web fallback queries, and the grouped
// Bookmarks → Notes → Tasks → Web orchestration.

import { describe, expect, it } from "vitest";
import { flattenBookmarks, orchestrateSearch, searchBookmarks, searchSelectedSources } from "./search";
import type { BookmarkNode } from "../hooks/useBookmarks";
import type { NoteEntry } from "../types/notes";
import type { Task } from "../tasks/tasks-model";
function bookmark(
  id: string,
  title: string,
  url?: string,
  children?: BookmarkNode[],
): BookmarkNode {
  return { id, title, url, children };
}

function note(id: string, title: string, content: string): NoteEntry {
  return {
    id,
    title,
    content,
    folder: "",
    modifiedAt: "2026-01-01T00:00:00.000Z",
  };
}

function task(id: string, title: string, description = ""): Task {
  return {
    id,
    title,
    description,
    status: "todo",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    noteIds: [],
    bookmarkIds: [],
  };
}

describe("flattenBookmarks", () => {
  it("returns leaf bookmarks in depth-first order and skips folders", () => {
    const tree = [
      bookmark("f1", "Folder A", undefined, [
        bookmark("b1", "One", "https://one.example"),
        bookmark("f2", "Nested", undefined, [
          bookmark("b2", "Two", "https://two.example"),
        ]),
      ]),
      bookmark("b3", "Three", "https://three.example"),
    ];
    expect(flattenBookmarks(tree).map((b) => b.id)).toEqual(["b1", "b2", "b3"]);
  });

  it("returns an empty list for an empty tree", () => {
    expect(flattenBookmarks([])).toEqual([]);
  });
});

describe("searchBookmarks", () => {
  const bookmarks = [
    bookmark("b1", "TypeScript Handbook", "https://typescriptlang.org/docs"),
    bookmark("b2", "News", "https://typescript-news.example"),
    bookmark("b3", "Handbook of Chess", "https://chess.example"),
  ];

  it("matches by title case-insensitively", () => {
    const results = searchBookmarks(bookmarks, "handbook of");
    expect(results.map((r) => r.bookmark.id)).toEqual(["b3"]);
    expect(results[0]?.matchType).toBe("title");
  });

  it("matches by URL when the title does not match", () => {
    const results = searchBookmarks(bookmarks, "chess.example");
    expect(results.map((r) => r.bookmark.id)).toEqual(["b3"]);
    expect(results[0]?.matchType).toBe("url");
  });

  it("ranks title matches above URL matches", () => {
    // 'typescript' matches b1 by title and b2 by URL — title must come first
    // regardless of input order.
    const results = searchBookmarks([...bookmarks].reverse(), "typescript");
    expect(results.map((r) => r.bookmark.id)).toEqual(["b1", "b2"]);
    expect(results.map((r) => r.matchType)).toEqual(["title", "url"]);
  });

  it("returns nothing for an empty query", () => {
    expect(searchBookmarks(bookmarks, "   ")).toEqual([]);
  });
});

describe("orchestrateSearch", () => {
  const input = {
    bookmarkTree: [
      bookmark("f1", "Folder", undefined, [
        bookmark("b1", "React Docs", "https://react.dev"),
      ]),
    ],
    notes: [
      note("react.md", "React notes", "hooks and components"),
      note("other.md", "Other", "react is mentioned here"),
    ],
    tasks: [task("t1", "Learn React"), task("t2", "Buy milk")],
  };

  it("returns grouped results in Bookmarks → Notes → Tasks order plus the web query", () => {
    const results = orchestrateSearch(input, "react");
    expect(results.bookmarks.map((r) => r.bookmark.id)).toEqual(["b1"]);
    expect(results.notes.map((r) => r.note.id)).toEqual([
      "react.md",
      "other.md",
    ]);
    expect(results.tasks.map((t) => t.id)).toEqual(["t1"]);
    expect(results.webQuery).toBe("react");
  });

  it("returns empty groups and a null webQuery for an empty query", () => {
    const results = orchestrateSearch(input, "  ");
    expect(results).toEqual({
      bookmarks: [],
      notes: [],
      tasks: [],
      webQuery: null,
    });
  });

  it("still provides the web fallback when nothing matches locally", () => {
    const results = orchestrateSearch(input, "nonexistent");
    expect(results.bookmarks).toEqual([]);
    expect(results.notes).toEqual([]);
    expect(results.tasks).toEqual([]);
    expect(results.webQuery).toBe("nonexistent");
  });

  it("limits results to the selected Home search scope", () => {
    const bookmarksOnly = orchestrateSearch(
      input,
      "react",
      undefined,
      "bookmarks",
    );
    expect(bookmarksOnly.bookmarks).toHaveLength(1);
    expect(bookmarksOnly.notes).toEqual([]);
    expect(bookmarksOnly.tasks).toEqual([]);
    expect(bookmarksOnly.webQuery).toBeNull();

    const webOnly = orchestrateSearch(input, "react", undefined, "web");
    expect(webOnly.bookmarks).toEqual([]);
    expect(webOnly.notes).toEqual([]);
    expect(webOnly.tasks).toEqual([]);
    expect(webOnly.webQuery).toBe("react");
  });

  it("caps each group at the given limit", () => {
    const manyNotes = Array.from({ length: 8 }, (_, i) =>
      note(`n${i}.md`, `react ${i}`, ""),
    );
    const results = orchestrateSearch(
      { ...input, notes: manyNotes },
      "react",
      3,
    );
    expect(results.notes).toHaveLength(3);
  });
});

describe("selected search sources", () => {
  const input = {
    bookmarkTree: Array.from({ length: 40 }, (_, i) => bookmark(`b${i}`, `match ${i}`, `https://example.test/${i}`)),
    notes: Array.from({ length: 40 }, (_, i) => note(`n${i}.md`, `match ${i}`, "")),
    tasks: Array.from({ length: 40 }, (_, i) => task(`t${i}`, `match ${i}`)),
  };
  const limits = { bookmarks: 6, notes: 6, tasks: 6 };
  it("shows 18 local matches plus one web action by default", () => {
    const results = searchSelectedSources(input, "match", ["bookmarks", "notes", "tasks", "web"], limits);
    expect([results.bookmarks.length, results.notes.length, results.tasks.length]).toEqual([6, 6, 6]);
    expect(results.webQuery).toBe("match");
  });
  it("keeps each selected feature at its configured limit", () => {
    const results = searchSelectedSources(input, "match", ["notes", "tasks", "web"], limits);
    expect([results.bookmarks.length, results.notes.length, results.tasks.length]).toEqual([0, 6, 6]);
    expect(results.webQuery).toBe("match");
  });
  it("keeps a single selected feature at its own limit", () => {
    const results = searchSelectedSources(input, "match", ["notes", "web"], limits);
    expect(results.notes).toHaveLength(6);
  });
  it("honors unequal per-feature limits without redistributing deselected shares", () => {
    const limits = { bookmarks: 12, notes: 6, tasks: 6 };
    const results = searchSelectedSources(input, "match", ["bookmarks", "notes", "tasks"], limits);
    expect([results.bookmarks.length, results.notes.length, results.tasks.length]).toEqual([12, 6, 6]);
    const withoutBookmarks = searchSelectedSources(input, "match", ["notes", "tasks"], limits);
    expect([withoutBookmarks.notes.length, withoutBookmarks.tasks.length]).toEqual([6, 6]);
  });
  it("can show every match for only one feature without a web action", () => {
    const results = searchSelectedSources(input, "match", ["notes"], limits, "notes");
    expect(results.notes).toHaveLength(40);
    expect(results.bookmarks).toEqual([]);
    expect(results.tasks).toEqual([]);
    expect(results.webQuery).toBeNull();
  });
  it("handles empty selection, web only, empty queries, and zero feature limits", () => {
    expect(searchSelectedSources(input, "match", [], limits)).toEqual({ bookmarks: [], notes: [], tasks: [], webQuery: null });
    expect(searchSelectedSources(input, "match", ["web"], limits)).toEqual({ bookmarks: [], notes: [], tasks: [], webQuery: "match" });
    expect(searchSelectedSources(input, " ", ["notes", "web"], limits).webQuery).toBeNull();
    expect(searchSelectedSources(input, "match", ["notes"], { bookmarks: 0, notes: 0, tasks: 0 }).notes).toEqual([]);
  });
});
