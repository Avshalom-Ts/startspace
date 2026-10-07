// task-workspace.ts
//
// Owns persistence for the local Kanban board. Tasks are stored as a versioned
// .startspace/tasks.json file in the user's granted workspace; browser bookmark and note
// contents are not copied into this file, only their stable IDs are linked.

import {
  DEFAULT_COLUMNS,
  type Task,
  type TaskColumn,
  type TasksDocument,
} from "./tasks-model";

const TASKS_FILE = "tasks.json";
const pendingTaskWrites = new WeakMap<
  FileSystemDirectoryHandle,
  Promise<unknown>
>();

function isNotFound(error: unknown): boolean {
  return error instanceof DOMException && error.name === "NotFoundError";
}

async function readTasksSnapshot(
  workspace: FileSystemDirectoryHandle,
): Promise<{ raw: string | null; document: TasksDocument }> {
  const raw = await readTasksRaw(workspace);
  if (raw === null)
    return {
      raw,
      document: {
        version: 1,
        columns: DEFAULT_COLUMNS.map((column) => ({ ...column })),
        tasks: [],
      },
    };
  const parsed: unknown = JSON.parse(raw);
  if (
    !parsed ||
    typeof parsed !== "object" ||
    ((parsed as { version?: unknown }).version !== undefined &&
      (parsed as { version?: unknown }).version !== 1) ||
    !Array.isArray((parsed as { tasks?: unknown }).tasks)
  )
    throw new Error("Invalid tasks.json format.");
  return {
    raw,
    document: {
      version: 1,
      columns: Array.isArray((parsed as { columns?: unknown }).columns)
        ? (parsed as { columns: TaskColumn[] }).columns
        : DEFAULT_COLUMNS.map((column) => ({ ...column })),
      tasks: (parsed as { tasks: Task[] }).tasks,
    },
  };
}

async function readTasksRaw(
  workspace: FileSystemDirectoryHandle,
): Promise<string | null> {
  let folder: FileSystemDirectoryHandle;
  try {
    folder = await workspace.getDirectoryHandle(".startspace");
  } catch (error) {
    if (!isNotFound(error)) throw error;
    try {
      await workspace.getFileHandle(TASKS_FILE);
    } catch (legacyError) {
      if (isNotFound(legacyError)) return null;
      throw legacyError;
    }
    throw new Error(
      "Move tasks.json from the workspace root into .startspace, then refresh.",
    );
  }
  try {
    const handle = await folder.getFileHandle(TASKS_FILE);
    return await (await handle.getFile()).text();
  } catch (error) {
    if (isNotFound(error)) {
      try {
        await workspace.getFileHandle(TASKS_FILE);
      } catch (legacyError) {
        if (isNotFound(legacyError)) return null;
        throw legacyError;
      }
      throw new Error(
        "Move tasks.json from the workspace root into .startspace, then refresh.",
      );
    }
    throw error;
  }
}

function withTaskWriteLock<T>(
  workspace: FileSystemDirectoryHandle,
  operation: () => Promise<T>,
): Promise<T> {
  const previous = pendingTaskWrites.get(workspace) ?? Promise.resolve();
  const next = previous.catch(() => undefined).then(() =>
    typeof navigator !== "undefined" && navigator.locks
      ? navigator.locks.request(`startspace:tasks:${workspace.name}`, operation)
      : operation(),
  );
  pendingTaskWrites.set(workspace, next);
  return next;
}

/** Reads tasks.json, returning an empty version-one document when absent. */
export async function readTasks(
  workspace: FileSystemDirectoryHandle,
): Promise<TasksDocument> {
  return (await readTasksSnapshot(workspace)).document;
}

/**
 * Adds or removes a bookmark relationship without replacing unrelated task
 * changes. The raw file is rechecked before the staged write is committed.
 */
export function setTaskBookmarkLink(
  workspace: FileSystemDirectoryHandle,
  taskId: string,
  bookmarkId: string,
  linked: boolean,
): Promise<TasksDocument> {
  const operation = async (): Promise<TasksDocument> => {
    const before = await readTasksSnapshot(workspace);
    const task = before.document.tasks.find((item) => item.id === taskId);
    if (!task) throw new Error("This task no longer exists. Refresh and retry.");
    const alreadyLinked = task.bookmarkIds.includes(bookmarkId);
    if (alreadyLinked === linked) return before.document;

    const next: TasksDocument = {
      ...before.document,
      tasks: before.document.tasks.map((item) =>
        item.id !== taskId
          ? item
          : {
              ...item,
              bookmarkIds: linked
                ? [...item.bookmarkIds, bookmarkId]
                : item.bookmarkIds.filter((id) => id !== bookmarkId),
              updatedAt: new Date().toISOString(),
            },
      ),
    };

    const folder = await workspace.getDirectoryHandle(".startspace", {
      create: true,
    });
    const handle = await folder.getFileHandle(TASKS_FILE, { create: true });
    const writable = await handle.createWritable();
    try {
      await writable.write(`${JSON.stringify(next, null, 2)}\n`);
      if ((await readTasksRaw(workspace)) !== before.raw)
        throw new Error(
          "tasks.json changed outside StartSpace. Refresh and retry.",
        );
      await writable.close();
    } catch (error) {
      await writable.abort();
      throw error;
    }
    return next;
  };
  return withTaskWriteLock(workspace, operation);
}

/** Atomically replaces tasks.json with the supplied task document. */
export async function writeTasks(
  workspace: FileSystemDirectoryHandle,
  document: TasksDocument,
  expectedDocument?: TasksDocument,
): Promise<void> {
  await withTaskWriteLock(workspace, async () => {
    const before = await readTasksSnapshot(workspace);
    if (
      expectedDocument &&
      JSON.stringify(before.document) !== JSON.stringify(expectedDocument)
    )
      throw new Error("tasks.json changed outside StartSpace. Refresh and retry.");
    const folder = await workspace.getDirectoryHandle(".startspace", {
      create: true,
    });
    const handle = await folder.getFileHandle(TASKS_FILE, { create: true });
    const rawAfterCreate = await readTasksRaw(workspace);
    if (
      rawAfterCreate !== before.raw &&
      !(before.raw === null && rawAfterCreate === "")
    )
      throw new Error(
        "tasks.json changed outside StartSpace. Refresh and retry.",
      );
    const writable = await handle.createWritable();
    try {
      await writable.write(`${JSON.stringify(document, null, 2)}\n`);
      if ((await readTasksRaw(workspace)) !== rawAfterCreate)
        throw new Error("tasks.json changed outside StartSpace. Refresh and retry.");
      await writable.close();
    } catch (error) {
      await writable.abort();
      throw error;
    }
  });
}
