// Verifies Home limits against synthetic bookmark, task, and note data.
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { PageContent } from "./page-content";

const state = vi.hoisted(() => ({ preferences: {} as Record<string, number> }));
vi.mock("../hooks/useConfig", async (importOriginal) => ({
  ...await importOriginal<typeof import("../hooks/useConfig")>(),
  useConfig: () => ({ config: { preferences: state.preferences } }),
}));
vi.mock("../hooks/useWorkspace", () => ({ useWorkspace: () => ({ grant: { handle: {}, id: "test", permission: "granted" } }) }));
vi.mock("../hooks/useBookmarkTree", () => ({
  useBookmarkTree: () => ({ tree: Array.from({ length: 30 }, (_, i) => ({ id: String(i), title: `Link ${i}`, url: `https://example.test/${i}` })) }),
  useBookmarkMetadata: () => ({ available: true, metadata: Object.fromEntries(Array.from({ length: 30 }, (_, i) => [String(i), { favorites: true }])) }),
}));
vi.mock("../notes/use-notes", () => ({ useNotes: () => ({ index: { notes: Array.from({ length: 30 }, (_, i) => ({ id: `note-${i}`, stableId: `stable-${i}`, title: `Note ${i}`, folder: "" })) } }) }));
vi.mock("../notes/use-note-preferences", () => ({ useNotePreferences: () => ({ document: { notes: Object.fromEntries(Array.from({ length: 30 }, (_, i) => [`stable-${i}`, { favorite: i === 29 || i === 0, lastOpenedAt: i === 29 ? null : `2026-10-${String(i + 1).padStart(2, "0")}T00:00:00Z` }])) } }) }));
vi.mock("../tasks/use-tasks", () => ({ useTasks: () => ({ columns: [], tasks: Array.from({ length: 30 }, (_, i) => ({ id: String(i), title: `Task ${i}`, updatedAt: "2026-10-01", status: "todo" })) }) }));
vi.mock("../notifications/notification-context", () => ({ useNotifications: () => ({}) }));
vi.mock("../links/links-ui", () => ({ LinkIcon: () => null }));

let root: Root;
let container: HTMLDivElement;
beforeEach(() => {
  state.preferences = {};
  container = document.createElement("div");
  root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); });

/** Returns the items rendered in each Home section. */
function items() {
  return [
    container.querySelectorAll('a[href^="https://example.test/"]'),
    container.querySelectorAll('a[href^="#tasks?task="]'),
    container.querySelectorAll('a[href^="#notes?note="]'),
  ];
}
it("defaults all sections to 20 and includes favorites once within the notes total", async () => {
  await act(async () => root.render(<PageContent />));
  expect(items().map((list) => list.length)).toEqual([20, 20, 20]);
  const notes = [...items()[2]!].map((a) => a.getAttribute("href"));
  expect(notes.slice(0, 2)).toEqual(["#notes?note=note-0", "#notes?note=note-29"]);
  expect(new Set(notes).size).toBe(20);
});
it("applies independent limits and updates them when preferences change", async () => {
  state.preferences = { homeLinksLimit: 3, homeTasksLimit: 7, homeNotesLimit: 1 };
  await act(async () => root.render(<PageContent />));
  expect(items().map((list) => list.length)).toEqual([3, 7, 1]);
  state.preferences = { homeLinksLimit: 0, homeTasksLimit: 0, homeNotesLimit: 0 };
  await act(async () => root.render(<PageContent />));
  expect(items().map((list) => list.length)).toEqual([0, 0, 0]);
});
