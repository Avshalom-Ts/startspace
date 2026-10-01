import { useMemo, useState } from "react";
import {
  Check,
  ChevronRight,
  Clock3,
  FileText,
  Folder,
  Globe2,
  Plus,
  Star,
  X,
} from "lucide-react";
import type { BookmarkNode } from "../hooks/useBookmarks";
import { useBookmarkMetadata, useBookmarkTree } from "../hooks/useBookmarkTree";
import { useConfig } from "../hooks/useConfig";
import { useWorkspace } from "../hooks/useWorkspace";
import { useNotifications } from "../notifications/notification-context";
import { useNotes } from "../notes/use-notes";
import { useNotePreferences } from "../notes/use-note-preferences";
import { useTasks } from "../tasks/use-tasks";
import type { FolderEntry, NoteEntry } from "../types/notes";

function flattenBookmarks(nodes: BookmarkNode[]): BookmarkNode[] {
  return nodes.flatMap((node) =>
    node.url ? [node] : flattenBookmarks(node.children ?? []),
  );
}

function relativeTime(value: string | null | undefined): string {
  if (!value) return "";
  const elapsed = Math.max(0, Date.now() - Date.parse(value));
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days < 30 ? `${days}d ago` : new Date(value).toLocaleDateString();
}

function DashboardPanel({
  title,
  icon: Icon,
  href,
  children,
  className = "",
}: {
  title: string;
  icon: typeof Star;
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`min-w-0 rounded-lg border border-border bg-surface/40 p-3 ${className}`}
    >
      <div className="mb-2 flex items-center gap-2 border-b border-border pb-2">
        <Icon size={18} aria-hidden="true" className="text-accent" />
        <h2 className="min-w-0 flex-1 truncate text-sm font-semibold text-fg">
          {title}
        </h2>
        <a
          href={href}
          aria-label={`View all ${title}`}
          title={`View all ${title}`}
          className="rounded p-1 text-muted hover:bg-page hover:text-fg"
        >
          <ChevronRight size={17} aria-hidden="true" />
        </a>
      </div>
      {children}
    </section>
  );
}

function parentFolder(path: string): string {
  const separator = path.lastIndexOf("/");
  return separator < 0 ? "" : path.slice(0, separator);
}

