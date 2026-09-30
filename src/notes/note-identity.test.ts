// Pure migration checks: existing links keep their identity across path changes.
import { describe, expect, it } from "vitest";
import {
  forgetNoteIdentity,
  matchesNoteReference,
  migrateNoteReferences,
  parseNoteIdentities,
  reconcileNoteIdentities,
  relocateNoteIdentity,
  relocateNoteFolder,
  stableNoteReference,
  ensureNoteIdentities,
  readNoteIdentities,
  updateNoteIdentities,
} from "./note-identity";
import { convertNoteEdges, migrateNoteEdges } from "./note-link-migration";
import type { TasksDocument } from "../tasks/tasks-model";
import type { BookmarkMetadata } from "../hooks/useFavorites";

const firstId = "note-00000000-0000-4000-8000-000000000001";
const secondId = "note-00000000-0000-4000-8000-000000000002";

describe("note identities", () => {
  it("preserves existing IDs when new paths appear or old files are absent", () => {
    const original = {
      version: 1 as const,
      notes: { [firstId]: "old.md" },
      aliases: {},
    };
    const next = reconcileNoteIdentities(original, ["new.md"], () => secondId);
    expect(next.notes).toEqual({ [firstId]: "old.md", [secondId]: "new.md" });
    expect(original.notes).toEqual({ [firstId]: "old.md" });
    expect(stableNoteReference(next, "old.md")).toBe(firstId);
    expect(stableNoteReference(next, "missing.md")).toBe("missing.md");
  });

  it("moves a path without changing the ID and rejects collisions", () => {
    const original = {
      version: 1 as const,
      notes: { [firstId]: "old.md", [secondId]: "taken.md" },
      aliases: {},
    };
    const moved = relocateNoteIdentity(original, "old.md", "folder/new.md");
    expect(moved.notes[firstId]).toBe("folder/new.md");
    expect(stableNoteReference(moved, "old.md")).toBe(firstId);
    expect(
      migrateNoteReferences(moved, ["old.md", firstId, "missing.md"]),
    ).toEqual([firstId, "missing.md"]);
    expect(
      relocateNoteIdentity(moved, "folder/new.md", "old.md").notes[firstId],
    ).toBe("old.md");
    expect(
      matchesNoteReference("old.md", "folder/new.md", firstId, moved.aliases),
    ).toBe(true);
    expect(
      matchesNoteReference(firstId, "folder/new.md", firstId, moved.aliases),
    ).toBe(true);
    expect(
      matchesNoteReference("other.md", "folder/new.md", firstId, moved.aliases),
    ).toBe(false);
    expect(() => relocateNoteIdentity(original, "old.md", "taken.md")).toThrow(
      "collision",
    );
    expect(() =>
      reconcileNoteIdentities(original, ["fresh.md"], () => firstId),
    ).toThrow("collision");
    expect(original.notes[firstId]).toBe("old.md");
  });

  it("rejects duplicate paths, unsafe paths and unknown schema versions", () => {
    expect(() =>
      parseNoteIdentities({ version: 2, notes: {}, aliases: {} }),
    ).toThrow();
    expect(() =>
      parseNoteIdentities({
        version: 1,
        notes: { [firstId]: "a.md", [secondId]: "a.md" },
        aliases: {},
      }),
    ).toThrow();
    expect(() =>
      parseNoteIdentities({
        version: 1,
        notes: { [firstId]: "../escape.md" },
        aliases: {},
      }),
    ).toThrow();
  });

  it("preserves nested note identities when their folder is renamed", () => {
    const original = {
      version: 1 as const,
      notes: { [firstId]: "work/a.md", [secondId]: "work/nested/b.md" },
      aliases: {},
    };
    const renamed = relocateNoteFolder(original, "work", "projects");
    expect(relocateNoteFolder(original, "work", "work")).toEqual(original);
    expect(renamed.notes).toEqual({
      [firstId]: "projects/a.md",
      [secondId]: "projects/nested/b.md",
    });
    expect(stableNoteReference(renamed, "work/nested/b.md")).toBe(secondId);
    expect(original.notes[firstId]).toBe("work/a.md");
  });

  it("does not attach a deleted note's ID to a replacement with the same name", () => {
    const original = {
      version: 1 as const,
      notes: { [firstId]: "old.md" },
      aliases: {},
    };
    const deleted = forgetNoteIdentity(original, "old.md");
    expect(
      reconcileNoteIdentities(deleted, ["old.md"], () => secondId).notes,
    ).toEqual({ [secondId]: "old.md" });
    expect(original.notes[firstId]).toBe("old.md");
  });
});

/** Simulates the read/write transaction of the workspace metadata sidecar. */
function identityWorkspace() {
  let contents: string | null = null;
  let failWrite = false;
  const directory = {
    getFileHandle: async (_name: string, options?: { create?: boolean }) => {
      if (contents === null) {
        if (!options?.create)
          throw new DOMException("Missing", "NotFoundError");
        contents = "";
      }
      return {
        getFile: async () => ({ text: async () => contents }),
        createWritable: async () => {
          let buffer = "";
          return {
            write: async (text: string) => {
              if (failWrite) throw new Error("Disk full");
              buffer = text;
            },
            close: async () => {
              contents = buffer;
            },
            abort: async () => undefined,
          };
        },
      } as unknown as FileSystemFileHandle;
    },
    removeEntry: async () => {
      contents = null;
    },
  };
  const workspace = {
    name: "Workspace",
    getDirectoryHandle: async (
      _name: string,
      options?: { create?: boolean },
    ) => {
      if (contents === null && !options?.create)
        throw new DOMException("Missing", "NotFoundError");
      return directory;
    },
  } as unknown as FileSystemDirectoryHandle;
  return {
    workspace,
    contents: () => contents,
    replace: (text: string) => {
      contents = text;
    },
    fail: () => {
      failWrite = true;
    },
  };
}

