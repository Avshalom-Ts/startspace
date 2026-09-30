// notes-workspace.test.ts
//
// Covers workspace scanning behavior with a minimal in-memory implementation
// of the File System Access API surface used by the Notes feature.

import { describe, expect, it, vi } from "vitest";
import {
  deleteImage,
  deleteFolder,
  moveImage,
  moveNote,
  readWorkspaceImage,
  renameFolder,
  renameNote,
  scanWorkspace,
} from "./notes-workspace";

interface TestFile {
  content: string;
  kind: "file";
  name: string;
}

/** Mutable directory fixture for testing binary copy and deletion. */
function imageWorkspace(corruptWrites = false) {
  const files = new Map<string, Uint8Array>([
    ["photo.png", new Uint8Array([0, 255, 42])],
  ]);
  const moved = new Map<string, Uint8Array>();
  const handle = (
    entries: Map<string, Uint8Array>,
    name: string,
  ): FileSystemDirectoryHandle =>
    ({
      name,
      getFileHandle: async (
        fileName: string,
        options?: { create?: boolean },
      ) => {
        if (!entries.has(fileName)) {
          if (!options?.create)
            throw new DOMException("Missing", "NotFoundError");
          entries.set(fileName, new Uint8Array());
        }
        return {
          getFile: async () => ({
            arrayBuffer: async () =>
              Uint8Array.from(entries.get(fileName)!).buffer,
          }),
          createWritable: async () => ({
            write: async (file: {
              arrayBuffer: () => Promise<ArrayBuffer>;
            }) => {
              const bytes = new Uint8Array(await file.arrayBuffer());
              entries.set(fileName, corruptWrites ? bytes.slice(1) : bytes);
            },
            close: async () => undefined,
            abort: async () => undefined,
          }),
        } as unknown as FileSystemFileHandle;
      },
      removeEntry: async (fileName: string) => {
        if (!entries.delete(fileName))
          throw new DOMException("Missing", "NotFoundError");
      },
    }) as unknown as FileSystemDirectoryHandle;
  const assets = handle(moved, "assets");
  const root = {
    ...handle(files, "Workspace"),
    getDirectoryHandle: async (name: string) => {
      if (name !== "assets") throw new DOMException("Missing", "NotFoundError");
      return assets;
    },
  } as FileSystemDirectoryHandle;
  return { root, files, moved };
}

describe("image file actions", () => {
  it("moves binary bytes intact, then renames and deletes the image", async () => {
    const { root, files, moved } = imageWorkspace();
    expect(await moveImage(root, "photo.png", "assets", "photo.png")).toBe(
      "assets/photo.png",
    );
    expect(files.has("photo.png")).toBe(false);
    expect(Array.from(moved.get("photo.png")!)).toEqual([0, 255, 42]);
    expect(
      await moveImage(root, "assets/photo.png", "assets", "renamed.png"),
    ).toBe("assets/renamed.png");
    expect(moved.has("photo.png")).toBe(false);
    await deleteImage(root, "assets/renamed.png");
    expect(moved.has("renamed.png")).toBe(false);
  });

  it("keeps the source on collision, unsupported rename or invalid destination", async () => {
    const { root, files, moved } = imageWorkspace();
    moved.set("photo.png", new Uint8Array([1]));
    await expect(
      moveImage(root, "photo.png", "assets", "photo.png"),
    ).rejects.toMatchObject({ kind: "already-exists" });
    await expect(
      moveImage(root, "photo.png", "assets", "photo.svg"),
    ).rejects.toMatchObject({ kind: "invalid-path" });
    await expect(
      moveImage(root, "photo.png", "../assets", "photo.png"),
    ).rejects.toMatchObject({ kind: "invalid-path" });
    expect(Array.from(files.get("photo.png")!)).toEqual([0, 255, 42]);
    expect(Array.from(moved.get("photo.png")!)).toEqual([1]);
  });

  it("retains the source when the destination copy fails verification", async () => {
    const { root, files, moved } = imageWorkspace(true);
    await expect(
      moveImage(root, "photo.png", "assets", "photo.png"),
    ).rejects.toMatchObject({ kind: "io" });
    expect(Array.from(files.get("photo.png")!)).toEqual([0, 255, 42]);
    expect(Array.from(moved.get("photo.png")!)).toEqual([255, 42]);
  });
});

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
            arrayBuffer: async () =>
              new TextEncoder().encode(child.content).buffer,
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
        (candidate) =>
          candidate.kind === "directory" && candidate.name === name,
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
    removeEntry: vi.fn(),
  } as unknown as FileSystemDirectoryHandle;
}

