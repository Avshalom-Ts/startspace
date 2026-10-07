import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useBookmarkMetadata } from "./useBookmarkTree";
import { workspaceFixture } from "../test/workspace-fixture";

const state = vi.hoisted(() => ({
  grant: { handle: null as FileSystemDirectoryHandle | null, id: null as string | null, permission: "denied" },
}));
vi.mock("./useWorkspace", () => ({ useWorkspace: () => ({ grant: state.grant }) }));
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root;
let first: ReturnType<typeof useBookmarkMetadata>;
let second: ReturnType<typeof useBookmarkMetadata>;
function Probe() {
  first = useBookmarkMetadata();
  second = useBookmarkMetadata();
  return null;
}
async function render() {
  await act(async () => root.render(<Probe />));
}
beforeEach(() => {
  state.grant = { handle: null, id: null, permission: "denied" };
  vi.stubGlobal("BroadcastChannel", undefined);
  root = createRoot(document.createElement("div"));
});
afterEach(async () => {
  await act(async () => root.unmount());
  vi.unstubAllGlobals();
});

it("uses workspace files for all consumers without reading legacy extension metadata", async () => {
  const fixture = workspaceFixture();
  const get = vi.fn();
  vi.stubGlobal("chrome", { storage: { local: { get } } });
  state.grant = { handle: fixture.handle, id: "fixture", permission: "granted" };
  await render();
  await act(async () => {
    await Promise.all([
      first.update("a", { favorites: true }),
      second.update("b", { description: "Synthetic" }),
    ]);
  });
  expect(first.metadata.a?.favorites).toBe(true);
  expect(second.metadata.b?.description).toBe("Synthetic");
  expect(first.metadata).toEqual(second.metadata);
  expect(get).not.toHaveBeenCalled();
});

it("clears metadata across workspace changes and disconnection", async () => {
  const original = workspaceFixture();
  state.grant = { handle: original.handle, id: "first", permission: "granted" };
  await render();
  await act(async () => first.update("a", { favorites: true }));
  state.grant = { handle: workspaceFixture().handle, id: "second", permission: "granted" };
  await render();
  expect(first.metadata).toEqual({});
  state.grant = { handle: null, id: null, permission: "denied" };
  await render();
  expect(first.available).toBe(false);
  expect(first.metadata).toEqual({});
  await expect(first.update("a", { favorites: true })).rejects.toThrow("Connect a workspace");
});

it("surfaces malformed sidecars instead of reporting a valid empty state", async () => {
  const fixture = workspaceFixture({ ".startspace/bookmark-metadata.json": "broken" });
  state.grant = { handle: fixture.handle, id: "fixture", permission: "granted" };
  await render();
  expect(first.error).toBeTruthy();
  expect(first.loading).toBe(false);
  expect(fixture.files.get(".startspace/bookmark-metadata.json")).toBe("broken");
});
