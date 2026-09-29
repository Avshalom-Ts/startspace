// Four-pane Notes workspace. Reuses existing path-based filesystem and task
// services; demo data is opt-in, session-only and cannot write to user files.
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlignLeft,
  AlignRight,
  Clock3,
  Ellipsis,
  Eye,
  FileText,
  Folder,
  Info,
  Languages,
  PenLine,
  RefreshCw,
  RotateCcw,
  Star,
} from "lucide-react";
import { useWorkspace } from "../hooks/useWorkspace";
import { useBookmarkTree, useBookmarkMetadata } from "../hooks/useBookmarkTree";
import type { BookmarkNode } from "../hooks/useBookmarks";
import { useNotifications } from "../notifications/notification-context";
import { useTasks } from "../tasks/use-tasks";
import type { NoteEntry, NotesIndex } from "../types/notes";
import { useNotes } from "./use-notes";
import { readNote } from "./notes-workspace";
import { readLastNote, writeLastNote } from "./last-note";
import { demoIndex } from "./notes-demo";
import { fileTitle, visibleNotes, type NotesView } from "./notes-model";
import { NotesNavigator } from "./notes-navigator";
import { NotesInspector } from "./notes-inspector";
import { NotesDialog } from "./notes-dialog";
import { MarkdownPreview } from "./markdown-preview";
import type { NoteDirection } from "./markdown-preview";

const emptyIndex: NotesIndex = {
  root: { id: "", name: "Workspace", noteCount: 0 },
  notes: [],
  folders: [],
};
/** Flattens current browser bookmarks for resolving existing note relations. */
function bookmarkLeaves(tree: BookmarkNode[]): BookmarkNode[] {
  return tree.flatMap((node) =>
    node.url ? [node] : bookmarkLeaves(node.children ?? []),
  );
}

