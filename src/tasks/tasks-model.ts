// tasks-model.ts
//
// Pure task data types and transformations for the local Kanban board.
// This module is browser-API-free so task creation, filtering, and linking are
// deterministic unit-test targets.

export type TaskStatus = string;
export type TaskLinkKind = 'note' | 'bookmark';

export interface TaskColumn {
  id: string;
  title: string;
  visible: boolean;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
  noteIds: string[];
  bookmarkIds: string[];
}

export interface TasksDocument {
  version: 1;
  columns: TaskColumn[];
  tasks: Task[];
}

export const DEFAULT_COLUMNS: TaskColumn[] = [
  { id: 'todo', title: 'To do', visible: true },
  { id: 'in-progress', title: 'In progress', visible: true },
  { id: 'done', title: 'Done', visible: true },
];

/** Creates a new customizable Kanban column. */
export function createColumn(title: string): TaskColumn {
  const id = `column-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return { id, title: title.trim(), visible: true };
}

/** Returns a copy of a column with its visibility toggled. */
export function toggleColumnVisibility(column: TaskColumn): TaskColumn {
  return { ...column, visible: !column.visible };
}

/** Creates a new task with an empty description and no linked items. */
export function createTask(title: string): Task {
  const now = new Date().toISOString();
  const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? `task-${crypto.randomUUID()}`
    : `task-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return { id, title: title.trim(), description: '', status: 'todo', createdAt: now, updatedAt: now, noteIds: [], bookmarkIds: [] };
}

/** Filters tasks by a case-insensitive match against title or description. */
export function filterTasks(tasks: Task[], query: string): Task[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return tasks;
  return tasks.filter((task) => `${task.title}\n${task.description}`.toLowerCase().includes(normalized));
}

/** Adds or removes a note path or browser bookmark ID from a task. */
export function toggleTaskLink(task: Task, kind: TaskLinkKind, value: string): Task {
  const key = kind === 'note' ? 'noteIds' : 'bookmarkIds';
  const values = task[key];
  const nextValues = values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
  return { ...task, [key]: nextValues, updatedAt: new Date().toISOString() };
}
