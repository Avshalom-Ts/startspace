import { describe, expect, it } from 'vitest';
import {
  createColumn,
  createTask,
  filterTasks,
  toggleColumnVisibility,
  toggleTaskLink,
  type Task,
} from './tasks-model';

const baseTask: Task = {
  id: 'task-1',
  title: 'Read the design note',
  description: '',
  status: 'todo',
  createdAt: '2026-08-28T08:00:00.000Z',
  updatedAt: '2026-08-28T08:00:00.000Z',
  noteIds: ['design.md'],
  bookmarkIds: ['42'],
};

describe('task model helpers', () => {
  it('creates a task with stable defaults and an id', () => {
    const task = createTask('  Write tests  ');
    expect(task.title).toBe('Write tests');
    expect(task.status).toBe('todo');
    expect(task.noteIds).toEqual([]);
    expect(task.bookmarkIds).toEqual([]);
    expect(task.id).toMatch(/^task-/);
  });

  it('creates and toggles customizable columns', () => {
    const column = createColumn('  Review  ');
    expect(column.title).toBe('Review');
    expect(column.visible).toBe(true);
    expect(toggleColumnVisibility(column).visible).toBe(false);
  });

  it('toggles note and bookmark links without duplicates', () => {
    expect(toggleTaskLink(baseTask, 'note', 'design.md').noteIds).toEqual([]);
    expect(toggleTaskLink(baseTask, 'note', 'other.md').noteIds).toEqual(['design.md', 'other.md']);
    expect(toggleTaskLink(baseTask, 'bookmark', '42').bookmarkIds).toEqual([]);
  });

  it('filters tasks by title and description', () => {
    const second = { ...baseTask, id: 'task-2', title: 'Ship board', description: 'Kanban release' };
    expect(filterTasks([baseTask, second], 'kanban').map((task) => task.id)).toEqual(['task-2']);
    expect(filterTasks([baseTask, second], '').length).toBe(2);
  });
});