/** Renders live browser and workspace data on the Home dashboard. */
export function PageContent() {
  const workspace = useWorkspace();
  const notes = useNotes(workspace);
  const notePreferences = useNotePreferences(
    workspace.grant.handle,
    workspace.grant.id,
    workspace.grant.permission,
    false,
  );
  const tasks = useTasks();
  const bookmarkTree = useBookmarkTree();
  const bookmarkData = useBookmarkMetadata();
  const { config } = useConfig();
  const notifications = useNotifications();
  const [addFavoriteOpen, setAddFavoriteOpen] = useState(false);

  const bookmarks = useMemo(
    () => flattenBookmarks(bookmarkTree.tree),
    [bookmarkTree.tree],
  );
  const favorites = useMemo(
    () =>
      bookmarks
        .filter((bookmark) => bookmarkData.metadata[bookmark.id]?.favorites)
        .sort(
          (first, second) =>
            first.title.localeCompare(second.title) ||
            first.id.localeCompare(second.id),
        )
        .slice(0, 7),
    [bookmarks, bookmarkData.metadata],
  );
  const recentNotes = useMemo(() => {
    const metadata = notePreferences.document?.notes ?? {};
    return (notes.index?.notes ?? [])
      .filter((note) => note.stableId && metadata[note.stableId]?.lastOpenedAt)
      .sort((first, second) =>
        (metadata[second.stableId!]?.lastOpenedAt ?? "").localeCompare(
          metadata[first.stableId!]?.lastOpenedAt ?? "",
        ),
      )
      .slice(0, 5);
  }, [notes.index, notePreferences.document]);
  const pendingTasks = useMemo(() => {
    const doneStatus = tasks.columns.find(
      (column) => column.title.toLowerCase() === "done",
    )?.id;
    return [...tasks.tasks]
      .sort((first, second) => {
        const firstDone = first.status === doneStatus;
        const secondDone = second.status === doneStatus;
        return (
          Number(firstDone) - Number(secondDone) ||
          second.updatedAt.localeCompare(first.updatedAt) ||
          first.id.localeCompare(second.id)
        );
      })
      .slice(0, 5);
  }, [tasks.tasks, tasks.columns]);

  const openInNewTab = config?.preferences?.openLinksInNewTab ?? false;
  const bookmarkTarget = openInNewTab ? "_blank" : "_self";
  const workspaceReady =
    workspace.grant.handle && workspace.grant.permission === "granted";

  const addFavorite = async (bookmark: BookmarkNode) => {
    try {
      await bookmarkData.update(bookmark.id, { favorites: true });
      setAddFavoriteOpen(false);
      notifications.success("Favorite added.");
    } catch {
      notifications.error("Favorite could not be saved. Try again.");
    }
  };

  const toggleTaskDone = async (task: (typeof tasks.tasks)[number]) => {
    const doneStatus = tasks.columns.find(
      (column) => column.title.toLowerCase() === "done",
    )?.id;
    const openStatus = tasks.columns.find(
      (column) => column.id !== doneStatus,
    )?.id;
    if (!doneStatus || !openStatus) return;
    const nextStatus = task.status === doneStatus ? openStatus : doneStatus;
    if (!(await tasks.updateTask(task.id, { status: nextStatus })))
      notifications.error("Task completion could not be saved. Try again.");
  };

  const folders = notes.index?.folders ?? [];
  const notesByFolder = notes.index?.notes ?? [];
  const folderCount = (folder: FolderEntry): number =>
    notesByFolder.filter(
      (note) =>
        note.folder === folder.id || note.folder.startsWith(`${folder.id}/`),
    ).length;
  const topFolders = folders
    .filter((folder) => folder.id && !parentFolder(folder.id))
    .slice(0, 7);
  const renderFolder = (folder: FolderEntry, depth = 0): React.ReactNode => {
    const nestedFolders = folders.filter(
      (candidate) => parentFolder(candidate.id) === folder.id,
    );
    const folderNotes = notesByFolder.filter(
      (note) => note.folder === folder.id,
    );
    return (
      <details
        key={folder.id}
        className="group"
        style={{ marginLeft: depth * 12 }}
      >
        <summary className="flex min-h-8 cursor-pointer list-none items-center gap-2 border-b border-border/70 text-sm text-fg marker:hidden">
          <ChevronRight
            size={13}
            aria-hidden="true"
            className="shrink-0 transition-transform group-open:rotate-90"
          />
          <Folder
            size={15}
            aria-hidden="true"
            className="shrink-0 text-accent"
          />
          <span className="min-w-0 flex-1 truncate">{folder.name}</span>
          <span className="rounded bg-page px-1.5 py-0.5 text-xs text-muted">
            {folderCount(folder)}
          </span>
        </summary>
        {(nestedFolders.length > 0 || folderNotes.length > 0) && (
          <div className="border-l border-border pl-2">
            {nestedFolders.map((child) => renderFolder(child, depth + 1))}
            {folderNotes.slice(0, 6).map((note) => (
              <a
                key={note.id}
                href={`#notes?note=${encodeURIComponent(note.id)}`}
                className="flex min-h-7 items-center gap-2 truncate text-xs text-muted hover:text-accent"
              >
                <FileText size={13} aria-hidden="true" /> {note.title}
              </a>
            ))}
          </div>
        )}
      </details>
    );
  };

  return (
    <div className="mx-auto grid min-h-0 w-full max-w-[1800px] flex-1 grid-cols-1 items-stretch gap-3 pt-3 min-[1024px]:grid-cols-2 min-[1500px]:grid-cols-3 min-[1500px]:grid-rows-2">
      <div className="contents">
        <DashboardPanel
          title="Favorites"
          icon={Star}
          href="#links?view=favorites"
          className="order-2 min-h-0 min-[1500px]:col-start-2 min-[1500px]:row-start-1 min-[1500px]:row-span-2"
        >
          {bookmarkTree.loading || bookmarkData.loading ? (
            <p className="py-4 text-sm text-muted">Loading favorites…</p>
          ) : (
            <div className="grid grid-cols-2 gap-2 min-[768px]:grid-cols-4">
              {favorites.map((bookmark) => (
                <a
                  key={bookmark.id}
                  href={bookmark.url}
                  target={bookmarkTarget}
                  rel="noopener noreferrer"
                  className="flex min-h-20 min-w-0 flex-col items-center justify-center gap-2 rounded-md border border-border bg-page/70 p-2 text-center hover:border-accent/60 hover:bg-accent/10"
                >
                  <Globe2
                    size={25}
                    aria-hidden="true"
                    className="text-accent"
                  />
                  <span className="w-full truncate text-xs text-fg">
                    {bookmark.title || bookmark.url}
                  </span>
                </a>
              ))}
              <button
                type="button"
                onClick={() => setAddFavoriteOpen(true)}
                className="flex min-h-20 flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border text-xs text-muted hover:border-accent/60 hover:text-fg"
              >
                <Plus size={22} aria-hidden="true" /> Add
              </button>
            </div>
          )}
          {!bookmarkTree.loading && favorites.length === 0 && (
            <p className="mt-2 text-xs text-muted">Add your first favorite.</p>
          )}
        </DashboardPanel>
      </div>

      <div className="contents">
        <DashboardPanel
          title="Recent"
          icon={Clock3}
          href="#notes?view=recent"
          className="order-1 min-h-0 min-[1500px]:col-start-1 min-[1500px]:row-start-1 min-[1500px]:row-span-2"
        >
          {!workspaceReady ? (
            <p className="py-2 text-sm text-muted">
              Choose a workspace to see recent notes.
            </p>
          ) : notes.loading || notePreferences.document === null ? (
            <p className="py-2 text-sm text-muted">Loading recent notes…</p>
          ) : recentNotes.length ? (
            <ul>
              {recentNotes.map((note: NoteEntry) => (
                <li key={note.id}>
                  <a
                    href={`#notes?note=${encodeURIComponent(note.id)}`}
                    className="flex min-h-10 items-center gap-2 border-b border-border/70 px-1 hover:bg-accent/10"
                  >
                    <FileText
                      size={17}
                      aria-hidden="true"
                      className="shrink-0 text-accent"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-fg">
                        {note.title}
                      </span>
                      <span className="block truncate text-xs text-muted">
                        {note.folder || "Workspace"}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs text-muted">
                      {relativeTime(
                        notePreferences.document?.notes[note.stableId!]
                          ?.lastOpenedAt,
                      )}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-2 text-sm text-muted">
              Notes you open will appear here.
            </p>
          )}
        </DashboardPanel>

        <DashboardPanel
          title="Tasks"
          icon={Check}
          href="#tasks"
          className="order-3 min-h-0 min-[1500px]:col-start-3 min-[1500px]:row-start-1"
        >
          {!workspaceReady ? (
            <p className="py-2 text-sm text-muted">
              Choose a workspace to see tasks.
            </p>
          ) : tasks.loading ? (
            <p className="py-2 text-sm text-muted">Loading tasks…</p>
          ) : pendingTasks.length ? (
            <ul>
              {pendingTasks.map((task) => {
                const doneStatus = tasks.columns.find(
                  (column) => column.title.toLowerCase() === "done",
                )?.id;
                const completed = task.status === doneStatus;
                return (
                  <li
                    key={task.id}
                    className="flex min-h-9 items-center gap-2 border-b border-border/70 px-1"
                  >
                    <button
                      type="button"
                      onClick={() => void toggleTaskDone(task)}
                      aria-label={`${completed ? "Reopen" : "Complete"} ${task.title}`}
                      aria-pressed={completed}
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${completed ? "border-green-500 bg-green-500 text-white" : "border-muted text-transparent hover:border-accent"}`}
                    >
                      {completed && <Check size={13} aria-hidden="true" />}
                    </button>
                    <a
                      href={`#tasks?task=${encodeURIComponent(task.id)}`}
                      className={`min-w-0 flex-1 truncate text-sm ${completed ? "text-muted line-through" : "text-fg hover:text-accent"}`}
                    >
                      {task.title}
                    </a>
                    <span className="max-w-24 truncate text-xs text-muted">
                      {
                        tasks.columns.find(
                          (column) => column.id === task.status,
                        )?.title
                      }
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="flex items-center justify-between py-2 text-sm text-muted">
              <span>No tasks yet.</span>
              <a href="#tasks" className="text-accent hover:underline">
                New task
              </a>
            </div>
          )}
        </DashboardPanel>
      </div>

      <div className="contents">
        <DashboardPanel
          title="Notes"
          icon={FileText}
          href="#notes"
          className="order-4 min-h-0 max-h-128 overflow-y-auto min-[1500px]:col-start-3 min-[1500px]:row-start-2 min-[1500px]:max-h-none"
        >
          {!workspaceReady ? (
            <p className="py-2 text-sm text-muted">
              Choose a workspace to browse notes.
            </p>
          ) : notes.loading ? (
            <p className="py-2 text-sm text-muted">Loading folders…</p>
          ) : topFolders.length ? (
            <div>{topFolders.map((folder) => renderFolder(folder))}</div>
          ) : (
            <div className="flex justify-between py-2 text-sm text-muted">
              <span>No folders yet.</span>
              <a href="#notes" className="text-accent hover:underline">
                New note / folder
              </a>
            </div>
          )}
        </DashboardPanel>
      </div>

      {addFavoriteOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="presentation"
          onMouseDown={(event) =>
            event.target === event.currentTarget && setAddFavoriteOpen(false)
          }
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="favorite-picker-title"
            className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-lg border border-border bg-page p-4 shadow-xl"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2
                id="favorite-picker-title"
                className="text-base font-semibold text-fg"
              >
                Add a favorite
              </h2>
              <button
                type="button"
                onClick={() => setAddFavoriteOpen(false)}
                aria-label="Close favorite picker"
                title="Close"
                className="rounded p-1 text-muted hover:bg-surface"
              >
                <X size={17} aria-hidden="true" />
              </button>
            </div>
            <ul className="space-y-1">
              {bookmarks
                .filter(
                  (bookmark) => !bookmarkData.metadata[bookmark.id]?.favorites,
                )
                .map((bookmark) => (
                  <li key={bookmark.id}>
                    <button
                      type="button"
                      onClick={() => void addFavorite(bookmark)}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-fg hover:bg-surface"
                    >
                      <Globe2
                        size={16}
                        aria-hidden="true"
                        className="text-accent"
                      />
                      <span className="min-w-0 flex-1 truncate">
                        {bookmark.title || bookmark.url}
                      </span>
                    </button>
                  </li>
                ))}
            </ul>
            {bookmarks.length === 0 && (
              <p className="text-sm text-muted">
                No browser bookmarks are available.
              </p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
