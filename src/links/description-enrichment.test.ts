import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { workspaceFixture } from "../test/workspace-fixture";
import { installLocks } from "../test/locks-fixture";
import { emptyBookmarkMetadata } from "./bookmark-metadata-model";
import { readBookmarkMetadata, updateBookmarkMetadata } from "./bookmark-workspace";
import { enrichDescription } from "./description-enrichment";
import { setDescriptionEditing } from "./description-editing";

const nodes = [
  { id: "a", title: "A", url: "https://example.com/a" },
  { id: "b", title: "B", url: "https://example.com/b" },
];
const network = vi.fn();
const permission = vi.fn();

beforeEach(() => {
  installLocks();
  permission.mockReset().mockResolvedValue(true);
  vi.stubGlobal("chrome", { permissions: { contains: permission } });
  network.mockReset().mockImplementation(async () => new Response('<meta name="description" content="Fetched">', {
    headers: { "content-type": "text/html" },
  }));
  vi.stubGlobal("fetch", network);
});
afterEach(() => { setDescriptionEditing("a", false); vi.unstubAllGlobals(); });

function options(description?: string) {
  const fixture = workspaceFixture(description === undefined ? {} : {
    ".startspace/bookmark-metadata.json": JSON.stringify({
      version: 1, bookmarks: { a: { ...emptyBookmarkMetadata(), description } },
    }),
  });
  const controller = new AbortController();
  const value = {
    workspace: fixture.handle, workspaceId: "fixture", manual: false,
    signal: controller.signal, isCurrent: () => true,
    getTree: async () => nodes,
    getBookmark: async (id: string) => nodes.find((node) => node.id === id) ?? null,
  };
  return { fixture, value, controller };
}

it("fetches exactly one missing description per pass and skips existing text", async () => {
  const { fixture, value } = options("Keep any existing description");
  expect(await enrichDescription(value)).toBe(true);
  expect(network).toHaveBeenCalledOnce();
  const result = (await readBookmarkMetadata(fixture.handle)).bookmarks;
  expect(result.a?.description).toBe("Keep any existing description");
  expect(result.b?.description).toBe("Fetched");
  expect(await enrichDescription(value)).toBe(false);
  expect(network).toHaveBeenCalledOnce();
});

it("manual fetch replaces existing text directly and allows retrying a failure", async () => {
  const { fixture, value } = options("Description fetch failed: earlier attempt");
  await enrichDescription({ ...value, manual: true, bookmarkId: "a" });
  expect((await readBookmarkMetadata(fixture.handle)).bookmarks.a?.description).toBe("Fetched");
});

it("writes a failed attempt into the description so later automatic passes skip it", async () => {
  const { fixture, value } = options();
  network.mockRejectedValueOnce(new Error("Synthetic network failure"));
  await expect(enrichDescription(value)).rejects.toThrow("Synthetic network failure");
  expect((await readBookmarkMetadata(fixture.handle)).bookmarks.a?.description).toContain("Description fetch failed");
  await enrichDescription(value);
  expect(network.mock.calls[1]?.[0]).toBe(nodes[1]!.url);
});

it("does not write a failure message when permission is absent", async () => {
  const { fixture, value } = options();
  permission.mockResolvedValue(false);
  expect(await enrichDescription(value)).toBe(false);
  await expect(enrichDescription({ ...value, manual: true, bookmarkId: "a" })).rejects.toThrow("Grant website access");
  expect(network).not.toHaveBeenCalled();
  expect(fixture.files.size).toBe(0);
});

it("allows only one active startup attempt across tabs", async () => {
  const { fixture, value } = options();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  network.mockImplementation(async () => {
    await gate;
    return new Response('<meta name="description" content="Fetched">', { headers: { "content-type": "text/html" } });
  });
  const first = enrichDescription(value);
  expect(await enrichDescription({ ...value })).toBe(false);
  release();
  await first;
  expect(network).toHaveBeenCalledOnce();
  expect(Object.keys((await readBookmarkMetadata(fixture.handle)).bookmarks)).toEqual(["a"]);
});

it("preserves descriptions edited while the request is in flight", async () => {
  const { fixture, value } = options();
  network.mockImplementation(async () => {
    await updateBookmarkMetadata(fixture.handle, "fixture", (document) => ({
      ...document, bookmarks: { a: { ...emptyBookmarkMetadata(), description: "New manual edit" } },
    }));
    return new Response('<meta name="description" content="Fetched">', { headers: { "content-type": "text/html" } });
  });
  await expect(enrichDescription(value)).rejects.toThrow("Description changed");
  expect((await readBookmarkMetadata(fixture.handle)).bookmarks.a?.description).toBe("New manual edit");
});

it("preserves unsaved editor input instead of applying a result", async () => {
  const { fixture, value } = options();
  network.mockImplementation(async () => {
    setDescriptionEditing("a", true);
    return new Response('<meta name="description" content="Fetched">', { headers: { "content-type": "text/html" } });
  });
  await expect(enrichDescription(value)).rejects.toThrow("Description changed");
  expect((await readBookmarkMetadata(fixture.handle)).bookmarks).toEqual({});
});

it.each(["workspace", "url", "deleted", "permission", "abort"])("does not apply stale results after %s changes", async (kind) => {
  const { fixture, value, controller } = options();
  let active = true;
  let url = nodes[0]!.url;
  let deleted = false;
  network.mockImplementation(async () => {
    if (kind === "workspace") active = false;
    if (kind === "url") url = "https://example.org/changed";
    if (kind === "deleted") deleted = true;
    if (kind === "permission") permission.mockResolvedValue(false);
    if (kind === "abort") controller.abort();
    return new Response('<meta name="description" content="Fetched">', { headers: { "content-type": "text/html" } });
  });
  expect(await enrichDescription({
    ...value, isCurrent: () => active,
    getBookmark: async () => deleted ? null : { ...nodes[0]!, url },
  })).toBe(false);
  expect(fixture.files.size).toBe(0);
});
