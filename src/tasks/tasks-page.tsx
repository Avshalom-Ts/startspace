// tasks-page.tsx
//
// Owns the local Kanban board UI. Tasks are persisted as workspace data by
// useTasks; note relationships use workspace-stable IDs and bookmarks use
// browser Bookmark IDs. No note or bookmark content is duplicated here.

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  Circle,
  Eye,
  LayoutGrid,
  Plus,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useWorkspace } from "../hooks/useWorkspace";
import { useNotes } from "../notes/use-notes";
import { matchesNoteReference } from "../notes/note-identity";
import { useBookmarkTree } from "../hooks/useBookmarkTree";
import type { BookmarkNode } from "../hooks/useBookmarks";
import {
  filterTasks,
  type Task,
  type TaskColumn,
  type TaskStatus,
} from "./tasks-model";
import { useTasks } from "./use-tasks";
import { useNotifications } from "../notifications/notification-context";

function flattenBookmarks(nodes: BookmarkNode[]): BookmarkNode[] {
  const result: BookmarkNode[] = [];
  const visit = (items: BookmarkNode[]) =>
    items.forEach((item) => {
      if (item.url) result.push(item);
      if (item.children) visit(item.children);
    });
  visit(nodes);
  return result;
}

/** Renders the workspace-backed Kanban board and its note/bookmark linking panel. */
export function TasksPage() {
  const notifications = useNotifications();
  const { grant, chooseWorkspace } = useWorkspace();
  const board = useTasks();
  const notes = useNotes();
  const bookmarks = useBookmarkTree();
  const [query, setQuery] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newTaskStatus, setNewTaskStatus] = useState<string | null>(null);
  const [newColumnTitle, setNewColumnTitle] = useState("");
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [editingColumnTitle, setEditingColumnTitle] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeStatus, setActiveStatus] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [draftStatus, setDraftStatus] = useState<TaskStatus>("todo");
  const [columnPendingDelete, setColumnPendingDelete] =
    useState<TaskColumn | null>(null);

  const filteredTasks = useMemo(
    () => filterTasks(board.tasks, query),
    [board.tasks, query],
  );
  const visibleTasks = activeStatus
    ? filteredTasks.filter((task) => task.status === activeStatus)
    : filteredTasks;
  const visibleColumns = board.columns.filter((column) => column.visible);
  const displayedColumns = activeStatus
    ? visibleColumns.filter((column) => column.id === activeStatus)
    : visibleColumns;
  const columnsViewportRef = useRef<HTMLDivElement>(null);
  const selectedTask =
    board.tasks.find((task) => task.id === selectedId) ?? null;
  const bookmarkItems = useMemo(
    () => flattenBookmarks(bookmarks.tree),
    [bookmarks.tree],
  );

  useEffect(() => {
    const selectLinkedTask = () => {
      const taskId = new URLSearchParams(
        window.location.hash.split("?")[1] ?? "",
      ).get("task");
      const task = taskId
        ? board.tasks.find((item) => item.id === taskId)
        : undefined;
      if (task) selectTask(task);
    };
    selectLinkedTask();
    window.addEventListener("hashchange", selectLinkedTask);
    return () => window.removeEventListener("hashchange", selectLinkedTask);
  }, [board.tasks]);

  useEffect(() => {
    if (board.error) notifications.error(board.error);
  }, [board.error, notifications]);

  const selectTask = (task: Task) => {
    setSelectedId(task.id);
    setDraftTitle(task.title);
    setDraftDescription(task.description);
    setDraftStatus(task.status);
  };

  const addTask = async (status?: TaskStatus) => {
    const task = await board.addTask(
      newTitle,
      status ?? newTaskStatus ?? board.columns[0]?.id,
    );
    if (task) {
      setNewTitle("");
      setNewTaskStatus(null);
      selectTask(task);
      notifications.success("Task created.");
    }
  };

  const saveDetails = async () => {
    if (!selectedTask) return;
    if (!draftTitle.trim()) {
      notifications.error("Enter a task title.");
      return;
    }
    if (
      await board.updateTask(selectedTask.id, {
        title: draftTitle.trim(),
        description: draftDescription,
        status: draftStatus,
      })
    )
      notifications.success("Task saved.");
  };

  const moveTask = async (task: Task, status: TaskStatus) => {
    if (await board.moveTask(task.id, status))
      notifications.success("Task moved.");
  };

  const addColumn = async () => {
    if (await board.addColumn(newColumnTitle)) {
      setNewColumnTitle("");
      notifications.success("Column added.");
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
    setEditingColumnTitle("");
    if (title && (await board.renameColumn(column.id, title)))
      notifications.success("Column renamed.");
  };

  const confirmDeleteColumn = async () => {
    if (!columnPendingDelete) return;
    if (await board.deleteColumn(columnPendingDelete.id))
      notifications.success("Column deleted.");
    setColumnPendingDelete(null);
  };

  if (!grant.handle || grant.permission !== "granted") {
    return (
      <section className="w-full max-w-xl rounded-lg border border-border bg-surface p-6 text-center">
        <h2 className="mb-2 text-lg font-medium text-fg">
          Tasks workspace not selected
        </h2>
        <p className="mb-4 text-sm text-muted">
          Choose a workspace folder before creating or managing tasks.
        </p>
        <div className="flex justify-center gap-2">
          <button
            onClick={() => void chooseWorkspace()}
            className="rounded-md border border-border bg-page px-4 py-2 text-sm font-medium text-fg hover:border-fg/40"
          >
            Choose folder
          </button>
          <a
            href="#settings"
            className="rounded-md border border-border px-4 py-2 text-sm text-fg hover:bg-page"
          >
            Open Settings
          </a>
        </div>
      </section>
    );
  }

  return (
    <section className="flex min-h-0 w-full flex-1 gap-3 overflow-hidden">
      <aside className="hidden w-52 shrink-0 flex-col rounded-lg border border-border bg-surface/30 p-3 md:flex">
        <div className="mb-3 flex items-center justify-between px-1">
          <h2 className="text-sm font-semibold text-fg">Tasks</h2>
          <button
            type="button"
            onClick={() => {
              setNewTaskStatus(null);
              document
                .querySelector<HTMLInputElement>("[data-task-title]")
                ?.focus();
            }}
            title="New task"
            aria-label="New task"
            className="rounded p-1 text-muted hover:bg-page hover:text-fg"
          >
            <Plus size={18} aria-hidden="true" />
          </button>
        </div>
        <nav aria-label="Task views" className="space-y-1">
          <button
            type="button"
            onClick={() => setActiveStatus(null)}
            aria-current={activeStatus === null ? "page" : undefined}
            className={`flex min-h-9 w-full items-center justify-between rounded-md px-2 text-sm ${activeStatus === null ? "bg-accent/15 text-fg" : "text-muted hover:bg-page hover:text-fg"}`}
          >
            <span className="flex items-center gap-2">
              <LayoutGrid size={16} aria-hidden="true" /> All tasks
            </span>
            <span className="text-xs">{board.tasks.length}</span>
          </button>
          <div className="mt-5 border-t border-border pt-4">
            <h3 className="mb-2 px-2 text-xs font-semibold text-muted">
              STATUS
            </h3>
            {board.columns.map((column) => {
              const count = board.tasks.filter(
                (task) => task.status === column.id,
              ).length;
              return (
                <div key={column.id} className="group flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setActiveStatus(column.id)}
                    aria-current={
                      activeStatus === column.id ? "page" : undefined
                    }
                    className={`flex min-h-9 min-w-0 flex-1 items-center justify-between rounded-md px-2 text-sm ${activeStatus === column.id ? "bg-accent/15 text-fg" : "text-muted hover:bg-page hover:text-fg"}`}
                  >
                    <span className="truncate">{column.title}</span>
                    <span className="ml-2 text-xs">{count}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void board.toggleColumn(column.id)}
                    title={`${column.visible ? "Hide" : "Show"} ${column.title}`}
                    aria-label={`${column.visible ? "Hide" : "Show"} ${column.title}`}
                    className="rounded p-1 text-muted opacity-70 hover:bg-page hover:text-fg"
                  >
                    <Eye size={14} aria-hidden="true" />
                  </button>
                </div>
              );
            })}
          </div>
        </nav>
        <div className="mt-auto border-t border-border pt-3">
          <label
            className="mb-2 block text-xs font-semibold text-muted"
            htmlFor="new-task-column"
          >
            ADD COLUMN
          </label>
          <input
            id="new-task-column"
            value={newColumnTitle}
            onChange={(event) => setNewColumnTitle(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && void addColumn()}
            placeholder="Column name"
            className="w-full rounded-md border border-border bg-page px-2 py-1.5 text-sm text-fg placeholder-muted focus:border-accent focus:outline-none"
          />
          <button
            onClick={() => void addColumn()}
            className="mt-2 flex min-h-8 w-full items-center gap-2 rounded-md px-2 text-sm text-muted hover:bg-page hover:text-fg"
          >
            <Plus size={15} aria-hidden="true" /> Add column
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="mb-3 flex flex-wrap items-end justify-between gap-3 px-1">
          <div>
            <h1 className="text-xl font-semibold text-fg">Tasks</h1>
            <p className="mt-0.5 text-xs text-muted">
              {query
                ? `${visibleTasks.length} of ${board.tasks.length} tasks`
                : `${board.tasks.length} tasks`}
              {` · ${visibleColumns.length} columns`}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <label className="relative">
              <Search
                size={16}
                aria-hidden="true"
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted"
              />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Filter tasks"
                aria-label="Filter tasks"
                className="h-9 w-44 rounded-md border border-border bg-surface pl-8 pr-3 text-sm text-fg placeholder-muted focus:border-accent focus:outline-none"
              />
            </label>
            <div className="hidden items-center gap-1 rounded-md border border-border bg-surface px-2 py-1.5 text-xs text-muted sm:flex">
              <SlidersHorizontal size={14} aria-hidden="true" /> Grouped by
              status
            </div>
            <input
              data-task-title
              value={newTitle}
              onChange={(event) => setNewTitle(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && void addTask()}
              placeholder="New task title"
              aria-label="New task title"
              className="h-9 w-40 rounded-md border border-border bg-surface px-3 text-sm text-fg placeholder-muted focus:border-accent focus:outline-none"
            />
            <button
              onClick={() => void addTask()}
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-accent px-3 text-sm font-medium text-accent-foreground hover:brightness-110"
            >
              <Plus size={16} aria-hidden="true" /> Add task
            </button>
          </div>
        </header>
        {(board.loading || notes.loading) && (
          <p className="mb-2 text-xs text-muted" role="status">
            Loading tasks…
          </p>
        )}
        <div className="flex min-h-0 flex-1 gap-3">
          <div
            ref={columnsViewportRef}
            className="app-scrollbar min-h-0 min-w-0 flex-1 overflow-x-auto overflow-y-hidden"
          >
            <div className="flex h-full min-w-max items-stretch gap-3 pb-2">
              {displayedColumns.map((column) => {
                const columnTasks = visibleTasks.filter(
                  (task) => task.status === column.id,
                );
                return (
                  <section
                    key={column.id}
                    aria-label={`${column.title} tasks`}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      const taskId = event.dataTransfer.getData("text/task-id");
                      const task = board.tasks.find(
                        (item) => item.id === taskId,
                      );
                      if (task && task.status !== column.id)
                        void moveTask(task, column.id);
                    }}
                    className="flex min-h-0 w-73.75 min-w-65 max-w-90 flex-[0_0_295px] flex-col rounded-lg border border-border bg-surface/30 p-2.5"
                  >
                    <div className="mb-2 flex shrink-0 items-center gap-2 px-1">
                      <Circle
                        size={16}
                        aria-hidden="true"
                        className="text-accent"
                      />
                      {editingColumnId === column.id ? (
                        <input
                          autoFocus
                          value={editingColumnTitle}
                          onChange={(event) =>
                            setEditingColumnTitle(event.target.value)
                          }
                          onBlur={() => void commitRenameColumn(column)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter")
                              void commitRenameColumn(column);
                            if (event.key === "Escape") {
                              setEditingColumnId(null);
                              setEditingColumnTitle("");
                            }
                          }}
                          aria-label="Edit column name"
                          className="min-w-0 flex-1 rounded border border-border bg-page px-1 py-0.5 text-sm font-semibold text-fg"
                        />
                      ) : (
                        <button
                          onClick={() => beginRenameColumn(column)}
                          title="Rename column"
                          className="min-w-0 flex-1 truncate text-left text-sm font-semibold text-fg"
                        >
                          {column.title}
                        </button>
                      )}
                      <span className="rounded-full bg-page px-2 py-0.5 text-xs text-muted">
                        {columnTasks.length}
                      </span>
                      <button
                        onClick={() => setColumnPendingDelete(column)}
                        title={`Delete ${column.title}`}
                        aria-label={`Delete ${column.title}`}
                        className="rounded p-1 text-muted hover:bg-page hover:text-red-500"
                      >
                        <X size={15} aria-hidden="true" />
                      </button>
                    </div>
                    <div className="app-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                      {columnTasks.map((task) => (
                        <article
                          key={task.id}
                          draggable
                          onDragStart={(event) =>
                            event.dataTransfer.setData("text/task-id", task.id)
                          }
                          className={`rounded-md border bg-page p-3 ${selectedId === task.id ? "border-accent bg-accent/10" : "border-border"}`}
                        >
                          <div className="flex items-start gap-2">
                            <button
                              type="button"
                              onClick={() => selectTask(task)}
                              aria-label={`Open ${task.title}`}
                              className="mt-0.5 shrink-0 text-muted hover:text-accent"
                            >
                              {column.title.toLowerCase() === "done" ? (
                                <CheckCircle2 size={17} aria-hidden="true" />
                              ) : (
                                <Circle size={17} aria-hidden="true" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => selectTask(task)}
                              className="min-w-0 flex-1 text-left"
                            >
                              <h3 className="wrap-break-word text-sm font-medium text-fg">
                                {task.title}
                              </h3>
                              {task.description && (
                                <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">
                                  {task.description}
                                </p>
                              )}
                              {(task.noteIds.length > 0 ||
                                task.bookmarkIds.length > 0) && (
                                <p className="mt-2 text-xs text-muted">
                                  {task.noteIds.length > 0 &&
                                    `${task.noteIds.length} notes`}
                                  {task.noteIds.length > 0 &&
                                    task.bookmarkIds.length > 0 &&
                                    " · "}
                                  {task.bookmarkIds.length > 0 &&
                                    `${task.bookmarkIds.length} links`}
                                </p>
                              )}
                            </button>
                          </div>
                        </article>
                      ))}
                      {columnTasks.length === 0 && (
                        <p className="py-6 text-center text-xs text-muted">
                          No tasks
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setNewTaskStatus(column.id);
                        document
                          .querySelector<HTMLInputElement>("[data-task-title]")
                          ?.focus();
                      }}
                      className="mt-2 flex min-h-9 shrink-0 items-center justify-center gap-1 rounded-md border border-transparent text-sm text-muted hover:border-border hover:bg-page hover:text-fg"
                    >
                      <Plus size={15} aria-hidden="true" /> Add task
                    </button>
                  </section>
                );
              })}
              {displayedColumns.length === 0 && (
                <div className="flex min-h-40 min-w-65 items-center justify-center rounded-lg border border-dashed border-border px-6 text-center text-sm text-muted">
                  All columns are hidden. Show a column from the task sidebar.
                </div>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSelectedId(null)}
            aria-label="Close task details"
            className={`fixed inset-0 z-30 bg-black/40 wide:hidden ${selectedTask ? "block" : "hidden"}`}
          />
          <aside
            className={`${selectedTask ? "fixed inset-y-0 right-0 z-40 flex w-full max-w-md shadow-2xl wide:static wide:z-auto wide:w-[18rem] wide:max-w-none wide:shadow-none" : "hidden wide:flex wide:w-[18rem]"} shrink-0 flex-col overflow-y-auto rounded-l-lg border border-border bg-surface p-3`}
          >
            {selectedTask ? (
              <TaskDetails
                task={selectedTask}
                title={draftTitle}
                description={draftDescription}
                notes={notes.index?.notes ?? []}
                noteAliases={notes.index?.noteAliases ?? {}}
                bookmarks={bookmarkItems}
                columns={board.columns}
                status={draftStatus}
                onTitleChange={setDraftTitle}
                onDescriptionChange={setDraftDescription}
                onStatusChange={setDraftStatus}
                onSave={() => void saveDetails()}
                onDelete={() => {
                  void board.deleteTask(selectedTask.id).then((deleted) => {
                    if (deleted) setSelectedId(null);
                  });
                }}
                onClose={() => setSelectedId(null)}
                onToggleLink={(kind, value) => {
                  const note =
                    kind === "note"
                      ? notes.index?.notes.find(
                          (item) => (item.stableId ?? item.id) === value,
                        )
                      : null;
                  const previous =
                    note &&
                    selectedTask.noteIds.find((reference) =>
                      matchesNoteReference(
                        reference,
                        note.id,
                        note.stableId,
                        notes.index?.noteAliases,
                      ),
                    );
                  void board.linkTask(selectedTask.id, kind, previous ?? value);
                }}
              />
            ) : (
              <p className="m-auto max-w-48 text-center text-sm text-muted">
                Select a task to see its details.
              </p>
            )}
          </aside>
        </div>
      </div>

      {columnPendingDelete && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
          role="presentation"
          onMouseDown={(event) =>
            event.target === event.currentTarget && setColumnPendingDelete(null)
          }
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-column-title"
            className="w-full max-w-sm rounded-xl border border-border bg-page p-5 shadow-xl"
          >
            <h2
              id="delete-column-title"
              className="mb-2 text-sm font-semibold text-fg"
            >
              Delete column
            </h2>
            <p className="mb-4 text-sm text-muted">
              Delete "{columnPendingDelete.title}"? Tasks in it will move to
              another column.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setColumnPendingDelete(null)}
                className="rounded border border-border px-3 py-2 text-sm text-fg hover:border-fg/40 hover:bg-surface"
              >
                Cancel
              </button>
              <button
                onClick={() => void confirmDeleteColumn()}
                className="rounded border border-red-500 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-500 hover:bg-red-500/20"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function TaskDetails({
  task,
  title,
  description,
  notes,
  noteAliases,
  bookmarks,
  columns,
  status,
  onTitleChange,
  onDescriptionChange,
  onStatusChange,
  onSave,
  onDelete,
  onClose,
  onToggleLink,
}: {
  task: Task;
  title: string;
  description: string;
  notes: { id: string; title: string; stableId?: string }[];
  noteAliases: Record<string, string>;
  bookmarks: BookmarkNode[];
  columns: TaskColumn[];
  status: TaskStatus;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onStatusChange: (value: TaskStatus) => void;
  onSave: () => void;
  onDelete: () => void;
  onClose: () => void;
  onToggleLink: (kind: "note" | "bookmark", value: string) => void;
}) {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
        <h2
          id="task-details-title"
          className="min-w-0 truncate text-sm font-semibold text-fg"
        >
          {title || task.title}
        </h2>
        <div className="flex items-center gap-3">
          <button
            onClick={onDelete}
            className="text-xs text-muted hover:text-red-500"
          >
            Delete task
          </button>
          <button
            onClick={onClose}
            aria-label="Close task details"
            title="Close task details"
            className="rounded p-1 text-muted hover:bg-page hover:text-fg"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className="space-y-4">
        <div className="space-y-3">
          <input
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
            aria-label="Task title"
            className="w-full rounded-md border border-border bg-page px-3 py-2 text-sm text-fg focus:border-accent focus:outline-none"
          />
          <label className="block text-xs font-medium text-muted">
            Column
            <select
              value={status}
              onChange={(event) => onStatusChange(event.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-page px-3 py-2 text-sm text-fg focus:border-accent focus:outline-none"
            >
              {columns.map((column) => (
                <option key={column.id} value={column.id}>
                  {column.title}
                </option>
              ))}
            </select>
          </label>
          <textarea
            value={description}
            onChange={(event) => onDescriptionChange(event.target.value)}
            placeholder="Description"
            rows={5}
            className="w-full resize-y rounded-md border border-border bg-page px-3 py-2 text-sm text-fg placeholder-muted focus:border-accent focus:outline-none"
          />
          <button
            onClick={onSave}
            className="min-h-9 w-full rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-foreground hover:brightness-110"
          >
            Save details
          </button>
        </div>
        <div className="space-y-4 border-t border-border pt-4">
          <LinkPicker
            title="Link notes"
            items={notes.map((note) => ({
              id: note.stableId ?? note.id,
              label: note.title,
            }))}
            selected={task.noteIds.map(
              (reference) =>
                notes.find((note) =>
                  matchesNoteReference(
                    reference,
                    note.id,
                    note.stableId,
                    noteAliases,
                  ),
                )?.stableId ?? reference,
            )}
            onToggle={(id) => onToggleLink("note", id)}
          />
          <LinkPicker
            title="Link bookmarks"
            items={bookmarks.map((bookmark) => ({
              id: bookmark.id,
              label: bookmark.title,
            }))}
            selected={task.bookmarkIds}
            onToggle={(id) => onToggleLink("bookmark", id)}
          />
        </div>
      </div>
    </div>
  );
}

function LinkPicker({
  title,
  items,
  selected,
  onToggle,
}: {
  title: string;
  items: { id: string; label: string }[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
        {title}
      </h3>
      <div className="app-scrollbar max-h-44 space-y-1 overflow-y-auto rounded border border-border p-2">
        {items.length === 0 ? (
          <p className="text-xs text-muted">None available</p>
        ) : (
          items.map((item) => (
            <label
              key={item.id}
              className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-xs text-fg hover:bg-surface"
            >
              <input
                type="checkbox"
                checked={selected.includes(item.id)}
                onChange={() => onToggle(item.id)}
              />
              <span className="truncate" title={item.id}>
                {item.label}
              </span>
            </label>
          ))
        )}
      </div>
    </div>
  );
}
