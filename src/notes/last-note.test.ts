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
import { readDraft, writeDraft } from "./draft-recovery";
import { readNote } from "./notes-workspace";

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

describe("unsaved note recovery", () => {
  beforeEach(() => vi.stubGlobal("indexedDB", new IDBFactory()));
  afterEach(() => vi.unstubAllGlobals());

  it("isolates drafts by workspace and clears only the saved workspace", async () => {
    const draft = {
      version: 1 as const,
      noteId: "notes/plan.md",
      baseline: "before",
      content: "after",
    };
    await writeDraft("first", draft);
    expect(await readDraft("first")).toEqual(draft);
    expect(await readDraft("second")).toBeNull();
    await writeDraft("second", { ...draft, content: "other" });
    await writeDraft("first", null);
    expect(await readDraft("first")).toBeNull();
    expect((await readDraft("second"))?.content).toBe("other");
  });

  it("serializes edits and cleanup, ignoring invalid or clean records", async () => {
    const first = {
      version: 1 as const,
      noteId: "plan.md",
      baseline: "disk",
      content: "first",
    };
    const writes = [
      writeDraft("workspace", first),
      writeDraft("workspace", { ...first, content: "latest" }),
    ];
    await Promise.all(writes);
    expect((await readDraft("workspace"))?.content).toBe("latest");
    await Promise.all([
      writeDraft("workspace", first),
      writeDraft("workspace", null),
    ]);
    expect(await readDraft("workspace")).toBeNull();
    await writeDraft("workspace", { ...first, noteId: "../outside.md" });
    expect(await readDraft("workspace")).toBeNull();
    await writeDraft("workspace", { ...first, content: "disk" });
    expect(await readDraft("workspace")).toBeNull();
  });

  it("retains the recovery copy when a note is deleted or access is revoked", async () => {
    const draft = {
      version: 1 as const,
      noteId: "plan.md",
      baseline: "disk",
      content: "unsaved",
    };
    await writeDraft("workspace", draft);
    for (const errorName of ["NotFoundError", "NotAllowedError"]) {
      const directory = {
        getFileHandle: async () => {
          throw new DOMException("Cannot access note", errorName);
        },
      } as unknown as FileSystemDirectoryHandle;
      await expect(readNote(directory, draft.noteId)).rejects.toThrow();
      expect(await readDraft("workspace")).toEqual(draft);
    }
  });
});
