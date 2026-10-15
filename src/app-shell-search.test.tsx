// Exercises Home scope toggles and unlimited expansion with synthetic local search data.
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { AppShell } from "./AppShell";

const fixture = vi.hoisted(() => ({
  config: { preferences: { searchLinksLimit: 12, searchNotesLimit: 6, searchTasksLimit: 6 } },
  searchData: {
    bookmarkTree: Array.from({ length: 30 }, (_, i) => ({ id: `b${i}`, title: `Match bookmark ${i}`, url: `https://example.test/${i}` })),
    notes: Array.from({ length: 30 }, (_, i) => ({ id: `n${i}.md`, title: `Match note ${i}`, content: "", folder: "", modifiedAt: "2026-10-15" })),
    tasks: Array.from({ length: 30 }, (_, i) => ({ id: `t${i}`, title: `Match task ${i}`, description: "" })),
    loading: false,
  },
}));
vi.mock("./hooks/useConfig", async (importOriginal) => ({
  ...await importOriginal<typeof import("./hooks/useConfig")>(),
  useConfig: () => ({ config: fixture.config }),
}));
vi.mock("./hooks/useTheme", () => ({ useTheme: () => ({ mounted: true }) }));
vi.mock("./search/use-search-data", () => ({ useSearchData: () => fixture.searchData }));
vi.mock("./hooks/useBookmarkTree", () => ({ useBookmarkTree: () => ({ tree: [], loading: false }), useBookmarkMetadata: () => ({ metadata: {}, loading: false }) }));
vi.mock("./links/use-description-fetching", () => ({ useDescriptionFetching: () => ({}) }));
vi.mock("./notifications/notification-context", () => ({ useNotifications: () => ({ error: vi.fn() }) }));
vi.mock("./Header", () => ({ Header: () => null }));
vi.mock("./components/page-content", () => ({ PageContent: () => null }));
vi.mock("./links/links-page", () => ({ LinksPage: () => null }));
vi.mock("./notes/notes-page", () => ({ NotesPage: () => null }));
vi.mock("./tasks/tasks-page", () => ({ TasksPage: () => null }));
vi.mock("./settings/SettingsPage", () => ({ SettingsPage: () => null }));
vi.mock("./components", () => ({
  PageFooter: () => null,
  SearchBar: ({ onChange, onNavigate }: { onChange: (query: string) => void; onNavigate: (direction: "next") => void }) => (
    <div>
      <button onClick={() => onChange("match")}>Enter fixture query</button>
      <button onClick={() => onNavigate("next")}>Next result</button>
    </div>
  ),
}));

let root: Root;
let container: HTMLDivElement;
beforeEach(() => {
  history.replaceState(null, "", "#home");
  Element.prototype.scrollIntoView = vi.fn();
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

/** Clicks a visible button by its text. */
async function click(text: string) {
  const button = [...container.querySelectorAll('button')].find((item) => item.textContent === text);
  expect(button).toBeDefined();
  await act(async () => button!.click());
}

it("starts with every source selected, toggles independently, and expands one feature inside the dropdown", async () => {
  await act(async () => root.render(<AppShell />));
  const scopes = container.querySelector('nav[aria-label="Search scope"]')!;
  expect([...scopes.querySelectorAll('button')].map((item) => item.textContent)).toEqual(["Bookmarks", "Notes", "Tasks", "Web"]);
  expect(scopes.querySelectorAll('[aria-pressed="true"]')).toHaveLength(4);
  await click("Enter fixture query");
  expect(container.querySelectorAll('[role="option"]')).toHaveLength(25);
  await click("Bookmarks");
  expect(container.querySelectorAll('[role="option"]')).toHaveLength(13);
  await click("Tasks");
  expect(container.querySelectorAll('[role="option"]')).toHaveLength(7);
  const allNotes = container.querySelector<HTMLButtonElement>('[aria-label="All result from notes"]')!;
  await act(async () => allNotes.click());
  expect(container.querySelectorAll('[role="option"]')).toHaveLength(30);
  expect(scopes.querySelectorAll('[aria-pressed="true"]')).toHaveLength(1);
  expect(container.querySelector('h3')?.textContent).toBe("Notes");
  expect(location.hash).toBe("#home");
  await click("Next result");
  expect(container.querySelector('#search-result-0')?.getAttribute('aria-selected')).toBe("true");
  await click("Tasks");
  expect(container.querySelectorAll('[role="option"]')).toHaveLength(12);
  expect(container.querySelector('[aria-selected="true"]')).toBeNull();
});
