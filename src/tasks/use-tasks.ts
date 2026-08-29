// use-tasks.ts
//
// React state bridge for the workspace-backed Kanban board. It coordinates
// task persistence with the active FileSystemDirectoryHandle and exposes CRUD,
// status, and note/bookmark linking operations to TasksPage.

import { useCallback, useEffect, useState } from 'react';
import { useWorkspace } from '../hooks/useWorkspace';
import { readTasks, writeTasks } from './task-workspace';
import { createColumn, createTask as makeTask, DEFAULT_COLUMNS, toggleColumnVisibility, toggleTaskLink, type Task, type TaskColumn, type TaskLinkKind, type TaskStatus, type TasksDocument } from './tasks-model';

export function useTasks() {
  const { grant } = useWorkspace();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [columns, setColumns] = useState<TaskColumn[]>(DEFAULT_COLUMNS.map((column) => ({ ...column })));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!grant.handle || grant.permission !== 'granted') { setTasks([]); setColumns(DEFAULT_COLUMNS.map((column) => ({ ...column }))); return; }
    setLoading(true); setError(null);
    try {
      const document = await readTasks(grant.handle);
      setTasks(document.tasks);
      setColumns(document.columns);
    }
    catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setLoading(false); }
  }, [grant.handle, grant.permission]);

  useEffect(() => { void refresh(); }, [refresh]);

  const save = useCallback(async (nextTasks: Task[], nextColumns = columns): Promise<boolean> => {
    if (!grant.handle || grant.permission !== 'granted') { setError('Choose a workspace folder first.'); return false; }
    try {
      const document: TasksDocument = { version: 1, columns: nextColumns, tasks: nextTasks };
      await writeTasks(grant.handle, document);
      setTasks(nextTasks);
      setColumns(nextColumns);
      setError(null);
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      return false;
    }
  }, [columns, grant.handle, grant.permission]);

  const addTask = useCallback(async (title: string): Promise<Task | null> => {
    const trimmed = title.trim();
    if (!trimmed) { setError('Enter a task title.'); return null; }
    const task = makeTask(trimmed);
    return await save([task, ...tasks]) ? task : null;
  }, [save, tasks]);

  const updateTask = useCallback(async (id: string, changes: Partial<Pick<Task, 'title' | 'description' | 'status'>>): Promise<boolean> => {
    const next = tasks.map((task) => task.id === id ? { ...task, ...changes, updatedAt: new Date().toISOString() } : task);
    return save(next);
  }, [save, tasks]);

  const deleteTask = useCallback(async (id: string): Promise<boolean> => save(tasks.filter((task) => task.id !== id)), [save, tasks]);

  const linkTask = useCallback(async (id: string, kind: TaskLinkKind, value: string): Promise<boolean> => {
    const next = tasks.map((task) => task.id === id ? toggleTaskLink(task, kind, value) : task);
    return save(next);
  }, [save, tasks]);

  const moveTask = useCallback(async (id: string, status: TaskStatus): Promise<boolean> => updateTask(id, { status }), [updateTask]);

  const addColumn = useCallback(async (title: string): Promise<boolean> => {
    if (!title.trim()) { setError('Enter a column name.'); return false; }
    return save(tasks, [...columns, createColumn(title)]);
  }, [columns, save, tasks]);

  const renameColumn = useCallback(async (id: string, title: string): Promise<boolean> => {
    if (!title.trim()) { setError('Enter a column name.'); return false; }
    return save(tasks, columns.map((column) => column.id === id ? { ...column, title: title.trim() } : column));
  }, [columns, save, tasks]);

  const toggleColumn = useCallback(async (id: string): Promise<boolean> => {
    return save(tasks, columns.map((column) => column.id === id ? toggleColumnVisibility(column) : column));
  }, [columns, save, tasks]);

  const deleteColumn = useCallback(async (id: string): Promise<boolean> => {
    if (columns.length <= 1) { setError('Keep at least one column.'); return false; }
    const remaining = columns.filter((column) => column.id !== id);
    const fallback = remaining[0]?.id;
    if (!fallback) return false;
    const nextTasks = tasks.map((task) => task.status === id ? { ...task, status: fallback, updatedAt: new Date().toISOString() } : task);
    return save(nextTasks, remaining);
  }, [columns, save, tasks]);

  return { tasks, columns, loading, error, refresh, addTask, updateTask, deleteTask, linkTask, moveTask, addColumn, renameColumn, deleteColumn, toggleColumn };
}
