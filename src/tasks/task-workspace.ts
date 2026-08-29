// task-workspace.ts
//
// Owns persistence for the local Kanban board. Tasks are stored as a versioned
// tasks.json file in the user's granted workspace; browser bookmark and note
// contents are not copied into this file, only their stable IDs are linked.

import { DEFAULT_COLUMNS, type Task, type TaskColumn, type TasksDocument } from './tasks-model';

const TASKS_FILE = 'tasks.json';

function isNotFound(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'NotFoundError';
}

/** Reads tasks.json, returning an empty version-one document when absent. */
export async function readTasks(workspace: FileSystemDirectoryHandle): Promise<TasksDocument> {
  try {
    const handle = await workspace.getFileHandle(TASKS_FILE);
    const raw = await (await handle.getFile()).text();
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || !Array.isArray((parsed as { tasks?: unknown }).tasks)) {
      throw new Error('Invalid tasks.json format.');
    }
    return {
      version: 1,
      columns: Array.isArray((parsed as { columns?: unknown }).columns)
        ? (parsed as { columns: TaskColumn[] }).columns
        : DEFAULT_COLUMNS.map((column) => ({ ...column })),
      tasks: (parsed as { tasks: Task[] }).tasks,
    };
  } catch (error) {
    if (isNotFound(error)) return { version: 1, columns: DEFAULT_COLUMNS.map((column) => ({ ...column })), tasks: [] };
    throw error;
  }
}

/** Atomically replaces tasks.json with the supplied task document. */
export async function writeTasks(workspace: FileSystemDirectoryHandle, document: TasksDocument): Promise<void> {
  const handle = await workspace.getFileHandle(TASKS_FILE, { create: true });
  const writable = await handle.createWritable();
  try {
    await writable.write(`${JSON.stringify(document, null, 2)}\n`);
    await writable.close();
  } catch (error) {
    await writable.abort();
    throw error;
  }
}
