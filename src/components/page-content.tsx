import { useMemo } from "react";
import {
  Check,
  ChevronRight,
  Clock3,
  FileText,
  Globe2,
  Star,
} from "lucide-react";
import type { BookmarkNode } from "../hooks/useBookmarks";
import { useBookmarkMetadata, useBookmarkTree } from "../hooks/useBookmarkTree";
import { useConfig } from "../hooks/useConfig";
import { useWorkspace } from "../hooks/useWorkspace";
import { useNotifications } from "../notifications/notification-context";
import { useNotes } from "../notes/use-notes";
import { useNotePreferences } from "../notes/use-note-preferences";
import { useTasks } from "../tasks/use-tasks";
import type { NoteEntry } from "../types/notes";
import { LinkIcon } from "../links/links-ui";

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

  return (
    <div className="mx-auto grid min-h-0 w-full max-w-[1800px] flex-1 grid-cols-1 items-stretch gap-3 pt-3 min-[1024px]:grid-cols-2 min-[1500px]:grid-cols-3 min-[1500px]:grid-rows-2">
      {/* Recent Notes Panel */}
      <div className="contents">
        <DashboardPanel
          title="Recent Notes"
          icon={Clock3}
          href="#notes?view=recent"
          className="min-h-0 min-[1500px]:col-start-1 min-[1500px]:row-start-1 min-[1500px]:row-span-2"
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
      </div>

      {/* Favorites Panel */}
      <div className="contents">
        <DashboardPanel
          title="Favorites"
          icon={Star}
          href="#links?view=favorites"
          className="min-h-0 min-[1500px]:col-start-2 min-[1500px]:row-start-1 min-[1500px]:row-span-2"
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
                  {bookmark.url ? (
                    <LinkIcon
                      title={bookmark.title || bookmark.url}
                      url={bookmark.url}
                      size={32}
                    />
                  ) : (
                    <Globe2
                      size={25}
                      aria-hidden="true"
                      className="text-accent"
                    />
                  )}

                  <span className="w-full truncate text-xs text-fg">
                    {bookmark.title || bookmark.url}
                  </span>
                </a>
              ))}
            </div>
          )}
          {!bookmarkTree.loading && favorites.length === 0 && (
            <p className="mt-2 text-xs text-muted">Add your first favorite.</p>
          )}
        </DashboardPanel>
      </div>

      {/* Tasks Panel */}
      <div className="contents">
        <DashboardPanel
          title="Tasks"
          icon={Check}
          href="#tasks"
          className="min-h-0 min-[1500px]:col-start-3 min-[1500px]:row-start-1 min-[1500px]:row-span-2"
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
    </div>
  );
}
