// Verifies that remembered note paths stay device-local and isolated by
// workspace registration, including same-named directories.
import { IDBFactory } from "fake-indexeddb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  loadPersistedHandle,
  persistHandle,
  registerHandle,
} from "../hooks/useWorkspace";
import { readLastNote, writeLastNote } from "./last-note";

class TestDirectory {
  kind = "directory" as const;
  name = "Same name";
  constructor(readonly key: string) {}
  async isSameEntry(other: TestDirectory) {
    return this.key === other.key;
  }
}

describe("last opened note", () => {
  beforeEach(() => {
    vi.stubGlobal("indexedDB", new IDBFactory());
  });
  afterEach(() => vi.unstubAllGlobals());

  it("keeps same-named workspaces separate and reuses a returning directory's ID", async () => {
    const first = new TestDirectory(
      "first",
    ) as unknown as FileSystemDirectoryHandle;
    const second = new TestDirectory(
      "second",
    ) as unknown as FileSystemDirectoryHandle;
    const firstRegistration = await registerHandle(first);
    await persistHandle(firstRegistration);
    const secondRegistration = await registerHandle(second);
    await persistHandle(secondRegistration);
    expect(secondRegistration.id).not.toBe(firstRegistration.id);

    const returning = await registerHandle(
      new TestDirectory("first") as unknown as FileSystemDirectoryHandle,
    );
    expect(returning.id).toBe(firstRegistration.id);
    expect((await loadPersistedHandle())?.id).toBe(secondRegistration.id);

    await writeLastNote(firstRegistration.id, "Projects/plan.md");
    await writeLastNote(secondRegistration.id, "note.md");
    expect(await readLastNote(firstRegistration.id)).toBe("Projects/plan.md");
    expect(await readLastNote(secondRegistration.id)).toBe("note.md");
    await writeLastNote(firstRegistration.id, null);
    expect(await readLastNote(firstRegistration.id)).toBeNull();
    expect(await readLastNote(secondRegistration.id)).toBe("note.md");
  });

  it("ignores malformed and unknown versions", async () => {
    await writeLastNote("workspace", "../outside.md");
    expect(await readLastNote("workspace")).toBeNull();
  });
});
