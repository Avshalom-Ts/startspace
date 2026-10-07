import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { workspaceFixture } from "../test/workspace-fixture";
import { createBackup, restoreBackup } from "./backup-service";
import { emptyBookmarkMetadata } from "../links/bookmark-metadata-model";
import { parseBackupJson, decodeBackupText } from "./backup-format";

const config = { version: 1, currentWorkspace: { id: "destination", name: "Fixture" } };
const set = vi.fn();
beforeEach(() => {
  vi.stubGlobal("__APP_VERSION__", "0.1.0");
  vi.stubGlobal("chrome", {
    storage: { local: {
      get: (_keys: string[], callback: (result: unknown) => void) => callback({ "startspace.config": config }),
      set: (items: unknown, callback: () => void) => { set(items); callback(); },
    } },
  });
  set.mockReset();
});
afterEach(() => vi.unstubAllGlobals());

it("round-trips workspace bookmark metadata without reading or writing extension metadata", async () => {
  const bookmarks = { a: { ...emptyBookmarkMetadata(), description: "Synthetic description" } };
  const source = workspaceFixture({
    ".startspace/bookmark-metadata.json": JSON.stringify({ version: 1, bookmarks }),
    ".startspace/tasks.json": '{"version":1,"tasks":[],"columns":[]}',
    "note.md": "# Synthetic",
  });
  const backup = await createBackup(source.handle, config);
  expect(backup.version).toBe(2);
  expect(backup.extension).not.toHaveProperty("bookmarkMetadata");
  const destination = workspaceFixture({ "unrelated.md": "Keep" });
  const summary = await restoreBackup(JSON.stringify(backup), destination.handle, config);
  expect(summary.bookmarkMetadataEntries).toBe(1);
  expect(destination.files.get(".startspace/bookmark-metadata.json")).toBe(source.files.get(".startspace/bookmark-metadata.json"));
  expect(destination.files.get("unrelated.md")).toBe("Keep");
  expect(set).toHaveBeenCalledWith({ "startspace.config": expect.objectContaining({ currentWorkspace: config.currentWorkspace }) });
});

it("normalizes explicit version-one restores into canonical workspace files", () => {
  const legacy = {
    kind: "startspace-backup", version: 1, createdAt: "", appVersion: "",
    extension: { config, theme: null, bookmarkMetadata: { a: { ...emptyBookmarkMetadata(), description: "Portable" } } },
    workspace: { name: "Fixture", files: [{ path: "tasks.json", encoding: "base64", content: btoa('{"tasks":[]}') }] },
  };
  const parsed = parseBackupJson(JSON.stringify(legacy));
  expect(parsed.version).toBe(2);
  expect(parsed.workspace.files.map((file) => file.path)).toEqual([
    ".startspace/tasks.json", ".startspace/bookmark-metadata.json",
  ]);
  expect(JSON.parse(decodeBackupText(parsed.workspace.files[1]!)).bookmarks.a.description).toBe("Portable");
  legacy.workspace.files.push({ path: ".startspace/tasks.json", encoding: "base64", content: btoa('{"tasks":[]}') });
  expect(() => parseBackupJson(JSON.stringify(legacy))).toThrow("Both legacy");
});

it("preserves automatic-fetch settings in backup parsing", () => {
  const value = {
    kind: "startspace-backup", version: 2, createdAt: "", appVersion: "",
    extension: { config: { ...config, preferences: { fetchDescriptionOnNewTab: false } }, theme: null },
    workspace: { name: "Fixture", files: [] },
  };
  expect(parseBackupJson(JSON.stringify(value)).extension.config.preferences?.fetchDescriptionOnNewTab).toBe(false);
});
