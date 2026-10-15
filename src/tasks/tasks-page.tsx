// tasks-page.tsx
//
// Owns the local Kanban board UI. Tasks are persisted as workspace data by
// useTasks; note relationships use workspace-stable IDs and bookmarks use
// browser Bookmark IDs. No note or bookmark content is duplicated here.

import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  Circle,
  Eye,
  LayoutGrid,
  Plus,
  Search,
  Trash2,
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
import LinkPicker from "./task-link-picker";
import { TaskCreateDialog } from "./task-create-dialog";
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
  const [creatingTask, setCreatingTask] = useState(false);
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
    const focusNewTask = () => {
      if (
        new URLSearchParams(location.hash.split("?")[1] ?? "").get("new") ===
        "task"
      )
        setCreatingTask(true);
    };
    focusNewTask();
    window.addEventListener("hashchange", focusNewTask);
    return () => window.removeEventListener("hashchange", focusNewTask);
  }, []);

  useEffect(() => {
    if (board.error) notifications.error(board.error);
  }, [board.error, notifications]);

  useEffect(() => {
    if (!selectedTask) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !document.querySelector("dialog[open]"))
        setSelectedId(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [selectedTask?.id]);

  const selectTask = (task: Task) => {
    setSelectedId(task.id);
    setDraftTitle(task.title);
    setDraftDescription(task.description);
    setDraftStatus(task.status);
  };

  /** Opens the creation form, optionally preselecting a board column. */
  const openCreateTask = (status?: TaskStatus) => {
    setNewTaskStatus(status ?? null);
    setCreatingTask(true);
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
            className="cursor-pointer disabled:cursor-not-allowed rounded-md border border-border bg-page px-4 py-2 text-sm font-medium text-fg hover:border-fg/40"
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
      {/* Sidebar for task views and status filters */}
      <aside className="hidden w-52 shrink-0 flex-col rounded-lg border border-border bg-surface/30 p-3 md:flex">
        <div className="mb-3 flex items-center justify-between px-1">
          <h2 className="text-sm font-semibold text-fg">Tasks</h2>
          <button
            type="button"
            onClick={() => openCreateTask()}
            title="New task"
            aria-label="New task"
            className="cursor-pointer disabled:cursor-not-allowed rounded p-1 text-muted hover:bg-page hover:text-fg"
          >
            <Plus size={18} aria-hidden="true" />
          </button>
        </div>
        <nav aria-label="Task views" className="space-y-1">
          <button
            type="button"
            onClick={() => setActiveStatus(null)}
            aria-current={activeStatus === null ? "page" : undefined}
            className={`cursor-pointer disabled:cursor-not-allowed flex min-h-9 w-full items-center justify-between rounded-md px-2 text-sm ${activeStatus === null ? "bg-accent/15 text-fg" : "text-muted hover:bg-page hover:text-fg"}`}
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
                    className={`cursor-pointer disabled:cursor-not-allowed flex min-h-9 min-w-0 flex-1 items-center justify-between rounded-md px-2 text-sm ${activeStatus === column.id ? "bg-accent/15 text-fg" : "text-muted hover:bg-page hover:text-fg"}`}
                  >
                    <span className="truncate">{column.title}</span>
                    <span className="ml-2 text-xs">{count}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void board.toggleColumn(column.id)}
                    title={`${column.visible ? "Hide" : "Show"} ${column.title}`}
                    aria-label={`${column.visible ? "Hide" : "Show"} ${column.title}`}
                    aria-pressed={column.visible}
                    className={`cursor-pointer disabled:cursor-not-allowed rounded p-1 hover:bg-page ${column.visible ? "text-fg" : "text-muted opacity-40 hover:opacity-70"}`}
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
            className="cursor-pointer disabled:cursor-not-allowed mt-2 flex min-h-8 w-full items-center gap-2 rounded-md px-2 text-sm text-muted hover:bg-page hover:text-fg"
          >
            <Plus size={15} aria-hidden="true" /> Add column
          </button>
        </div>
      </aside>

      {/* Main content area for tasks */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="mb-3 flex items-end gap-3 px-1">
          <div className="shrink-0">
            <h1 className="text-xl font-semibold text-fg">Tasks</h1>
            <p className="mt-0.5 text-xs text-muted">
              {query
                ? `${visibleTasks.length} of ${board.tasks.length} tasks`
                : `Total ${board.tasks.length} tasks`}
            </p>
          </div>
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <label className="relative min-w-0 flex-1">
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
                className="h-9 w-full rounded-md border border-border bg-surface pl-8 pr-3 text-sm text-fg placeholder-muted focus:border-accent focus:outline-none"
              />
            </label>
            <button
              onClick={() => openCreateTask()}
              className="cursor-pointer disabled:cursor-not-allowed inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md bg-accent px-3 text-sm font-medium text-accent-foreground hover:brightness-110"
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
        <div className="relative flex min-h-0 flex-1 gap-3">
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
                          className="cursor-pointer disabled:cursor-not-allowed min-w-0 flex-1 truncate text-left text-sm font-semibold text-fg"
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
                        className="cursor-pointer disabled:cursor-not-allowed rounded p-1 text-muted hover:bg-page hover:text-red-500"
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
                          className={`cursor-pointer rounded-md border bg-page p-3 ${selectedId === task.id ? "border-accent bg-accent/10" : "border-border"}`}
                        >
                          <div className="flex items-start gap-2">
                            <button
                              type="button"
                              onClick={() => selectTask(task)}
                              aria-label={`Open ${task.title}`}
                              className="cursor-pointer disabled:cursor-not-allowed mt-0.5 shrink-0 text-muted hover:text-accent"
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
                              className="cursor-pointer disabled:cursor-not-allowed min-w-0 flex-1 text-left"
                            >
                              <h3
                                dir="auto"
                                className="wrap-break-word text-start text-sm font-medium text-fg"
                              >
                                {task.title}
                              </h3>
                              {task.description && (
                                <p
                                  dir="auto"
                                  className="mt-1 line-clamp-2 text-start text-xs leading-5 text-muted"
                                >
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
                      onClick={() => openCreateTask(column.id)}
                      className="cursor-pointer disabled:cursor-not-allowed mt-2 flex min-h-9 shrink-0 items-center justify-center gap-1 rounded-md border border-transparent text-sm text-muted hover:border-border hover:bg-page hover:text-fg"
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
          {selectedTask && (
            <>
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                aria-label="Close task details"
                title="Close task details"
                className="cursor-pointer disabled:cursor-not-allowed absolute inset-0 z-20 bg-black/40 wide:hidden"
              />
              <div className="absolute inset-y-0 right-0 z-30 flex w-full max-w-md flex-col shadow-2xl md:w-90 wide:w-82.5">
                <TaskDetails
                  key={selectedTask.id}
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
                    void board.linkTask(
                      selectedTask.id,
                      kind,
                      previous ?? value,
                    );
                  }}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {creatingTask && (
        <TaskCreateDialog
          columns={board.columns}
          loading={board.loading}
          initialStatus={newTaskStatus ?? board.columns[0]?.id ?? ""}
          onClose={() => setCreatingTask(false)}
          onCreate={async (input) => {
            const task = await board.addTask(input.title, input.status, {
              description: input.description,
            });
            if (!task) return false;
            selectTask(task);
            notifications.success("Task created.");
            return true;
          }}
        />
      )}

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
                className="cursor-pointer disabled:cursor-not-allowed rounded border border-border px-3 py-2 text-sm text-fg hover:border-fg/40 hover:bg-surface"
              >
                Cancel
              </button>
              <button
                onClick={() => void confirmDeleteColumn()}
                className="cursor-pointer disabled:cursor-not-allowed rounded border border-red-500 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-500 hover:bg-red-500/20"
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
  const [tab, setTab] = useState("info");
  const tabId = useId();
  const tabs = [
    { id: "info", label: "Info" },
    { id: "notes", label: "Linked notes" },
    { id: "bookmarks", label: "Linked bookmarks" },
  ];
  return (
    <aside
      aria-label="Task details"
      className="app-scrollbar flex h-full min-h-0 flex-col overflow-y-auto rounded-lg border border-border bg-surface p-3"
    >
      <div className="sticky top-0 z-10 mb-4 flex items-center justify-between border-b border-border bg-surface pb-3">
        <h2
          dir="auto"
          id="task-details-title"
          className="min-w-0 truncate text-sm font-semibold text-fg"
        >
          {title || task.title}
        </h2>
        <div className="flex items-center gap-3">
          <button
            onClick={onDelete}
            aria-label="Delete task"
            title="Delete task"
            className="cursor-pointer disabled:cursor-not-allowed rounded p-1 text-muted hover:bg-page hover:text-red-500"
          >
            <Trash2 size={18} aria-hidden="true" />
          </button>
          <button
            onClick={onClose}
            aria-label="Close task details"
            title="Close task details"
            className="cursor-pointer disabled:cursor-not-allowed rounded p-1 text-muted hover:bg-page hover:text-fg"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
      </div>
      <div role="tablist" aria-label="Task details sections" className="mb-4 flex border-b border-border">
        {tabs.map((item, index) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={`${tabId}-tab-${item.id}`}
            aria-controls={`${tabId}-panel-${item.id}`}
            aria-selected={tab === item.id}
            tabIndex={tab === item.id ? 0 : -1}
            onClick={() => setTab(item.id)}
            onKeyDown={(event) => {
              let next = index;
              if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
              else if (event.key === "ArrowLeft") next = (index + tabs.length - 1) % tabs.length;
              else if (event.key === "Home") next = 0;
              else if (event.key === "End") next = tabs.length - 1;
              else return;
              event.preventDefault();
              const target = tabs[next]!;
              setTab(target.id);
              document.getElementById(`${tabId}-tab-${target.id}`)?.focus();
            }}
            className={`cursor-pointer disabled:cursor-not-allowed min-w-0 flex-1 border-b-2 px-2 py-2 text-xs font-medium ${tab === item.id ? "border-accent text-fg" : "border-transparent text-muted hover:text-fg"}`}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="space-y-4">
        <div role="tabpanel" id={`${tabId}-panel-info`} aria-labelledby={`${tabId}-tab-info`} hidden={tab !== "info"} className="space-y-3">
          <input
            dir="auto"
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
              className="cursor-pointer disabled:cursor-not-allowed mt-1 w-full rounded-md border border-border bg-page px-3 py-2 text-sm text-fg focus:border-accent focus:outline-none"
            >
              {columns.map((column) => (
                <option key={column.id} value={column.id}>
                  {column.title}
                </option>
              ))}
            </select>
          </label>
          <textarea
            dir="auto"
            value={description}
            onChange={(event) => onDescriptionChange(event.target.value)}
            placeholder="Description"
            rows={5}
            className="w-full resize-y rounded-md border border-border bg-page px-3 py-2 text-sm text-fg placeholder-muted focus:border-accent focus:outline-none"
          />
          <button
            onClick={onSave}
            className="cursor-pointer disabled:cursor-not-allowed min-h-9 w-full rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-foreground hover:brightness-110"
          >
            Save details
          </button>
        </div>
        <div role="tabpanel" id={`${tabId}-panel-notes`} aria-labelledby={`${tabId}-tab-notes`} hidden={tab !== "notes"}>
          <LinkPicker
            title="Link notes"
            items={notes.map((note) => ({
              id: note.stableId ?? note.id,
              label: note.title,
              detail: note.id,
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
        </div>
        <div role="tabpanel" id={`${tabId}-panel-bookmarks`} aria-labelledby={`${tabId}-tab-bookmarks`} hidden={tab !== "bookmarks"}>
          <LinkPicker
            title="Link bookmarks"
            items={bookmarks.map((bookmark) => ({
              id: bookmark.id,
              label: bookmark.title || bookmark.url || bookmark.id,
              detail: bookmark.url,
            }))}
            selected={task.bookmarkIds}
            onToggle={(id) => onToggleLink("bookmark", id)}
          />
        </div>
      </div>
    </aside>
  );
}
