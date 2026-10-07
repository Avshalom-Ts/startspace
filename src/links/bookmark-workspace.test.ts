import { expect, it } from "vitest";
import { workspaceFixture } from "../test/workspace-fixture";
import { emptyBookmarkMetadata, parseBookmarkDocument } from "./bookmark-metadata-model";
import { readBookmarkMetadata, updateBookmarkMetadata } from "./bookmark-workspace";

it("reads missing metadata without creating a file and writes a versioned sidecar", async () => {
  const fixture = workspaceFixture();
  expect(await readBookmarkMetadata(fixture.handle)).toEqual({ version: 1, bookmarks: {} });
  expect(fixture.files.size).toBe(0);
  await updateBookmarkMetadata(fixture.handle, "fixture", (document) => ({
    ...document, bookmarks: { b: { ...emptyBookmarkMetadata(), description: "Editable", favorites: true } },
  }));
  expect((await readBookmarkMetadata(fixture.handle)).bookmarks.b?.description).toBe("Editable");
  expect(fixture.files.has(".startspace/bookmark-metadata.json")).toBe(true);
});

it("rejects malformed metadata without overwriting and validates optional fields", async () => {
  const fixture = workspaceFixture({ ".startspace/bookmark-metadata.json": "invalid" });
  await expect(updateBookmarkMetadata(fixture.handle, "fixture", (document) => document)).rejects.toThrow();
  expect(fixture.files.get(".startspace/bookmark-metadata.json")).toBe("invalid");
  expect(() => parseBookmarkDocument({ version: 2, bookmarks: {} })).toThrow();
  expect(() => parseBookmarkDocument({ version: 1, bookmarks: { b: { ...emptyBookmarkMetadata(), description: 42 } } })).toThrow();
});

it("serializes independent updates and isolates workspaces", async () => {
  const fixture = workspaceFixture();
  const other = workspaceFixture();
  await Promise.all(["a", "b"].map((id) => updateBookmarkMetadata(fixture.handle, "fixture", (document) => ({
    ...document, bookmarks: { ...document.bookmarks, [id]: emptyBookmarkMetadata() },
  }))));
  expect(Object.keys((await readBookmarkMetadata(fixture.handle)).bookmarks)).toEqual(["a", "b"]);
  expect((await readBookmarkMetadata(other.handle)).bookmarks).toEqual({});
});

it("detects external changes and preserves the externally edited file", async () => {
  const fixture = workspaceFixture({ ".startspace/bookmark-metadata.json": '{"version":1,"bookmarks":{}}' });
  let reads = 0;
  const external = JSON.stringify({ version: 1, bookmarks: { external: emptyBookmarkMetadata() } });
  fixture.onRead((path) => {
    if (++reads === 2) fixture.files.set(path, external);
  });

  await expect(updateBookmarkMetadata(fixture.handle, "fixture", (document) => ({
    ...document, bookmarks: { b: emptyBookmarkMetadata() },
  }))).rejects.toThrow("changed outside");
  expect(fixture.files.get(".startspace/bookmark-metadata.json")).toBe(external);
});

it("removes a failed initial empty file and permits a later retry", async () => {
  const fixture = workspaceFixture();
  fixture.failWrites.add(".startspace/bookmark-metadata.json");
  const change = () => ({ version: 1 as const, bookmarks: { b: emptyBookmarkMetadata() } });
  await expect(updateBookmarkMetadata(fixture.handle, "fixture", change)).rejects.toThrow("disk failure");
  expect(fixture.files.has(".startspace/bookmark-metadata.json")).toBe(false);
  fixture.failWrites.clear();
  await updateBookmarkMetadata(fixture.handle, "fixture", change);
  expect((await readBookmarkMetadata(fixture.handle)).bookmarks.b).toBeDefined();
});
