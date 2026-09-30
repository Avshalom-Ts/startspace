// Guards real Markdown writes against conflicting content and failed writes.
import { afterEach, describe, expect, it, vi } from "vitest";
import { createNote, writeNote } from "./notes-workspace";

/** Minimal granted file handle; all content is synthetic and in-memory. */
function workspace(content: string, failWrite = false) {
  const write = vi.fn(async (_value: string) => {
    if (failWrite) throw new DOMException("Denied", "NotAllowedError");
  });
  const close = vi.fn(async () => {});
  const abort = vi.fn(async () => {});
  const createWritable = vi.fn(async () => ({ write, close, abort }));
  const file = {
    getFile: async () => ({ text: async () => content, lastModified: 0 }),
    createWritable,
  };
  const handle = {
    getFileHandle: async () => file,
  } as unknown as FileSystemDirectoryHandle;
  return { handle, createWritable, write, close, abort };
}
describe("guarded note save", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("serializes two tabs and refuses the stale writer", async () => {
    let disk = "Original";
    let writes = 0;
    const handle = {
      getFileHandle: async () => ({
        getFile: async () => ({ text: async () => disk, lastModified: 0 }),
        createWritable: async () => {
          let next = "";
          return {
            write: async (text: string) => {
              next = text;
            },
            close: async () => {
              disk = next;
              writes++;
            },
            abort: async () => undefined,
          };
        },
      }),
    } as unknown as FileSystemDirectoryHandle;
    const tails = new Map<string, Promise<void>>();
    const request = async <T>(
      name: string,
      operation: () => Promise<T>,
    ): Promise<T> => {
      const previous = tails.get(name) ?? Promise.resolve();
      let release!: () => void;
      const next = new Promise<void>((resolve) => {
        release = resolve;
      });
      tails.set(name, next);
      await previous;
      try {
        return await operation();
      } finally {
        release();
      }
    };
    vi.stubGlobal("navigator", { locks: { request } });
    const results = await Promise.allSettled([
      writeNote(handle, "note.md", "First tab", "Original"),
      writeNote(handle, "note.md", "Second tab", "Original"),
    ]);
    expect(results[0]?.status).toBe("fulfilled");
    expect(results[1]).toMatchObject({
      status: "rejected",
      reason: expect.objectContaining({
        message: expect.stringContaining("changed on disk"),
      }),
    });
    expect(disk).toBe("First tab");
    expect(writes).toBe(1);
  });

  it("aborts the temporary write when an external editor changes the file mid-save", async () => {
    let disk = "Original";
    const abort = vi.fn(async () => undefined);
    const close = vi.fn(async () => {
      disk = "Draft";
    });
    const handle = {
      getFileHandle: async () => ({
        getFile: async () => ({ text: async () => disk, lastModified: 0 }),
        createWritable: async () => ({
          write: async () => {
            disk = "External";
          },
          close,
          abort,
        }),
      }),
    } as unknown as FileSystemDirectoryHandle;
    await expect(
      writeNote(handle, "note.md", "Draft", "Original"),
    ).rejects.toThrow("changed on disk while saving");
    expect(abort).toHaveBeenCalledOnce();
    expect(close).not.toHaveBeenCalled();
    expect(disk).toBe("External");
  });

  it("keeps both the disk version and a new draft copy without overwriting collisions", async () => {
    const files = new Map<string, string>([["note.md", "External version"]]);
    const handle = {
      getFileHandle: async (name: string, options?: { create?: boolean }) => {
        if (!files.has(name)) {
          if (!options?.create)
            throw new DOMException("Missing", "NotFoundError");
          files.set(name, "");
        }
        return {
          getFile: async () => ({
            text: async () => files.get(name),
            lastModified: 0,
          }),
          createWritable: async () => {
            let content = "";
            return {
              write: async (text: string) => {
                content = text;
              },
              close: async () => {
                files.set(name, content);
              },
              abort: async () => undefined,
            };
          },
        };
      },
    } as unknown as FileSystemDirectoryHandle;
    await createNote(handle, "", "note copy.md", "Recovered draft");
    expect(files.get("note.md")).toBe("External version");
    expect(files.get("note copy.md")).toBe("Recovered draft");
    await expect(
      createNote(handle, "", "note copy.md", "Another copy"),
    ).rejects.toThrow("already exists");
    expect(files.get("note copy.md")).toBe("Recovered draft");
  });

  it("refuses to open a writable stream when the disk version changed", async () => {
    const disk = workspace("External version");
    await expect(
      writeNote(disk.handle, "note.md", "Draft", "Original version"),
    ).rejects.toThrow("changed on disk");
    expect(disk.createWritable).not.toHaveBeenCalled();
  });
  it("aborts a failed write and does not report a successful close", async () => {
    const disk = workspace("Original", true);
    await expect(
      writeNote(disk.handle, "note.md", "Draft", "Original"),
    ).rejects.toThrow("Denied");
    expect(disk.abort).toHaveBeenCalledOnce();
    expect(disk.close).not.toHaveBeenCalled();
  });
});