describe("workspace scanning", () => {
  it("indexes supported nested images without treating them as notes", async () => {
    const workspace = directoryHandle({
      kind: "directory",
      name: "Workspace",
      children: [
        {
          kind: "directory",
          name: "assets",
          children: [
            { kind: "file", name: "photo.PNG", content: "binary" },
            { kind: "file", name: "unsafe.svg", content: "<svg/>" },
          ],
        },
      ],
    });
    const index = await scanWorkspace(workspace);
    expect(index.notes).toEqual([]);
    expect(index.images?.map((image) => image.id)).toEqual([
      "assets/photo.PNG",
    ]);
    expect(index.folders[0]?.noteCount).toBe(0);
    const blob = await readWorkspaceImage(workspace, "assets/photo.PNG");
    expect(blob.type).toBe("image/png");
    expect(await blob.text()).toBe("binary");
  });

  it("rejects escapes and unsupported images, and reports missing or denied files", async () => {
    const workspace = directoryHandle({
      kind: "directory",
      name: "Workspace",
      children: [],
    });
    await expect(
      readWorkspaceImage(workspace, "../secret.png"),
    ).rejects.toMatchObject({ kind: "invalid-path" });
    await expect(
      readWorkspaceImage(workspace, "https://host/photo.png"),
    ).rejects.toMatchObject({ kind: "invalid-path" });
    await expect(
      readWorkspaceImage(workspace, "unsafe.svg"),
    ).rejects.toMatchObject({ kind: "invalid-path" });
    await expect(
      readWorkspaceImage(workspace, "missing.png"),
    ).rejects.toMatchObject({ kind: "not-found" });
    const denied = {
      ...workspace,
      getFileHandle: async () => {
        throw new DOMException("Denied", "NotAllowedError");
      },
    } as FileSystemDirectoryHandle;
    await expect(readWorkspaceImage(denied, "photo.png")).rejects.toMatchObject(
      { name: "NotAllowedError" },
    );
  });

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
          children: [{ kind: "file", name: "plugin.md", content: "# Plugin" }],
        },
        {
          kind: "directory",
          name: "projects",
          children: [
            { kind: "file", name: "plan.md", content: "# Plan" },
            {
              kind: "directory",
              name: ".archive",
              children: [{ kind: "file", name: "old.md", content: "# Old" }],
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

describe("folder deletion", () => {
  it("rejects non-empty directories without removing them", async () => {
    const workspace = directoryHandle({
      kind: "directory",
      name: "Workspace",
      children: [
        {
          kind: "directory",
          name: "Projects",
          children: [{ kind: "file", name: "keep.txt", content: "data" }],
        },
      ],
    });
    await expect(deleteFolder(workspace, "Projects")).rejects.toThrow(
      "not empty",
    );
    expect(workspace.removeEntry).not.toHaveBeenCalled();
  });

  it("deletes an empty directory without recursion", async () => {
    const workspace = directoryHandle({
      kind: "directory",
      name: "Workspace",
      children: [{ kind: "directory", name: "Projects", children: [] }],
    });
    await deleteFolder(workspace, "Projects");
    expect(workspace.removeEntry).toHaveBeenCalledWith("Projects", {
      recursive: false,
    });
  });
});

/** Mutable nested directory fixture with File System Access copy semantics. */
function moveWorkspace() {
  let corruptFolder: string | null = null;
  const directory = (name: string) => {
    const files = new Map<string, Uint8Array>();
    const folders = new Map<string, FileSystemDirectoryHandle>();
    const handle = {
      kind: "directory" as const,
      name,
      getDirectoryHandle: async (
        child: string,
        options?: { create?: boolean },
      ) => {
        if (!folders.has(child)) {
          if (!options?.create)
            throw new DOMException("Missing", "NotFoundError");
          folders.set(child, directory(child));
        }
        return folders.get(child)!;
      },
      getFileHandle: async (
        fileName: string,
        options?: { create?: boolean },
      ) => {
        if (!files.has(fileName)) {
          if (!options?.create)
            throw new DOMException("Missing", "NotFoundError");
          files.set(fileName, new Uint8Array());
        }
        return {
          kind: "file" as const,
          name: fileName,
          getFile: async () => ({
            lastModified: 0,
            text: async () => new TextDecoder().decode(files.get(fileName)!),
            arrayBuffer: async () =>
              Uint8Array.from(files.get(fileName)!).buffer,
          }),
          createWritable: async () => {
            let bytes = new Uint8Array();
            return {
              write: async (
                value: string | { arrayBuffer: () => Promise<ArrayBuffer> },
              ) => {
                bytes =
                  typeof value === "string"
                    ? new TextEncoder().encode(value)
                    : new Uint8Array(await value.arrayBuffer());
              },
              close: async () => {
                files.set(
                  fileName,
                  name === corruptFolder ? bytes.slice(1) : bytes,
                );
              },
              abort: async () => undefined,
            };
          },
        } as unknown as FileSystemFileHandle;
      },
      values: () =>
        (async function* () {
          for (const fileName of files.keys())
            yield await handle.getFileHandle(fileName);
          for (const folder of folders.values()) yield folder;
        })(),
      removeEntry: async (entry: string) => {
        if (!files.delete(entry) && !folders.delete(entry))
          throw new DOMException("Missing", "NotFoundError");
      },
    };
    return handle as unknown as FileSystemDirectoryHandle;
  };
  return {
    root: directory("Workspace"),
    corrupt: (name: string | null) => {
      corruptFolder = name;
    },
  };
}

describe("verified note and folder moves", () => {
  it("keeps the source when the copied note differs and renames only after verification", async () => {
    const fixture = moveWorkspace();
    const original = await fixture.root.getFileHandle("plan.md", {
      create: true,
    });
    const writable = await original.createWritable();
    await writable.write("# Original");
    await writable.close();
    await fixture.root.getDirectoryHandle("archive", { create: true });
    fixture.corrupt("archive");
    await expect(
      moveNote(fixture.root, "plan.md", "archive", "plan"),
    ).rejects.toThrow("plan.md");
    expect(await (await original.getFile()).text()).toBe("# Original");
    fixture.corrupt(null);
    const renamed = await renameNote(fixture.root, "plan.md", "renamed.md");
    expect(renamed.content).toBe("# Original");
    await expect(fixture.root.getFileHandle("plan.md")).rejects.toMatchObject({
      name: "NotFoundError",
    });
  });

  it("preserves nested files on failed verification and removes the source on success", async () => {
    const fixture = moveWorkspace();
    const source = await fixture.root.getDirectoryHandle("Projects", {
      create: true,
    });
    const assets = await source.getDirectoryHandle("assets", { create: true });
    for (const [folder, name, data] of [
      [source, "note.md", "# Note"],
      [assets, "photo.png", "binary"],
    ] as const) {
      const writable = await (
        await folder.getFileHandle(name, { create: true })
      ).createWritable();
      await writable.write(data);
      await writable.close();
    }
    fixture.corrupt("Broken");
    await expect(
      renameFolder(fixture.root, "Projects", "Broken"),
    ).rejects.toThrow("Projects");
    expect(
      await (await (await source.getFileHandle("note.md")).getFile()).text(),
    ).toBe("# Note");
    fixture.corrupt(null);
    await renameFolder(fixture.root, "Projects", "Archive");
    await expect(
      fixture.root.getDirectoryHandle("Projects"),
    ).rejects.toMatchObject({ name: "NotFoundError" });
    const copied = await fixture.root.getDirectoryHandle("Archive");
    expect(
      await (
        await (
          await copied.getDirectoryHandle("assets")
        ).getFileHandle("photo.png")
      ).getFile(),
    ).toBeTruthy();
  });
});