describe("workspace note identity sidecar", () => {
  it("reuses IDs across scans, moves, and a simulated backup reload", async () => {
    const fixture = identityWorkspace();
    const first = await ensureNoteIdentities(fixture.workspace, ["plan.md"]);
    const id = Object.keys(first.notes)[0]!;
    expect(
      (await ensureNoteIdentities(fixture.workspace, ["plan.md"])).notes[id],
    ).toBe("plan.md");
    await updateNoteIdentities(fixture.workspace, (document) =>
      relocateNoteIdentity(document, "plan.md", "notes/plan.md"),
    );
    expect(
      stableNoteReference(
        await readNoteIdentities(fixture.workspace),
        "plan.md",
      ),
    ).toBe(id);
    const restored = identityWorkspace();
    restored.replace(fixture.contents()!);
    expect((await readNoteIdentities(restored.workspace)).notes[id]).toBe(
      "notes/plan.md",
    );
  });

  it("refuses invalid metadata and preserves the old file after a failed write", async () => {
    const fixture = identityWorkspace();
    fixture.replace('{"version":2,"notes":{}}');
    await expect(
      ensureNoteIdentities(fixture.workspace, ["plan.md"]),
    ).rejects.toThrow();
    expect(fixture.contents()).toBe('{"version":2,"notes":{}}');
    fixture.replace(
      JSON.stringify({
        version: 1,
        notes: { [firstId]: "plan.md" },
        aliases: {},
      }),
    );
    fixture.fail();
    await expect(
      updateNoteIdentities(fixture.workspace, (document) =>
        relocateNoteIdentity(document, "plan.md", "new.md"),
      ),
    ).rejects.toThrow("Disk full");
    expect((await readNoteIdentities(fixture.workspace)).notes[firstId]).toBe(
      "plan.md",
    );
  });

  it("removes a newly created sidecar after its first write fails", async () => {
    const fixture = identityWorkspace();
    fixture.fail();
    await expect(
      ensureNoteIdentities(fixture.workspace, ["plan.md"]),
    ).rejects.toThrow("Disk full");
    expect(fixture.contents()).toBeNull();
  });
});

describe("legacy relationship migration", () => {
  const identities = {
    version: 1 as const,
    notes: { [firstId]: "notes/plan.md" },
    aliases: { "plan.md": firstId },
  };
  const tasks: TasksDocument = {
    version: 1,
    columns: [],
    tasks: [
      {
        id: "task",
        title: "Task",
        description: "",
        status: "todo",
        noteIds: ["plan.md", firstId, "missing.md"],
        bookmarkIds: [],
        createdAt: "",
        updatedAt: "",
      },
    ],
  };
  const bookmarks: Record<string, BookmarkMetadata> = {
    b: {
      favorites: false,
      tags: [],
      dateAdded: "",
      relatedNotes: ["plan.md"],
      relatedTasks: [],
    },
  };

  it("converts task and bookmark edges once without dropping missing targets", () => {
    const converted = convertNoteEdges(identities, tasks, bookmarks);
    expect(converted.nextTasks.tasks[0]?.noteIds).toEqual([
      firstId,
      "missing.md",
    ]);
    expect(converted.nextBookmarks.b?.relatedNotes).toEqual([firstId]);
    expect(tasks.tasks[0]?.noteIds).toEqual(["plan.md", firstId, "missing.md"]);
    expect(
      convertNoteEdges(
        identities,
        converted.nextTasks,
        converted.nextBookmarks,
      ),
    ).toEqual(converted);
  });

  it("restores the original task document if browser metadata write fails", async () => {
    let content = JSON.stringify(tasks);
    const workspace = {
      getFileHandle: async () => ({
        getFile: async () => ({ text: async () => content }),
        createWritable: async () => {
          let next = "";
          return {
            write: async (text: string) => {
              next = text;
            },
            close: async () => {
              content = next;
            },
            abort: async () => undefined,
          };
        },
      }),
    } as unknown as FileSystemDirectoryHandle;
    const storage = {
      get: async () => ({ "startspace.bookmarkMetadata": bookmarks }),
      set: async () => {
        throw new Error("Storage failed");
      },
    } as unknown as Pick<chrome.storage.StorageArea, "get" | "set">;
    await expect(
      migrateNoteEdges(workspace, identities, storage),
    ).rejects.toThrow("Storage failed");
    expect(JSON.parse(content)).toEqual(tasks);
    let savedBookmarks = bookmarks;
    let writes = 0;
    const workingStorage = {
      get: async () => ({ "startspace.bookmarkMetadata": savedBookmarks }),
      set: async (value: Record<string, Record<string, BookmarkMetadata>>) => {
        savedBookmarks = value["startspace.bookmarkMetadata"]!;
        writes++;
      },
    } as unknown as Pick<chrome.storage.StorageArea, "get" | "set">;
    await migrateNoteEdges(workspace, identities, workingStorage);
    expect((JSON.parse(content) as TasksDocument).tasks[0]?.noteIds).toEqual([
      firstId,
      "missing.md",
    ]);
    expect(savedBookmarks.b?.relatedNotes).toEqual([firstId]);
    await migrateNoteEdges(workspace, identities, workingStorage);
    expect(writes).toBe(1);
  });
});