/** Coordinates real file editing and progressive layout panels without data migration. */
export function NotesPage() {
  const workspace = useWorkspace();
  const notes = useNotes(workspace);
  const taskData = useTasks();
  const bookmarks = useBookmarkTree();
  const bookmarkMeta = useBookmarkMetadata();
  const notifications = useNotifications();
  const [demo, setDemo] = useState(
    () => new URLSearchParams(location.hash.split("?")[1]).get("demo") === "1",
  );
  const [demoNotes, setDemoNotes] = useState(demoIndex);
  const [demoId, setDemoId] = useState(demoIndex.notes[0]!.id);
  const [folder, setFolder] = useState(demo ? "Work/Infrastructure/Lab" : "");
  const [view, setView] = useState<NotesView>(demo ? "folder" : "all");
  const [recent, setRecent] = useState<string[]>([]);
  const [favorites, setFavorites] = useState([demoIndex.notes[0]!.id]);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"modified" | "name">("modified");
  const [mode, setMode] = useState<"edit" | "preview">("preview");
  const [direction, setDirection] = useState<NoteDirection>("auto");
  const [panel, setPanel] = useState<"list" | "folders" | "document" | "info">(
    "list",
  );
  const [draft, setDraft] = useState("");
  const [baseline, setBaseline] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [action, setAction] = useState<
    "note" | "folder" | "rename" | "move" | "delete" | "delete-folder" | null
  >(null);
  const [actionFolder, setActionFolder] = useState("");
  const [name, setName] = useState("");
  const [destination, setDestination] = useState("");
  const [actionError, setActionError] = useState("");
  const [pending, setPending] = useState<(() => void) | null>(null);
  const pendingRef = useRef<(() => void) | null>(null);
  const openAttemptRef = useRef(0);
  const restorationRef = useRef<string | null>(null);
  const workspaceIdRef = useRef(workspace.grant.id);
  workspaceIdRef.current = workspace.grant.id;
  const failedSaveRef = useRef<string | null>(null);
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const index = demo ? demoNotes : (notes.index ?? emptyIndex);
  const selected = demo
    ? (index.notes.find((note) => note.id === demoId) ?? null)
    : notes.selectedNote;
  useEffect(() => setDirection("auto"), [demo, selected?.id]);
  const dirty = editingId !== null && draft !== baseline;
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;

  // Update clean buffers on disk refresh; retain dirty buffers, including deleted files.
  useEffect(() => {
    if (selected && selected.id !== editingId) {
      setEditingId(selected.id);
      setDraft(selected.content);
      setBaseline(selected.content);
    } else if (selected && !dirtyRef.current) {
      setDraft(selected.content);
      setBaseline(selected.content);
    }
  }, [selected, editingId]);
  const activeNote: NoteEntry | null =
    selected ??
    (editingId && dirty
      ? {
          id: editingId,
          title: editingId,
          folder: editingId.split("/").slice(0, -1).join("/"),
          content: baseline,
          modifiedAt: new Date().toISOString(),
        }
      : null);
  const externalConflict =
    !!selected &&
    selected.id === editingId &&
    dirty &&
    selected.content !== baseline;

  /** Defers navigation until the dirty document has been resolved by the user. */
  const guard = useCallback((next: () => void) => {
    if (dirtyRef.current) {
      pendingRef.current = next;
      setPending(() => next);
    } else next();
  }, []);

  useEffect(() => {
    const protectClose = (event: BeforeUnloadEvent) => {
      if (dirtyRef.current) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    const protectRoute = (event: Event) => {
      if (!dirtyRef.current) return;
      event.preventDefault();
      guard((event as CustomEvent<{ proceed: () => void }>).detail.proceed);
    };
    window.addEventListener("beforeunload", protectClose);
    window.addEventListener("startspace:before-navigate", protectRoute);
    return () => {
      window.removeEventListener("beforeunload", protectClose);
      window.removeEventListener("startspace:before-navigate", protectRoute);
    };
  }, [guard]);

  /** Opens a note after a dirty-buffer guard and records only a session recent list. */
  const openNote = useCallback(
    (id: string) => {
      openAttemptRef.current++;
      guard(() => {
        if (demo) setDemoId(id);
        else void notes.selectNote(id);
        setFolder(id.split("/").slice(0, -1).join("/"));
        setView("folder");
        setQuery("");
        setRecent((current) => [id, ...current.filter((item) => item !== id)]);
        setMode("preview");
        setPanel("document");
      });
    },
    [demo, guard, notes.selectNote],
  );

  useEffect(() => {
    const workspaceId = workspace.grant.id;
    if (!workspaceId || workspace.grant.permission !== "granted") {
      restorationRef.current = null;
      return;
    }
    if (
      demo ||
      notes.indexHandle !== workspace.grant.handle ||
      !notes.index ||
      restorationRef.current === workspaceId
    )
      return;
    restorationRef.current = workspaceId;
    if (new URLSearchParams(location.hash.split("?")[1]).has("note")) return;
    const attempt = openAttemptRef.current;
    void readLastNote(workspaceId).then(async (id) => {
      if (
        !id ||
        attempt !== openAttemptRef.current ||
        workspaceIdRef.current !== workspaceId
      )
        return;
      const result = await notes.selectNote(id, true);
      if (
        attempt !== openAttemptRef.current ||
        workspaceIdRef.current !== workspaceId
      )
        return;
      if (result?.ok) {
        setFolder(result.value.folder);
        setView("folder");
        setPanel("document");
        setMode("preview");
      } else if (result && result.error.kind === "not-found") {
        await writeLastNote(workspaceId, null);
        notifications.info(
          "The last opened note is no longer in this workspace.",
        );
      }
    });
  }, [
    demo,
    workspace.grant.id,
    workspace.grant.handle,
    workspace.grant.permission,
    notes.index,
    notes.indexHandle,
    notes.selectNote,
    notifications,
  ]);

  useEffect(() => {
    const workspaceId = workspace.grant.id;
    if (
      !demo &&
      workspaceId &&
      notes.indexHandle === workspace.grant.handle &&
      selected &&
      notes.index?.notes.some((note) => note.id === selected.id)
    ) {
      void writeLastNote(workspaceId, selected.id);
    }
  }, [
    demo,
    workspace.grant.id,
    workspace.grant.handle,
    notes.index,
    notes.indexHandle,
    selected,
  ]);

  useEffect(() => {
    const workspaceId = workspace.grant.id;
    if (
      demo ||
      !workspaceId ||
      notes.indexHandle !== workspace.grant.handle ||
      !notes.missingNoteId
    )
      return;
    void writeLastNote(workspaceId, null);
    notifications.info("The opened note is no longer in this workspace.");
  }, [
    demo,
    workspace.grant.id,
    workspace.grant.handle,
    notes.indexHandle,
    notes.missingNoteId,
    notifications,
  ]);

  useEffect(() => {
    const openHash = () => {
      if (!location.hash.startsWith("#notes")) return;
      const params = new URLSearchParams(location.hash.split("?")[1]);
      const id = params.get("note");
      if (id) openNote(id);
    };
    openHash();
    window.addEventListener("hashchange", openHash);
    const newNote = () => {
      openAttemptRef.current++;
      guard(() => {
        setAction("note");
        setName("");
        setActionError("");
      });
    };
    window.addEventListener("startspace:new-note", newNote);
    return () => {
      window.removeEventListener("hashchange", openHash);
      window.removeEventListener("startspace:new-note", newNote);
    };
  }, [openNote, guard]);

  useEffect(() => {
    if (demo) return;
    const refresh = () => {
      void notes.refresh();
      void taskData.refresh();
    };
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [demo, notes.refresh, taskData.refresh]);

  /** Saves only if the on-disk base still matches, retaining input on any failure. */
  const save = useCallback(async (): Promise<boolean> => {
    if (!activeNote || busy) return false;
    setBusy(true);
    const savedDraft = draft;
    try {
      if (demo) {
        setDemoNotes((current) => ({
          ...current,
          notes: current.notes.map((note) =>
            note.id === activeNote.id ? { ...note, content: draft } : note,
          ),
        }));
      } else {
        if (!workspace.grant.handle)
          throw new Error("Reconnect the workspace before saving.");
        const disk = await readNote(workspace.grant.handle, activeNote.id);
        if (disk.content !== baseline)
          throw new Error(
            "This file changed on disk. Copy your draft or reload the disk version before saving.",
          );
        const result = await notes.editNote(activeNote.id, draft, baseline);
        if (!result.ok) throw new Error(result.error.message);
      }
      setBaseline(savedDraft);
      dirtyRef.current = draftRef.current !== savedDraft;
      failedSaveRef.current = null;
      if (!demo) notifications.success("Note saved.");
      return true;
    } catch (cause) {
      const error =
        cause instanceof Error
          ? cause.message
          : "Could not save. Your draft is still here.";
      failedSaveRef.current = `${activeNote.id}\0${savedDraft}\0${baseline}`;
      notifications.error(`Could not save note. ${error}`);
      return false;
    } finally {
      setBusy(false);
    }
  }, [
    activeNote,
    busy,
    demo,
    draft,
    baseline,
    workspace.grant.handle,
    notes.editNote,
    notifications,
  ]);

  useEffect(() => {
    if (
      !dirty ||
      busy ||
      !activeNote ||
      editingId !== activeNote.id ||
      externalConflict
    )
      return;
    if (failedSaveRef.current === `${activeNote.id}\0${draft}\0${baseline}`)
      return;
    const timer = window.setTimeout(() => {
      void save();
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [
    activeNote?.id,
    editingId,
    dirty,
    busy,
    draft,
    baseline,
    externalConflict,
    save,
  ]);

  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (dirtyRef.current) void save();
      }
    };
    window.addEventListener("keydown", keyboard);
    return () => window.removeEventListener("keydown", keyboard);
  }, [save]);

  /** Opens a contextual file operation without discarding an unsaved buffer. */
  const beginAction = (next: NonNullable<typeof action>, parent = folder) => {
    if (next === "note") openAttemptRef.current++;
    guard(() => {
      setAction(next);
      setActionFolder(parent);
      setName(next === "rename" && activeNote ? fileTitle(activeNote) : "");
      setDestination(next === "move" ? (activeNote?.folder ?? "") : parent);
      setActionError("");
    });
  };
  /** Performs one real filesystem action; demo controls never reach filesystem services. */
  const applyAction = async () => {
    if (demo) {
      setActionError(
        "File operations are unavailable in demo. Connect a workspace to use them.",
      );
      return;
    }
    setBusy(true);
    try {
      const result =
        action === "note"
          ? await notes.createNote(destination, name.trim(), "")
          : action === "folder"
            ? await notes.createFolder(destination, name.trim())
            : action === "rename" && activeNote
              ? await notes.moveNote(
                  activeNote.id,
                  activeNote.folder,
                  name.trim(),
                )
              : action === "move" && activeNote
                ? await notes.moveNote(
                    activeNote.id,
                    destination,
                    fileTitle(activeNote),
                  )
                : action === "delete" && activeNote
                  ? await notes.deleteNote(activeNote.id)
                  : action === "delete-folder"
                    ? await notes.deleteFolder(actionFolder)
                    : null;
      if (!result?.ok) {
        const error = result && !result.ok ? result.error : null;
        const message = error?.message ?? "Select a note first.";
        setActionError(message);
        if (error?.kind !== "invalid-name" && error?.kind !== "already-exists")
          notifications.error(message);
        return;
      }
      if (action === "note" && result.value && "content" in result.value) {
        await notes.selectNote(result.value.id);
        setMode("edit");
        setPanel("document");
      }
      if (action === "delete") {
        if (workspace.grant.id && activeNote)
          await writeLastNote(workspace.grant.id, null);
        setEditingId(null);
        setDraft("");
        setBaseline("");
      }
      if (action === "delete-folder" && folder === actionFolder) {
        setFolder(actionFolder.split("/").slice(0, -1).join("/"));
      }
      setAction(null);
      notifications.success(
        action === "note"
          ? "Note created."
          : action === "folder"
            ? "Folder created."
            : action === "rename"
              ? "Note renamed."
              : action === "move"
                ? "Note moved."
                : action === "delete-folder"
                  ? "Folder deleted."
                  : "Note deleted.",
      );
    } finally {
      setBusy(false);
    }
  };
  const filtered = visibleNotes(
    index.notes,
    view,
    folder,
    query,
    recent,
    demo ? favorites : [],
    sort,
  );
  const linkedTasks =
    demo && activeNote
      ? [
          {
            id: "demo-task",
            title: "Plan the lab workspace",
            description: "",
            status: "To do",
            noteIds: [activeNote.id],
            bookmarkIds: [],
            createdAt: "",
            updatedAt: "",
          },
        ]
      : taskData.tasks.filter(
          (task) => activeNote && task.noteIds.includes(activeNote.id),
        );
  const linkedBookmarks =
    demo && activeNote
      ? [
          {
            id: "demo-link",
            title: "Markdown guide",
            url: "https://www.markdownguide.org",
          },
        ]
      : bookmarkLeaves(bookmarks.tree).filter(
          (bookmark) =>
            activeNote &&
            bookmarkMeta.metadata[bookmark.id]?.relatedNotes.includes(
              activeNote.id,
            ),
        );

  if (
    !demo &&
    (!workspace.grant.handle || workspace.grant.permission !== "granted")
  )
    return (
      <section className="mx-auto mt-10 max-w-xl rounded-xl border border-border bg-surface p-8 text-center">
        <Folder className="mx-auto mb-4 text-accent" width="40" height="40" />
        <h1 className="text-2xl font-semibold">Your notes, in your folder.</h1>
        <p className="my-4 text-muted">
          Connect a workspace to browse and edit your Markdown files. Everything
          stays on this computer.
        </p>
        {workspace.error && (
          <p role="alert" className="mb-4 text-red-400">
            {workspace.error}
          </p>
        )}
        <button
          className="notes-primary"
          onClick={() => void workspace.chooseWorkspace()}
        >
          {workspace.grant.handle ? "Reconnect workspace" : "Choose workspace"}
        </button>
        <button
          className="notes-button ml-2"
          onClick={() => {
            setDemo(true);
            setFolder("Work/Infrastructure/Lab");
            setView("folder");
          }}
        >
          Preview the layout
        </button>
      </section>
    );

  return (
    <section
      className="flex min-h-0 flex-1 flex-col"
      aria-label="Notes workspace"
    >
      {demo && (
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded border border-accent/30 bg-accent/10 px-4 py-2 text-xs">
          <span>
            <strong>Design preview</strong> · Synthetic notes and relationships.
            Nothing is saved to your workspace.
          </span>
          <button
            className="underline"
            onClick={() =>
              guard(() => {
                setDemo(false);
                setEditingId(null);
                setDraft("");
                setBaseline("");
                setFolder("");
                setView("all");
                setFavorites([]);
              })
            }
          >
            Exit preview
          </button>
        </div>
      )}
      {notes.error && !demo && (
        <div
          role="alert"
          className="mb-2 rounded border border-red-400 p-3 text-sm"
        >
          {notes.error.message}
          <button
            className="ml-3 underline"
            onClick={() => void notes.refresh()}
          >
            Retry
          </button>
        </div>
      )}
      <div className="mb-2 flex flex-wrap gap-2 min-[1600px]:hidden">
        <button
          className="notes-button min-[1280px]:hidden"
          onClick={() => setPanel(panel === "folders" ? "list" : "folders")}
        >
          <Folder size={20} aria-hidden="true" />
          Folders
        </button>
        <button
          className="notes-button min-[1024px]:hidden"
          onClick={() => setPanel("list")}
        >
          <FileText size={20} aria-hidden="true" />
          Notes
        </button>
        {activeNote && (
          <button
            className="notes-button min-[1024px]:hidden"
            onClick={() => setPanel("document")}
          >
            Document
          </button>
        )}
        <button
          className="notes-button ml-auto"
          onClick={() => setPanel(panel === "info" ? "document" : "info")}
        >
          <Info size={20} aria-hidden="true" />
          Info
        </button>
      </div>
      <div className="notes-frame flex-1" data-panel={panel}>
        <div className="notes-folders border-r border-border">
          <NotesNavigator
            index={index}
            view={view}
            folder={folder}
            activeFolder={activeNote?.folder ?? ""}
            workspace={demo ? null : workspace.grant.handle}
            recentCount={
              recent.filter((id) => index.notes.some((note) => note.id === id))
                .length
            }
            favoritesCount={favorites.length}
            demo={demo}
            onClose={() => setPanel("list")}
            onView={(next) => {
              setView(next);
              setPanel("list");
            }}
            onFolder={(id) => {
              setFolder(id);
              setView("folder");
              setPanel("list");
            }}
            onCreate={beginAction}
            onDeleteFolder={(id) => beginAction("delete-folder", id)}
          />
        </div>
        <section
          aria-label="Note list in folder"
          className="notes-list flex min-h-0 flex-col border-r border-border"
        >
          <header className="border-b border-border px-5 py-4">
            <div className="mb-3 flex items-center gap-2">
              <Folder
                size={20}
                className="shrink-0 text-accent"
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1 truncate text-sm" title={folder}>
                {view === "folder"
                  ? folder || index.root.name
                  : view === "recent"
                    ? "Recent · this session"
                    : view === "favorites"
                      ? "Favorites"
                      : "All Notes"}
              </span>
              <button
                title="Refresh workspace"
                className="notes-icon-button"
                aria-label="Refresh workspace"
                disabled={demo || busy}
                onClick={() => {
                  void notes.refresh();
                  void taskData.refresh();
                }}
              >
                <RefreshCw size={20} aria-hidden="true" />
              </button>
            </div>
            <input
              type="search"
              className="notes-input"
              placeholder="Filter notes…"
              aria-label="Filter notes"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <div className="mt-3 flex items-center justify-between text-xs text-muted">
              <span>{filtered.length} notes</span>
              <select
                aria-label="Sort notes"
                className="bg-surface p-1 text-muted"
                value={sort}
                onChange={(event) => setSort(event.target.value as typeof sort)}
              >
                <option value="modified">Last modified</option>
                <option value="name">Name A–Z</option>
              </select>
            </div>
          </header>
          <div className="app-scrollbar min-h-0 flex-1 overflow-auto p-3">
            {notes.loading && !notes.index && !demo ? (
              <p role="status" className="p-3 text-muted">
                Loading workspace…
              </p>
            ) : filtered.length ? (
              <ul>
                {filtered.map((note) => (
                  <li
                    key={note.id}
                    className={
                      "group mb-1 flex rounded-lg border border-transparent " +
                      (activeNote?.id === note.id
                        ? "notes-selected"
                        : "hover:bg-fg/5")
                    }
                  >
                    <button
                      className="flex min-w-0 flex-1 items-center gap-3 px-3 py-4 text-left"
                      aria-current={
                        activeNote?.id === note.id ? "true" : undefined
                      }
                      onClick={() => openNote(note.id)}
                    >
                      <FileText
                        aria-hidden="true"
                        className={
                          "mt-1 shrink-0 " +
                          (activeNote?.id === note.id
                            ? "text-accent"
                            : "text-muted")
                        }
                        width="24"
                        height="24"
                      />
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                          {fileTitle(note)}
                        </span>
                        <span className="ml-auto shrink-0 whitespace-nowrap text-xs text-muted">
                          {new Date(note.modifiedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </button>
                    {demo && (
                      <button
                        className="notes-icon-button mr-1 mt-3 shrink-0 text-accent"
                        aria-label={"Favorite " + fileTitle(note)}
                        title={"Favorite " + fileTitle(note)}
                        aria-pressed={favorites.includes(note.id)}
                        onClick={() =>
                          setFavorites((current) =>
                            current.includes(note.id)
                              ? current.filter((id) => id !== note.id)
                              : [...current, note.id],
                          )
                        }
                      >
                        <Star
                          aria-hidden="true"
                          fill={
                            favorites.includes(note.id)
                              ? "currentColor"
                              : "none"
                          }
                        />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-5 text-sm text-muted">
                <p>
                  {query ? "No matching notes." : "No notes in this view yet."}
                </p>
                <button
                  className="mt-3 text-accent underline"
                  onClick={() => (query ? setQuery("") : beginAction("note"))}
                >
                  {query ? "Clear filter" : "Create a note"}
                </button>
              </div>
            )}
          </div>
        </section>
        <section
          aria-label="Note document"
          className="notes-document flex min-h-0 min-w-0 flex-col"
        >
          {activeNote ? (
            <>
              <header className="px-6 pt-2">
                <div className="flex flex-col">
                  <div className="flex items-center justify-between gap-1">
                    <p className="flex items-center text-xs text-muted">
                      <FileText size={16} aria-hidden="true" />
                      <span className="truncate pl-1" title={activeNote.id}>
                        {activeNote.folder + "/" || index.root.name + "/"}
                      </span>
                    </p>
                    <h1 className="min-w-0 wrap-break-word text-base font-semibold tracking-tight text-muted">
                      {fileTitle(activeNote)}
                    </h1>
                    <button
                      className="notes-icon-button ml-auto shrink-0"
                      aria-label={
                        mode === "edit" ? "Preview note" : "Edit note"
                      }
                      title={mode === "edit" ? "Preview note" : "Edit note"}
                      onClick={() =>
                        setMode(mode === "edit" ? "preview" : "edit")
                      }
                    >
                      {mode === "edit" ? (
                        <Eye size={20} aria-hidden="true" />
                      ) : (
                        <PenLine size={20} aria-hidden="true" />
                      )}
                    </button>
                    {externalConflict && !busy && (
                      <button
                        className="notes-icon-button shrink-0"
                        aria-label="Reload disk version"
                        title="Reload disk version"
                        onClick={() =>
                          guard(() => {
                            if (selected) {
                              setDraft(selected.content);
                              setBaseline(selected.content);
                            }
                          })
                        }
                      >
                        <RotateCcw size={20} aria-hidden="true" />
                      </button>
                    )}
                    <details className="relative shrink-0">
                      <summary
                        className="notes-icon-button cursor-pointer list-none"
                        aria-label={`Text direction: ${direction}`}
                        title={`Text direction: ${direction}`}
                      >
                        {direction === "auto" ? (
                          <Languages size={20} aria-hidden="true" />
                        ) : direction === "rtl" ? (
                          <AlignRight size={20} aria-hidden="true" />
                        ) : (
                          <AlignLeft size={20} aria-hidden="true" />
                        )}
                      </summary>
                      <div
                        className="absolute right-0 z-30 mt-1 w-32 rounded border border-border bg-surface p-1 shadow-xl"
                        role="group"
                        aria-label="Text direction"
                      >
                        {(["auto", "ltr", "rtl"] as const).map((option) => (
                          <button
                            key={option}
                            className="block w-full rounded p-2 text-left text-sm hover:bg-fg/10"
                            aria-pressed={direction === option}
                            onClick={(event) => {
                              setDirection(option);
                              event.currentTarget
                                .closest("details")
                                ?.removeAttribute("open");
                            }}
                          >
                            {option === "auto" ? "Auto" : option.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </details>
                    <details className="relative shrink-0">
                      <summary
                        className="notes-icon-button cursor-pointer list-none"
                        aria-label="Note actions"
                        title="Note actions"
                      >
                        <Ellipsis size={20} aria-hidden="true" />
                      </summary>
                      <div className="absolute right-0 z-20 mt-1 w-40 rounded-lg border border-border bg-surface p-1 shadow-xl">
                        {(["rename", "move", "delete"] as const).map((item) => (
                          <button
                            key={item}
                            className="block w-full rounded p-2 text-left text-sm capitalize hover:bg-fg/10"
                            onClick={(event) => {
                              event.currentTarget
                                .closest("details")
                                ?.removeAttribute("open");
                              beginAction(item);
                            }}
                          >
                            {item}
                          </button>
                        ))}
                      </div>
                    </details>
                  </div>
                  <p className="flex flex-wrap items-center gap-2 text-xs text-muted">
                    <Clock3 size={15} aria-hidden="true" />
                    Last modified:{" "}
                    {new Date(activeNote.modifiedAt).toLocaleString()}
                    {demo && (
                      <>
                        <span className="notes-tag">homelab</span>
                        <span className="notes-tag">planning</span>
                      </>
                    )}
                  </p>
                </div>
              </header>
              <div className="app-scrollbar min-h-0 flex-1 overflow-auto">
                {mode === "edit" ? (
                  <textarea
                    dir={direction}
                    className="min-h-full w-full resize-none bg-transparent p-6 font-mono text-sm leading-7 outline-none"
                    aria-label="Markdown content"
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    spellCheck={false}
                  />
                ) : (
                  <MarkdownPreview
                    content={draft}
                    folder={activeNote.folder}
                    direction={direction}
                    onOpenNote={openNote}
                    onCopyResult={(success) =>
                      success
                        ? notifications.success("Code copied.")
                        : notifications.error(
                            "Could not copy code to the clipboard.",
                          )
                    }
                  />
                )}
              </div>
            </>
          ) : (
            <div className="flex h-full min-h-80 flex-col items-center justify-center p-8 text-center">
              <FileText width="40" height="40" className="mb-4 text-accent" />
              <h1 className="text-2xl font-semibold">Select a note</h1>
              <p className="mt-3 max-w-xs text-sm text-muted">
                Choose a Markdown file from the list, or start something new.
              </p>
              <button
                className="notes-primary mt-5"
                onClick={() => beginAction("note")}
              >
                New note
              </button>
            </div>
          )}
        </section>
        <div className="notes-info border-l border-border">
          <NotesInspector
            note={activeNote}
            demo={demo}
            links={linkedBookmarks}
            tasks={linkedTasks}
            availableTasks={taskData.tasks}
            taskError={taskData.error}
            bookmarkError={bookmarks.error}
            busy={busy}
            onClose={() => setPanel("document")}
            onLinkTask={async (id) => {
              if (!activeNote) return;
              setBusy(true);
              try {
                const linked = linkedTasks.some((task) => task.id === id);
                if (await taskData.linkTask(id, "note", activeNote.id))
                  notifications.success(
                    linked ? "Task unlinked." : "Task linked.",
                  );
                else notifications.error("Could not update the task link.");
              } finally {
                setBusy(false);
              }
            }}
          />
        </div>
      </div>
      {action && (
        <NotesDialog
          title={
            action === "delete-folder"
              ? "Delete this empty folder?"
              : action === "delete"
                ? "Delete this Markdown file?"
                : action === "note"
                  ? "New note"
                  : action === "folder"
                    ? "New folder"
                    : action === "rename"
                      ? "Rename note"
                      : "Move note"
          }
          onCancel={() => {
            if (!busy) setAction(null);
          }}
        >
          {action === "delete-folder" ? (
            <p className="mb-4 text-sm text-muted">
              {actionFolder} will be removed only if it is empty. This cannot be
              undone here.
            </p>
          ) : action === "delete" ? (
            <p className="mb-4 text-sm text-muted">
              {activeNote?.id} will be removed from your workspace. This cannot
              be undone here.
            </p>
          ) : (
            <div className="space-y-4">
              {action !== "move" && (
                <label className="block text-sm">
                  Name
                  <input
                    autoFocus
                    required
                    className="notes-input mt-2"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && name.trim() && !busy)
                        void applyAction();
                    }}
                  />
                </label>
              )}
              {action !== "rename" && (
                <label className="block text-sm">
                  Folder
                  <select
                    className="notes-input mt-2"
                    value={destination}
                    onChange={(event) => setDestination(event.target.value)}
                  >
                    <option value="">Workspace root</option>
                    {index.folders.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.id}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          )}
          {actionError && (
            <p role="alert" className="mt-4 text-sm text-red-400">
              {actionError}
            </p>
          )}
          <div className="mt-6 flex justify-end gap-2">
            <button
              autoFocus={action === "delete" || action === "delete-folder"}
              disabled={busy}
              className="notes-button"
              onClick={() => setAction(null)}
            >
              Cancel
            </button>
            <button
              disabled={
                busy ||
                (action !== "delete" &&
                  action !== "delete-folder" &&
                  action !== "move" &&
                  !name.trim())
              }
              className="notes-primary"
              onClick={() => void applyAction()}
            >
              {busy
                ? "Working…"
                : action === "delete-folder"
                  ? "Delete folder"
                  : action === "delete"
                    ? "Delete file"
                    : "Confirm"}
            </button>
          </div>
        </NotesDialog>
      )}
      {pending && (
        <NotesDialog
          title="Save your changes?"
          onCancel={() => {
            pendingRef.current = null;
            setPending(null);
          }}
        >
          <p className="text-sm text-muted">
            This note has unsaved changes. Save them before continuing, or
            discard this draft.
          </p>
          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <button
              autoFocus
              className="notes-button"
              disabled={busy}
              onClick={() => {
                pendingRef.current = null;
                setPending(null);
              }}
            >
              Cancel
            </button>
            <button
              className="notes-button"
              disabled={busy}
              onClick={() => {
                dirtyRef.current = false;
                setDraft(selected?.content ?? baseline);
                setBaseline(selected?.content ?? baseline);
                const next = pendingRef.current;
                pendingRef.current = null;
                setPending(null);
                next?.();
              }}
            >
              Discard
            </button>
            <button
              className="notes-primary"
              disabled={busy}
              onClick={async () => {
                if (await save()) {
                  const next = pendingRef.current;
                  pendingRef.current = null;
                  setPending(null);
                  next?.();
                }
              }}
            >
              Save & continue
            </button>
          </div>
        </NotesDialog>
      )}
    </section>
  );
}
