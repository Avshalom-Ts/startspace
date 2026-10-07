import { expect, it, vi } from "vitest";
import { workspaceFixture } from "../test/workspace-fixture";
import { readTasks, setTaskBookmarkLink, writeTasks } from "./task-workspace";

it("creates tasks only under .startspace and reads the relocated file", async () => {
  const fixture = workspaceFixture();
  const empty = await readTasks(fixture.handle);
  await writeTasks(fixture.handle, empty);
  expect(fixture.files.has("tasks.json")).toBe(false);
  expect(await readTasks(fixture.handle)).toEqual(empty);
});

it("warns about a legacy root file without overwriting it", async () => {
  const fixture = workspaceFixture({ "tasks.json": '{"tasks":[]}' });
  await expect(readTasks(fixture.handle)).rejects.toThrow("Move tasks.json");
  await expect(writeTasks(fixture.handle, { version: 1, tasks: [], columns: [] })).rejects.toThrow("Move tasks.json");
  expect(fixture.files.get("tasks.json")).toBe('{"tasks":[]}');
  expect(fixture.files.has(".startspace/tasks.json")).toBe(false);
});

it("prefers the canonical task file and preserves it on write failure", async () => {
  const fixture = workspaceFixture({
    "tasks.json": "legacy",
    ".startspace/tasks.json": '{"version":1,"tasks":[],"columns":[]}',
  });
  expect((await readTasks(fixture.handle)).tasks).toEqual([]);
  fixture.failWrites.add(".startspace/tasks.json");
  await expect(writeTasks(fixture.handle, { version: 1, tasks: [], columns: [] })).rejects.toThrow("disk failure");
  expect(fixture.files.get(".startspace/tasks.json")).toBe('{"version":1,"tasks":[],"columns":[]}');
});

it("links and unlinks a bookmark without changing other task fields", async () => {
  const task = {
    id: "task-1",
    title: "Review release",
    description: "Keep this description",
    status: "in-progress",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    noteIds: ["note.md"],
    bookmarkIds: [],
  };
  const fixture = workspaceFixture({
    ".startspace/tasks.json": JSON.stringify({
      version: 1,
      columns: [{ id: "todo", title: "To do", visible: true }],
      tasks: [task],
    }),
  });

  const linked = await setTaskBookmarkLink(
    fixture.handle,
    task.id,
    "bookmark-1",
    true,
  );
  expect(linked.tasks[0]).toMatchObject({
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    createdAt: task.createdAt,
    noteIds: task.noteIds,
    bookmarkIds: ["bookmark-1"],
  });
  expect(linked.tasks[0]?.updatedAt).not.toBe(task.updatedAt);
  const unlinked = await setTaskBookmarkLink(
    fixture.handle,
    task.id,
    "bookmark-1",
    false,
  );
  expect(unlinked.tasks[0]).toMatchObject({
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    createdAt: task.createdAt,
    noteIds: task.noteIds,
    bookmarkIds: [],
  });
});

it("rejects a task file changed while the relationship write is staged", async () => {
  const initial = JSON.stringify({
    version: 1,
    columns: [],
    tasks: [{
      id: "task-1",
      title: "Review release",
      description: "",
      status: "todo",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      noteIds: [],
      bookmarkIds: [],
    }],
  });
  let disk = initial;
  const abort = vi.fn(async () => undefined);
  const close = vi.fn(async () => undefined);
  const handle = {
    getDirectoryHandle: async () => ({
      getFileHandle: async () => ({
        getFile: async () => ({ text: async () => disk }),
        createWritable: async () => ({
          write: async () => {
            disk = `${initial}\n`;
          },
          close,
          abort,
        }),
      }),
    }),
  } as unknown as FileSystemDirectoryHandle;

  await expect(
    setTaskBookmarkLink(handle, "task-1", "bookmark-1", true),
  ).rejects.toThrow("tasks.json changed outside StartSpace");
  expect(abort).toHaveBeenCalledOnce();
  expect(close).not.toHaveBeenCalled();
  expect(disk).toBe(`${initial}\n`);
});

it("refuses task-board writes based on a stale document", async () => {
  const stored = {
    version: 1 as const,
    columns: [],
    tasks: [{
      id: "task-1",
      title: "Changed elsewhere",
      description: "",
      status: "todo",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
      noteIds: [],
      bookmarkIds: ["bookmark-1"],
    }],
  };
  const stale = {
    ...stored,
    tasks: [{
      ...stored.tasks[0]!,
      title: "Old task title",
      bookmarkIds: [],
    }],
  };
  const fixture = workspaceFixture({
    ".startspace/tasks.json": JSON.stringify(stored),
  });

  await expect(
    writeTasks(fixture.handle, stale, {
      version: 1,
      columns: [],
      tasks: [{
        ...stored.tasks[0]!,
        title: "Old task title",
        updatedAt: "2026-01-01T00:00:00.000Z",
        bookmarkIds: [],
      }],
    }),
  ).rejects.toThrow("tasks.json changed outside StartSpace");
  expect(JSON.parse(fixture.files.get(".startspace/tasks.json")!)).toEqual(stored);
});
