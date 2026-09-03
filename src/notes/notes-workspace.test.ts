// notes-workspace.test.ts
//
// Covers workspace scanning behavior with a minimal in-memory implementation
// of the File System Access API surface used by the Notes feature.

import { describe, expect, it } from "vitest";
import { scanWorkspace } from "./notes-workspace";

interface TestFile {
  content: string;
  kind: "file";
  name: string;
}

interface TestDirectory {
  children: Array<TestDirectory | TestFile>;
  kind: "directory";
  name: string;
}

/** Creates the File System Access API subset needed by workspace scanning. */
function directoryHandle(directory: TestDirectory): FileSystemDirectoryHandle {
  const entries = directory.children.map((child) =>
    child.kind === "directory"
      ? directoryHandle(child)
      : ({
          kind: "file",
          name: child.name,
          getFile: async () => ({
            lastModified: 0,
            text: async () => child.content,
          }),
        } as unknown as FileSystemFileHandle),
  );

  return {
    kind: "directory",
    name: directory.name,
    values: () =>
      (async function* () {
        yield* entries;
      })(),
    getDirectoryHandle: async (name: string) => {
      const entry = entries.find(
        (candidate) => candidate.kind === "directory" && candidate.name === name,
      );
      if (!entry) throw new DOMException("Missing directory", "NotFoundError");
      return entry as FileSystemDirectoryHandle;
    },
    getFileHandle: async (name: string) => {
      const entry = entries.find(
        (candidate) => candidate.kind === "file" && candidate.name === name,
      );
      if (!entry) throw new DOMException("Missing file", "NotFoundError");
      return entry as FileSystemFileHandle;
    },
  } as unknown as FileSystemDirectoryHandle;
}

describe("workspace scanning", () => {
  it("hides dotfiles and dot-directories from the notes tree", async () => {
    const workspace = directoryHandle({
      kind: "directory",
      name: "Workspace",
      children: [
        { kind: "file", name: "visible.md", content: "# Visible" },
        { kind: "file", name: ".private.md", content: "# Private" },
        {
          kind: "directory",
          name: ".obsidian",
          children: [
            { kind: "file", name: "plugin.md", content: "# Plugin" },
          ],
        },
        {
          kind: "directory",
          name: "projects",
          children: [
            { kind: "file", name: "plan.md", content: "# Plan" },
            {
              kind: "directory",
              name: ".archive",
              children: [
                { kind: "file", name: "old.md", content: "# Old" },
              ],
            },
          ],
        },
      ],
    });

    const index = await scanWorkspace(workspace);

    expect(index.notes.map((note) => note.id)).toEqual([
      "projects/plan.md",
      "visible.md",
    ]);
    expect(index.folders.map((folder) => folder.id)).toEqual(["projects"]);
  });
});
