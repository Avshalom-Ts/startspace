// tasks-page.tsx
//
// Owns the local Kanban board UI. Tasks are persisted as workspace data by
// useTasks; notes are identified by relative Markdown paths and bookmarks by
// browser Bookmark IDs. No note or bookmark content is duplicated here.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useWorkspace } from '../hooks/useWorkspace';
import { useNotes } from '../notes/use-notes';
import { useBookmarkTree } from '../hooks/useBookmarkTree';
import type { BookmarkNode } from '../hooks/useBookmarks';
import { filterTasks, type Task, type TaskColumn, type TaskStatus } from './tasks-model';
import { useTasks } from './use-tasks';

function flattenBookmarks(nodes: BookmarkNode[]): BookmarkNode[] {
  const result: BookmarkNode[] = [];
  const visit = (items: BookmarkNode[]) => items.forEach((item) => {
    if (item.url) result.push(item);
    if (item.children) visit(item.children);
  });
  visit(nodes);
  return result;
}

/** Renders the workspace-backed Kanban board and its note/bookmark linking panel. */
export function TasksPage() {
  const { grant, chooseWorkspace } = useWorkspace();
  const board = useTasks();
  const notes = useNotes();
  const bookmarks = useBookmarkTree();
  const [query, setQuery] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [editingColumnTitle, setEditingColumnTitle] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftDescription, setDraftDescription] = useState('');
  const [draftStatus, setDraftStatus] = useState<TaskStatus>('todo');
  const [message, setMessage] = useState<string | null>(null);

  const visibleTasks = useMemo(() => filterTasks(board.tasks, query), [board.tasks, query]);
  const visibleColumns = board.columns.filter((column) => column.visible);
  const columnsViewportRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const selectedTask = board.tasks.find((task) => task.id === selectedId) ?? null;
  const bookmarkItems = useMemo(() => flattenBookmarks(bookmarks.tree), [bookmarks.tree]);

  /** Updates which board-navigation arrows can move the horizontal viewport. */
  const updateScrollControls = useCallback(() => {
    const viewport = columnsViewportRef.current;
    if (!viewport) return;

    setCanScrollLeft(viewport.scrollLeft > 0);
    setCanScrollRight(viewport.scrollLeft + viewport.clientWidth < viewport.scrollWidth - 1);
  }, []);

  /** Scrolls the task-column viewport by most of its visible width. */
  const scrollColumns = (direction: 'left' | 'right') => {
    const viewport = columnsViewportRef.current;
    if (!viewport) return;

    viewport.scrollBy({
      left: (direction === 'left' ? -1 : 1) * Math.max(viewport.clientWidth * 0.8, 240),
      behavior: 'smooth',
    });
  };

  useEffect(() => {
    updateScrollControls();
    const viewport = columnsViewportRef.current;
    if (!viewport) return undefined;

    const resizeObserver = new ResizeObserver(updateScrollControls);
    resizeObserver.observe(viewport);
    viewport.addEventListener('scroll', updateScrollControls, { passive: true });
    return () => {
      resizeObserver.disconnect();
      viewport.removeEventListener('scroll', updateScrollControls);
    };
  }, [updateScrollControls, visibleColumns.length]);

  const selectTask = (task: Task) => {
    setSelectedId(task.id);
    setDraftTitle(task.title);
    setDraftDescription(task.description);
    setDraftStatus(task.status);
  };

  const addTask = async () => {
    const task = await board.addTask(newTitle);
    if (task) {
      setNewTitle('');
      selectTask(task);
      setMessage('Task created.');
    }
  };

  const saveDetails = async () => {
    if (!selectedTask) return;
    if (!draftTitle.trim()) { setMessage('Enter a task title.'); return; }
    if (await board.updateTask(selectedTask.id, { title: draftTitle.trim(), description: draftDescription, status: draftStatus })) setMessage('Task saved.');
  };

  const moveTask = async (task: Task, status: TaskStatus) => {
    if (await board.moveTask(task.id, status)) setMessage('Task moved.');
  };

  const addColumn = async () => {
    if (await board.addColumn(newColumnTitle)) {
      setNewColumnTitle('');
      setMessage('Column added.');
    }
  };

  const beginRenameColumn = (column: TaskColumn) => {
    setEditingColumnId(column.id);
    setEditingColumnTitle(column.title);
  };

  const commitRenameColumn = async (column: TaskColumn) => {
    if (editingColumnId !== column.id) return;
    const title = editingColumnTitle.trim();
    setEditingColumnId(null);
    setEditingColumnTitle('');
    if (title && await board.renameColumn(column.id, title)) setMessage('Column renamed.');
  };

  const deleteColumn = async (column: TaskColumn) => {
    if (window.confirm(`Delete \\"${column.title}\\"? Tasks in it will move to another column.`) && await board.deleteColumn(column.id)) setMessage('Column deleted.');
  };

  if (!grant.handle || grant.permission !== 'granted') {
    return (
      <section className="w-full max-w-xl rounded-lg border border-border bg-surface p-6 text-center">
        <h2 className="mb-2 text-lg font-medium text-fg">Tasks workspace not selected</h2>
        <p className="mb-4 text-sm text-muted">Choose a workspace folder before creating or managing tasks.</p>
        <div className="flex justify-center gap-2">
          <button onClick={() => void chooseWorkspace()} className="rounded-md border border-border bg-page px-4 py-2 text-sm font-medium text-fg hover:border-fg/40">Choose folder</button>
          <a href="#settings" className="rounded-md border border-border px-4 py-2 text-sm text-fg hover:bg-page">Open Settings</a>
        </div>
      </section>
    );
  }

  return (
    <section className="flex h-[calc(100vh-12rem)] min-h-128 w-full max-w-6xl flex-col">
      {/* Add Tasks button */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                {/* Search tasks input */}
        <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tasks…" className="w-full max-w-sm rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg placeholder-muted focus:border-fg/40 focus:outline-none" />
        <div className="flex gap-2">
          <input value={newTitle} onChange={(event) => setNewTitle(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && void addTask()} placeholder="New task title" className="w-52 rounded border border-border bg-surface px-3 py-2 text-sm text-fg placeholder-muted focus:border-fg/40 focus:outline-none" />
          <button onClick={() => void addTask()} className="rounded border border-border bg-page px-3 py-2 text-sm font-medium text-fg hover:border-fg/40 hover:bg-surface">+ Add task</button>
        </div>

        {/* New column input */}
        <div className="ml-auto flex gap-2">
          <input value={newColumnTitle} onChange={(event) => setNewColumnTitle(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && void addColumn()} placeholder="New column name" className="w-40 rounded border border-border bg-surface px-2 py-2 text-sm text-fg placeholder-muted focus:border-fg/40 focus:outline-none" />
          <button onClick={() => void addColumn()} className="rounded border border-border bg-page px-3 py-2 text-sm text-fg hover:border-fg/40 hover:bg-surface">+ Column</button>
        </div>
      </div>
        {(board.loading || notes.loading) && <span className="text-xs text-muted">Loading…</span>}
        {message && <span className="text-xs text-muted">{message}</span>}
        {board.error && <span className="text-xs text-red-500">{board.error}</span>}

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="mb-2 flex flex-wrap gap-2">
          {board.columns.filter((column) => !column.visible).map((column) => (
            <button key={column.id} onClick={() => void board.toggleColumn(column.id)} className="rounded-full border border-border px-3 py-1 text-xs text-muted hover:border-fg/40 hover:text-fg">Show {column.title}</button>
          ))}
        </div>
        <div className="flex min-h-0 flex-1 items-stretch gap-2">
          <button
            type="button"
            onClick={() => scrollColumns('left')}
            disabled={!canScrollLeft}
            aria-label="Scroll task columns left"
            title="Scroll columns left"
            className="my-auto shrink-0 rounded-full border border-border bg-surface p-2 text-lg leading-none text-fg shadow-sm hover:border-fg/40 hover:bg-page disabled:cursor-not-allowed disabled:opacity-35"
          >
            ‹
          </button>
          <div
            ref={columnsViewportRef}
            className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden scroll-smooth"
          >
            <div className="flex h-full min-w-max gap-4 pr-1">
        {visibleColumns.map((column) => {
          const columnTasks = visibleTasks.filter((task) => task.status === column.id);
          return (
            <section key={column.id} onDragOver={(event) => event.preventDefault()} onDrop={(event) => {
              const taskId = event.dataTransfer.getData('text/task-id');
              const task = board.tasks.find((item) => item.id === taskId);
              if (task && task.status !== column.id) void moveTask(task, column.id);
            }} className="flex min-h-0 w-80 shrink-0 flex-col rounded-lg border border-border bg-surface/30 p-3">
              <div className="mb-3 flex shrink-0 items-center gap-2">
                <button onClick={() => void board.toggleColumn(column.id)} title="Hide column" aria-label={`Hide ${column.title}`} className="shrink-0 text-base text-muted hover:text-fg">👁</button>
                {editingColumnId === column.id ? (
                  <input
                    autoFocus
                    value={editingColumnTitle}
                    onChange={(event) => setEditingColumnTitle(event.target.value)}
                    onBlur={() => void commitRenameColumn(column)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') void commitRenameColumn(column);
                      if (event.key === 'Escape') {
                        setEditingColumnId(null);
                        setEditingColumnTitle('');
                      }
                    }}
                    aria-label="Edit column name"
                    className="min-w-0 flex-1 rounded border border-fg/40 bg-surface px-1 py-0.5 text-sm font-semibold text-fg focus:outline-none"
                  />
                ) : (
                  <button onClick={() => beginRenameColumn(column)} title="Edit column name" className="min-w-0 flex-1 truncate text-left text-sm font-semibold text-fg hover:text-accent">
                    {column.title}
                  </button>
                )}
                <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted">{columnTasks.length}</span>
                <button onClick={() => void deleteColumn(column)} title="Delete column" aria-label={`Delete ${column.title}`} className="text-xs text-muted hover:text-red-500">✕</button>
              </div>
              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                {columnTasks.map((task) => (
                  <article key={task.id} draggable onDragStart={(event) => event.dataTransfer.setData('text/task-id', task.id)} className={`cursor-grab rounded-lg border bg-page p-3 active:cursor-grabbing ${selectedId === task.id ? 'border-fg' : 'border-border'}`}>
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-sm font-medium text-fg">{task.title}</h3>
                        {task.description && <p className="mt-1 line-clamp-2 text-xs text-muted">{task.description}</p>}
                        {(task.noteIds.length > 0 || task.bookmarkIds.length > 0) && <p className="mt-2 text-xs text-muted">{task.noteIds.length} note link(s) · {task.bookmarkIds.length} bookmark link(s)</p>}
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button onClick={() => selectTask(task)} title="Edit task" aria-label={`Edit ${task.title}`} className="rounded p-1 text-base leading-none text-muted hover:bg-surface hover:text-fg">✎</button>
                        <button onClick={() => void board.deleteTask(task.id)} title="Delete task" aria-label={`Delete ${task.title}`} className="rounded p-1 text-base leading-none text-muted hover:bg-surface hover:text-red-500">🗑</button>
                      </div>
                    </div>
                  </article>
                ))}
                {columnTasks.length === 0 && <p className="py-6 text-center text-xs text-muted">No tasks</p>}
              </div>
            </section>
          );
        })}
            </div>
          </div>
          <button
            type="button"
            onClick={() => scrollColumns('right')}
            disabled={!canScrollRight}
            aria-label="Scroll task columns right"
            title="Scroll columns right"
            className="my-auto shrink-0 rounded-full border border-border bg-surface p-2 text-lg leading-none text-fg shadow-sm hover:border-fg/40 hover:bg-page disabled:cursor-not-allowed disabled:opacity-35"
          >
            ›
          </button>
        </div>
        {visibleColumns.length === 0 && <p className="rounded-lg border border-border p-6 text-center text-sm text-muted">All columns are hidden. Use the buttons above to show one.</p>}
      </div>

      {selectedTask && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setSelectedId(null)}>
          <div role="dialog" aria-modal="true" aria-labelledby="task-details-title" className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-border bg-page p-5 shadow-xl">
            <TaskDetails
              task={selectedTask}
              title={draftTitle}
              description={draftDescription}
              notes={notes.index?.notes ?? []}
              bookmarks={bookmarkItems}
              columns={board.columns}
              status={draftStatus}
              onTitleChange={setDraftTitle}
              onDescriptionChange={setDraftDescription}
              onStatusChange={setDraftStatus}
              onSave={() => void saveDetails()}
              onDelete={() => { void board.deleteTask(selectedTask.id).then((deleted) => { if (deleted) setSelectedId(null); }); }}
              onClose={() => setSelectedId(null)}
              onToggleLink={(kind, value) => void board.linkTask(selectedTask.id, kind, value)}
            />
          </div>
        </div>
      )}
    </section>
  );
}

