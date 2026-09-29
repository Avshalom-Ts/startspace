// Guards real Markdown writes against conflicting content and failed writes.
import { describe, expect, it, vi } from "vitest";
import { writeNote } from "./notes-workspace";

/** Minimal granted file handle; all content is synthetic and in-memory. */
function workspace(content: string, failWrite = false) {
  const write = vi.fn(async (_value: string) => { if (failWrite) throw new DOMException("Denied", "NotAllowedError"); });
  const close = vi.fn(async () => {});
  const abort = vi.fn(async () => {});
  const createWritable = vi.fn(async () => ({ write, close, abort }));
  const file = { getFile: async () => ({ text: async () => content, lastModified: 0 }), createWritable };
  const handle = { getFileHandle: async () => file } as unknown as FileSystemDirectoryHandle;
  return { handle, createWritable, write, close, abort };
}
describe("guarded note save", () => {
  it("refuses to open a writable stream when the disk version changed", async () => {
    const disk = workspace("External version");
    await expect(writeNote(disk.handle, "note.md", "Draft", "Original version")).rejects.toThrow("changed on disk");
    expect(disk.createWritable).not.toHaveBeenCalled();
  });
  it("aborts a failed write and does not report a successful close", async () => {
    const disk = workspace("Original", true);
    await expect(writeNote(disk.handle, "note.md", "Draft", "Original")).rejects.toThrow("Denied");
    expect(disk.abort).toHaveBeenCalledOnce();
    expect(disk.close).not.toHaveBeenCalled();
  });
});

