// Checks grouped dropdown actions and keyboard result indices using synthetic matches.
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { SearchResults } from "./SearchResults";
import type { SearchResults as Results, LocalSearchScope } from "./search";

const results: Results = {
  bookmarks: [{ bookmark: { id: "b1", title: "Match bookmark", url: "https://example.test" }, matchType: "title" }],
  notes: [{ note: { id: "note.md", title: "Match note", content: "", folder: "", modifiedAt: "2026-10-15" }, matchType: "title", relevance: 2 }],
  tasks: [],
  webQuery: "match",
};
let root: Root;
let container: HTMLDivElement;
beforeEach(() => {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

it("offers All result beneath each matching feature and invokes expansion in place", async () => {
  const onShowAll = vi.fn();
  await act(async () => root.render(<SearchResults results={results} query="match" activeResultIndex={-1} onWebSearch={vi.fn()} onShowAll={onShowAll} unlimitedScope={null} />));
  for (const scope of ["bookmarks", "notes"]) {
    const button = container.querySelector<HTMLButtonElement>(`[aria-label="All result from ${scope}"]`)!;
    expect(button.textContent?.trim()).toBe("All result");
    await act(async () => button.click());
    expect(onShowAll).toHaveBeenLastCalledWith(scope);
  }
  expect(container.querySelector('[aria-label="All result from tasks"]')).toBeNull();
  expect(container.querySelectorAll('[role="option"]')).toHaveLength(3);
});

it("hides the expansion action for the unlimited feature while preserving keyboard indices", async () => {
  const expanded: Results = { bookmarks: [], notes: results.notes, tasks: [], webQuery: null };
  await act(async () => root.render(<SearchResults results={expanded} query="match" activeResultIndex={0} onWebSearch={vi.fn()} onShowAll={vi.fn()} unlimitedScope={"notes" as LocalSearchScope} />));
  expect(container.querySelector('button')).toBeNull();
  expect(container.querySelector('#search-result-0')?.getAttribute('aria-selected')).toBe("true");
  expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({ block: "nearest" });
});