function TaskDetails({
  task, title, description, notes, bookmarks, columns, status, onTitleChange, onDescriptionChange, onStatusChange, onSave, onDelete, onClose, onToggleLink,
}: {
  task: Task;
  title: string;
  description: string;
  notes: { id: string; title: string }[];
  bookmarks: BookmarkNode[];
  columns: TaskColumn[];
  status: TaskStatus;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onStatusChange: (value: TaskStatus) => void;
  onSave: () => void;
  onDelete: () => void;
  onClose: () => void;
  onToggleLink: (kind: 'note' | 'bookmark', value: string) => void;
}) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 id="task-details-title" className="text-sm font-semibold text-fg">Task details</h2>
        <div className="flex items-center gap-3">
          <button onClick={onDelete} className="text-xs text-muted hover:text-red-500">Delete task</button>
          <button onClick={onClose} aria-label="Close task details" className="rounded border border-border px-2 py-1 text-sm text-muted hover:border-fg/40 hover:text-fg">×</button>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <input value={title} onChange={(event) => onTitleChange(event.target.value)} className="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-fg focus:border-fg/40 focus:outline-none" />
          <label className="block text-xs font-medium text-muted">Column
            <select value={status} onChange={(event) => onStatusChange(event.target.value)} className="mt-1 w-full rounded border border-border bg-surface px-3 py-2 text-sm text-fg focus:border-fg/40 focus:outline-none">
              {columns.map((column) => <option key={column.id} value={column.id}>{column.title}</option>)}
            </select>
          </label>
          <textarea value={description} onChange={(event) => onDescriptionChange(event.target.value)} placeholder="Description" rows={5} className="w-full resize-y rounded border border-border bg-surface px-3 py-2 text-sm text-fg placeholder-muted focus:border-fg/40 focus:outline-none" />
          <button onClick={onSave} className="rounded border border-border bg-page px-3 py-2 text-sm text-fg hover:border-fg/40 hover:bg-surface">Save details</button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <LinkPicker title="Link notes" items={notes.map((note) => ({ id: note.id, label: note.title }))} selected={task.noteIds} onToggle={(id) => onToggleLink('note', id)} />
          <LinkPicker title="Link bookmarks" items={bookmarks.map((bookmark) => ({ id: bookmark.id, label: bookmark.title }))} selected={task.bookmarkIds} onToggle={(id) => onToggleLink('bookmark', id)} />
        </div>
      </div>
    </div>
  );
}

function LinkPicker({ title, items, selected, onToggle }: { title: string; items: { id: string; label: string }[]; selected: string[]; onToggle: (id: string) => void }) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">{title}</h3>
      <div className="max-h-44 space-y-1 overflow-y-auto rounded border border-border p-2">
        {items.length === 0 ? <p className="text-xs text-muted">None available</p> : items.map((item) => (
          <label key={item.id} className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-xs text-fg hover:bg-surface">
            <input type="checkbox" checked={selected.includes(item.id)} onChange={() => onToggle(item.id)} />
            <span className="truncate" title={item.id}>{item.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
