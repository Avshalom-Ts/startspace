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
  Image as ImageIcon,
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
import { deleteImage, moveImage, readNote } from "./notes-workspace";
import { readLastNote, writeLastNote } from "./last-note";
import { readDraft, writeDraft, type SavedDraft } from "./draft-recovery";
import { matchesNoteReference } from "./note-identity";
import { useNotePreferences } from "./use-note-preferences";
import { demoIndex } from "./notes-demo";
import { fileTitle, visibleNotes, type NotesView } from "./notes-model";
import { NotesNavigator } from "./notes-navigator";
import { NotesInspector } from "./notes-inspector";
import { NotesDialog } from "./notes-dialog";
import { LocalImage, MarkdownPreview } from "./markdown-preview";
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
  const preferences = useNotePreferences(
    workspace.grant.handle,
    workspace.grant.id,
    workspace.grant.permission,
    demo,
  );
  const updatePreferenceRef = useRef(preferences.update);
  updatePreferenceRef.current = preferences.update;
  const [demoNotes, setDemoNotes] = useState(demoIndex);
  const [demoId, setDemoId] = useState(demoIndex.notes[0]!.id);
  const [imageId, setImageId] = useState<string | null>(null);
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
  const [recovery, setRecovery] = useState<SavedDraft | null>(null);
  const [recoveryChecked, setRecoveryChecked] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saveConflict, setSaveConflict] = useState(false);
  const [action, setAction] = useState<
    | "note"
    | "folder"
    | "rename"
    | "move"
    | "delete"
    | "save-as"
    | "delete-folder"
    | "rename-folder"
    | "rename-image"
    | "move-image"
    | "delete-image"
    | null
  >(null);
  const [actionFolder, setActionFolder] = useState("");
  const [name, setName] = useState("");
  const [destination, setDestination] = useState("");
  const [actionError, setActionError] = useState("");
  const [pending, setPending] = useState<(() => void) | null>(null);
  const pendingRef = useRef<(() => void) | null>(null);
  const openAttemptRef = useRef(0);
  const restorationRef = useRef<string | null>(null);
  const draftCheckRef = useRef<string | null>(null);
  const workspaceIdRef = useRef(workspace.grant.id);
  workspaceIdRef.current = workspace.grant.id;
  const workspaceHandleRef = useRef(workspace.grant.handle);
  workspaceHandleRef.current = workspace.grant.handle;
  const failedSaveRef = useRef<string | null>(null);
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const index = demo ? demoNotes : (notes.index ?? emptyIndex);
  const realFavorites = index.notes
    .filter(
      (note) =>
        note.stableId && preferences.document?.notes[note.stableId]?.favorite,
    )
    .map((note) => note.id);
  const realRecent = index.notes
    .filter(
      (note) =>
        note.stableId &&
        preferences.document?.notes[note.stableId]?.lastOpenedAt,
    )
    .sort((first, second) =>
      (
        preferences.document?.notes[second.stableId!]?.lastOpenedAt ?? ""
      ).localeCompare(
        preferences.document?.notes[first.stableId!]?.lastOpenedAt ?? "",
      ),
    )
    .map((note) => note.id);
  useEffect(() => {
    if (!demo && notes.index && notes.indexHandle === workspace.grant.handle)
      void preferences.refresh();
  }, [
    demo,
    notes.index,
    notes.indexHandle,
    workspace.grant.handle,
    preferences.refresh,
  ]);
  const activeImage = (index.images ?? []).find(
    (image) => image.id === imageId,
  );
  useEffect(() => setImageId(null), [workspace.grant.handle, demo]);
  const selected = demo
    ? (index.notes.find((note) => note.id === demoId) ?? null)
    : notes.selectedNote;
  useEffect(() => setDirection("auto"), [demo, selected?.id]);
  const dirty = editingId !== null && draft !== baseline;
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;

  useEffect(() => {
    const workspaceId = workspace.grant.id;
    if (
      demo ||
      !workspaceId ||
      recoveryChecked !== workspaceId ||
      recovery ||
      !editingId ||
      !dirty ||
      notes.indexHandle !== workspace.grant.handle ||
      workspace.grant.permission !== "granted"
    )
      return;
    void writeDraft(workspaceId, {
      version: 1,
      noteId: editingId,
      content: draft,
      baseline,
    }).catch(() =>
      notifications.error(
        "Could not store your recovery draft on this device.",
      ),
    );
  }, [
    demo,
    workspace.grant.id,
    workspace.grant.handle,
    workspace.grant.permission,
    notes.indexHandle,
    recoveryChecked,
    recovery,
    editingId,
    dirty,
    draft,
    baseline,
    notifications,
  ]);

  useEffect(() => {
    draftCheckRef.current = null;
    setRecovery(null);
    setRecoveryChecked(null);
  }, [workspace.grant.id, workspace.grant.handle]);

  useEffect(() => {
    const workspaceId = workspace.grant.id;
    if (
      demo ||
      !workspaceId ||
      workspace.grant.permission !== "granted" ||
      !workspace.grant.handle ||
      notes.indexHandle !== workspace.grant.handle ||
      !notes.index ||
      draftCheckRef.current === workspaceId
    )
      return;
    draftCheckRef.current = workspaceId;
    const handle = workspace.grant.handle;
    void readDraft(workspaceId)
      .then(async (saved) => {
        if (
          workspaceIdRef.current !== workspaceId ||
          workspaceHandleRef.current !== handle
        )
          return;
        const savedId = saved?.noteId;
        const matchingNote = savedId
          ? notes.index?.notes.find((note) => note.id === savedId)
          : undefined;
        if (saved && matchingNote?.content === saved.content) {
          await writeDraft(workspaceId, null);
          saved = null;
        }
        if (
          workspaceIdRef.current !== workspaceId ||
          workspaceHandleRef.current !== handle
        )
          return;
        setRecovery(saved);
        setRecoveryChecked(workspaceId);
      })
      .catch(() => {
        if (
          workspaceIdRef.current !== workspaceId ||
          workspaceHandleRef.current !== handle
        )
          return;
        notifications.error(
          "Could not read saved note drafts. Your workspace files were not changed.",
        );
        setRecoveryChecked(workspaceId);
      });
  }, [
    demo,
    workspace.grant.id,
    workspace.grant.handle,
    workspace.grant.permission,
    notes.index,
    notes.indexHandle,
    notifications,
  ]);

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
  const activeNote: NoteEntry | null = activeImage
    ? null
    : (selected ??
      (editingId && dirty
        ? {
            id: editingId,
            title: editingId,
            folder: editingId.split("/").slice(0, -1).join("/"),
            content: baseline,
            modifiedAt: new Date().toISOString(),
          }
        : null));
  const activeTags = demo
    ? ["homelab", "planning"]
    : activeNote?.stableId
      ? (preferences.document?.notes[activeNote.stableId]?.tags ?? [])
      : [];
  const externalConflict =
    !!selected &&
    selected.id === editingId &&
    dirty &&
    selected.content !== baseline;
  useEffect(() => setSaveConflict(false), [editingId]);

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

  /** Opens a note after the dirty-buffer guard and records a workspace recent time. */
  const openNote = useCallback(
    (id: string) => {
      openAttemptRef.current++;
      guard(() => {
        setImageId(null);
        if (demo) setDemoId(id);
        else
          void notes.selectNote(id).then((result) => {
            if (result?.ok && result.value.stableId)
              void updatePreferenceRef.current(
                result.value.stableId,
                (current) => ({
                  ...current,
                  lastOpenedAt: new Date().toISOString(),
                }),
              );
          });
        setFolder(id.split("/").slice(0, -1).join("/"));
        setView("folder");
        setQuery("");
        if (demo)
          setRecent((current) => [
            id,
            ...current.filter((item) => item !== id),
          ]);
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
      recoveryChecked !== workspaceId ||
      recovery !== null ||
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
        if (result.value.stableId)
          void updatePreferenceRef.current(
            result.value.stableId,
            (current) => ({
              ...current,
              lastOpenedAt: new Date().toISOString(),
            }),
          );
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
    recovery,
    recoveryChecked,
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
      if (id) {
        openNote(id);
        return;
      }
      const nextView = params.get("view");
      setView(
        nextView === "recent" || nextView === "favorites" ? nextView : "all",
      );
      setPanel("list");
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
      setSaveConflict(false);
      dirtyRef.current = draftRef.current !== savedDraft;
      failedSaveRef.current = null;
      if (!demo) {
        if (workspace.grant.id)
          void writeDraft(
            workspace.grant.id,
            dirtyRef.current
              ? {
                  version: 1,
                  noteId: activeNote.id,
                  content: draftRef.current,
                  baseline: savedDraft,
                }
              : null,
          ).catch(() =>
            notifications.error(
              "Note saved, but the recovery copy could not be updated.",
            ),
          );
        notifications.success("Note saved.");
      }
      return !dirtyRef.current;
    } catch (cause) {
      const error =
        cause instanceof Error
          ? cause.message
          : "Could not save. Your draft is still here.";
      failedSaveRef.current = `${activeNote.id}\0${savedDraft}\0${baseline}`;
      if (/changed on disk|not found/i.test(error)) setSaveConflict(true);
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
    workspace.grant.id,
    notes.editNote,
    notifications,
  ]);

  useEffect(() => {
    if (
      !dirty ||
      busy ||
      !activeNote ||
      action === "save-as" ||
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
    action,
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
    if (next === "save-as" && activeNote) {
      setAction(next);
      setActionFolder(activeNote.folder);
      setDestination(activeNote.folder);
      setName(`${fileTitle(activeNote)} copy`);
      setActionError("");
      return;
    }
    guard(() => {
      setAction(next);
      setActionFolder(parent);
      setName(
        next === "rename-folder"
          ? (parent.split("/").pop() ?? "")
          : next === "rename" && activeNote
            ? fileTitle(activeNote)
            : next === "rename-image" && activeImage
              ? (activeImage.id.split("/").pop() ?? "")
              : "",
      );
      setDestination(
        next === "move"
          ? (activeNote?.folder ?? "")
          : next === "move-image"
            ? (activeImage?.folder ?? "")
            : parent,
      );
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
      if (
        action === "rename-image" ||
        action === "move-image" ||
        action === "delete-image"
      ) {
        if (!activeImage || !workspace.grant.handle) {
          setActionError("Reconnect the workspace and select an image first.");
          return;
        }
        try {
          if (action === "delete-image") {
            await deleteImage(workspace.grant.handle, activeImage.id);
            setImageId(null);
          } else {
            const nextId = await moveImage(
              workspace.grant.handle,
              activeImage.id,
              action === "rename-image" ? activeImage.folder : destination,
              action === "rename-image"
                ? name.trim()
                : activeImage.id.split("/").pop()!,
            );
            setImageId(nextId);
            setFolder(nextId.split("/").slice(0, -1).join("/"));
            setView("folder");
          }
          await notes.refresh();
          setAction(null);
          notifications.success(
            action === "delete-image"
              ? "Image deleted."
              : action === "rename-image"
                ? "Image renamed."
                : "Image moved.",
          );
        } catch (cause) {
          const message =
            cause instanceof Error ? cause.message : "Could not update image.";
          setActionError(message);
          notifications.error(message);
        }
        return;
      }
      const result =
        action === "note" || action === "save-as"
          ? await notes.createNote(
              destination,
              name.trim(),
              action === "save-as" ? draft : "",
            )
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
                    : action === "rename-folder"
                      ? await notes.renameFolder(actionFolder, name.trim())
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
      if (action === "save-as" && result.value && "content" in result.value) {
        dirtyRef.current = false;
        failedSaveRef.current = null;
        setSaveConflict(false);
        setEditingId(result.value.id);
        setDraft(result.value.content);
        setBaseline(result.value.content);
        await notes.selectNote(result.value.id);
        setFolder(result.value.folder);
        setView("folder");
        setMode("edit");
        setPanel("document");
        if (workspace.grant.id)
          void writeDraft(workspace.grant.id, null).catch(() =>
            notifications.error(
              "The new file was saved, but the recovery copy could not be cleared.",
            ),
          );
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
      if (
        action === "rename-folder" &&
        result.value &&
        "name" in result.value &&
        (folder === actionFolder || folder.startsWith(`${actionFolder}/`))
      )
        setFolder(result.value.id + folder.slice(actionFolder.length));
      setAction(null);
      notifications.success(
        action === "note"
          ? "Note created."
          : action === "save-as"
            ? "Draft saved as a new note."
            : action === "folder"
              ? "Folder created."
              : action === "rename"
                ? "Note renamed."
                : action === "move"
                  ? "Note moved."
                  : action === "delete-folder"
                    ? "Folder deleted."
                    : action === "rename-folder"
                      ? "Folder renamed."
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
    demo ? recent : realRecent,
    demo ? favorites : realFavorites,
    sort,
  );
  const filteredImages =
    !demo && view === "folder"
      ? (index.images ?? [])
          .filter(
            (image) =>
              image.folder === folder &&
              image.id.toLowerCase().includes(query.trim().toLowerCase()),
          )
          .sort((first, second) =>
            sort === "name"
              ? first.id.localeCompare(second.id)
              : second.modifiedAt.localeCompare(first.modifiedAt) ||
                first.id.localeCompare(second.id),
          )
      : [];
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
          (task) =>
            activeNote &&
            task.noteIds.some((reference) =>
              matchesNoteReference(
                reference,
                activeNote.id,
                activeNote.stableId,
                index.noteAliases,
              ),
            ),
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
            bookmarkMeta.metadata[bookmark.id]?.relatedNotes.some((reference) =>
              matchesNoteReference(
                reference,
                activeNote.id,
                activeNote.stableId,
                index.noteAliases,
              ),
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

  if (
    !demo &&
    workspace.grant.id &&
    notes.indexHandle === workspace.grant.handle &&
    recoveryChecked !== workspace.grant.id
  )
    return (
      <p role="status" className="p-6 text-muted">
        Checking for unsaved drafts…
      </p>
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
      {preferences.error && !demo && (
        <div
          role="alert"
          className="mb-2 rounded border border-red-400 p-3 text-sm"
        >
          Note metadata unavailable: {preferences.error}
          <button
            className="ml-3 underline"
            onClick={() => void preferences.refresh()}
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
        {(activeNote || activeImage) && (
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
              (demo ? recent : realRecent).filter((id) =>
                index.notes.some((note) => note.id === id),
              ).length
            }
            favoritesCount={demo ? favorites.length : realFavorites.length}
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
            onRenameFolder={(id) => beginAction("rename-folder", id)}
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
                    ? demo
                      ? "Recent · this session"
                      : "Recent"
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
                  void preferences.refresh();
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
              <span>
                {filtered.length} notes
                {filteredImages.length
                  ? `, ${filteredImages.length} images`
                  : ""}
              </span>
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
            ) : filtered.length || filteredImages.length ? (
              <ul>
                {filteredImages.map((image) => (
                  <li
                    key={image.id}
                    className={
                      "mb-1 rounded-lg " +
                      (activeImage?.id === image.id
                        ? "notes-selected"
                        : "hover:bg-fg/5")
                    }
                  >
                    <button
                      className="flex w-full min-w-0 items-center gap-3 px-3 py-2 text-left"
                      aria-current={
                        activeImage?.id === image.id ? "true" : undefined
                      }
                      onClick={() =>
                        guard(() => {
                          setImageId(image.id);
                          setPanel("document");
                        })
                      }
                    >
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded border border-border bg-fg/5">
                        <LocalImage
                          workspace={workspace.grant.handle}
                          path={image.id}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                        {image.id.split("/").pop()}
                      </span>
                      <span className="shrink-0 text-xs text-muted">
                        {new Date(image.modifiedAt).toLocaleDateString()}
                      </span>
                    </button>
                  </li>
                ))}
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
                    {(demo || note.stableId) && (
                      <button
                        className="notes-icon-button mr-1 mt-3 shrink-0 text-accent"
                        aria-label={"Favorite " + fileTitle(note)}
                        title={"Favorite " + fileTitle(note)}
                        disabled={
                          !demo &&
                          (!!preferences.error || !preferences.document)
                        }
                        aria-pressed={(demo
                          ? favorites
                          : realFavorites
                        ).includes(note.id)}
                        onClick={() => {
                          if (demo)
                            setFavorites((current) =>
                              current.includes(note.id)
                                ? current.filter((id) => id !== note.id)
                                : [...current, note.id],
                            );
                          else if (note.stableId)
                            void preferences
                              .update(note.stableId, (current) => ({
                                ...current,
                                favorite: !current.favorite,
                              }))
                              .then((ok) => {
                                if (!ok)
                                  notifications.error(
                                    "Could not update note favorite.",
                                  );
                              });
                        }}
                      >
                        <Star
                          aria-hidden="true"
                          fill={
                            (demo ? favorites : realFavorites).includes(note.id)
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
          {activeImage ? (
            <div className="flex min-h-0 flex-1 flex-col">
              <header className="flex items-center gap-2 border-b border-border px-6 py-4">
                <ImageIcon
                  size={20}
                  className="shrink-0 text-accent"
                  aria-hidden="true"
                />
                <h1
                  className="min-w-0 flex-1 truncate text-base font-semibold"
                  title={activeImage.id}
                >
                  {activeImage.id.split("/").pop()}
                </h1>
                <details className="relative shrink-0">
                  <summary
                    className="notes-icon-button cursor-pointer list-none"
                    aria-label="Image actions"
                    title="Image actions"
                  >
                    <Ellipsis size={20} aria-hidden="true" />
                  </summary>
                  <div className="absolute right-0 z-20 mt-1 w-40 rounded-lg border border-border bg-surface p-1 shadow-xl">
                    {(
                      ["rename-image", "move-image", "delete-image"] as const
                    ).map((item) => (
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
                        {item.replace("-image", "")}
                      </button>
                    ))}
                  </div>
                </details>
              </header>
              <div className="app-scrollbar flex min-h-0 flex-1 items-center justify-center overflow-auto p-6">
                <LocalImage
                  workspace={workspace.grant.handle}
                  path={activeImage.id}
                  alt={activeImage.id.split("/").pop() ?? "Image"}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            </div>
          ) : activeNote ? (
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
                        {(["rename", "move", "save-as", "delete"] as const)
                          .filter((item) => item !== "save-as" || dirty)
                          .map((item) => (
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
                              {item === "save-as" ? "Save as new file" : item}
                            </button>
                          ))}
                      </div>
                    </details>
                  </div>
                  <p className="flex flex-wrap items-center gap-2 text-xs text-muted">
                    <Clock3 size={15} aria-hidden="true" />
                    Last modified:{" "}
                    {new Date(activeNote.modifiedAt).toLocaleString()}
                    {activeTags.map((tag) => (
                      <span key={tag} className="notes-tag">
                        {tag}
                      </span>
                    ))}
                  </p>
                </div>
              </header>
              {(externalConflict || saveConflict) && dirty && (
                <div
                  role="alert"
                  className="mx-6 mt-3 flex flex-wrap items-center gap-3 border border-red-400 p-3 text-sm"
                >
                  <span className="min-w-0 flex-1">
                    The workspace file changed or is missing. Your draft is
                    preserved.
                  </span>
                  <button
                    className="notes-button"
                    onClick={() => beginAction("save-as")}
                  >
                    Save as new file
                  </button>
                  {selected && (
                    <button
                      className="notes-button"
                      onClick={() =>
                        guard(() => {
                          setDraft(selected.content);
                          setBaseline(selected.content);
                          setSaveConflict(false);
                        })
                      }
                    >
                      Reload disk version
                    </button>
                  )}
                </div>
              )}
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
                    workspace={demo ? null : workspace.grant.handle}
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
            tags={activeTags}
            metadataEnabled={
              !!activeNote?.stableId &&
              !!preferences.document &&
              !preferences.error
            }
            onAddTag={async (tag) => {
              if (!activeNote?.stableId) return false;
              const ok = await preferences.update(
                activeNote.stableId,
                (current) => ({
                  ...current,
                  tags: current.tags.includes(tag)
                    ? current.tags
                    : [...current.tags, tag],
                }),
              );
              if (!ok) notifications.error("Could not add note tag.");
              return ok;
            }}
            onRemoveTag={(tag) => {
              if (!activeNote?.stableId) return;
              void preferences
                .update(activeNote.stableId, (current) => ({
                  ...current,
                  tags: current.tags.filter((item) => item !== tag),
                }))
                .then((ok) => {
                  if (!ok) notifications.error("Could not remove note tag.");
                });
            }}
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
                const previous = taskData.tasks
                  .find((task) => task.id === id)
                  ?.noteIds.find((reference) =>
                    matchesNoteReference(
                      reference,
                      activeNote.id,
                      activeNote.stableId,
                      index.noteAliases,
                    ),
                  );
                if (
                  await taskData.linkTask(
                    id,
                    "note",
                    previous ?? activeNote.stableId ?? activeNote.id,
                  )
                )
                  notifications.success(
                    previous ? "Task unlinked." : "Task linked.",
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
            action === "save-as"
              ? "Save draft as new note"
              : action === "delete-image"
                ? "Delete this image?"
                : action === "rename-image"
                  ? "Rename image"
                  : action === "move-image"
                    ? "Move image"
                    : action === "delete-folder"
                      ? "Delete this empty folder?"
                      : action === "rename-folder"
                        ? "Rename folder"
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
          {action === "delete-image" ? (
            <p className="mb-4 text-sm text-muted">
              {activeImage?.id} will be removed from your workspace. Notes
              referencing it will show a missing image. This cannot be undone
              here.
            </p>
          ) : action === "delete-folder" ? (
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
              {(action === "rename-image" || action === "move-image") && (
                <p className="text-sm text-muted">
                  Notes referencing the old image path will need their Markdown
                  links updated.
                </p>
              )}
              {action === "save-as" && (
                <p className="text-sm text-muted">
                  The original file will not be changed.
                </p>
              )}
              {action !== "move" && action !== "move-image" && (
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
              {action !== "rename" &&
                action !== "rename-image" &&
                action !== "rename-folder" && (
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
              autoFocus={
                action === "delete" ||
                action === "delete-folder" ||
                action === "delete-image"
              }
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
                  action !== "delete-image" &&
                  action !== "delete-folder" &&
                  action !== "move" &&
                  action !== "move-image" &&
                  !name.trim())
              }
              className="notes-primary"
              onClick={() => void applyAction()}
            >
              {busy
                ? "Working…"
                : action === "save-as"
                  ? "Save new note"
                  : action === "delete-image"
                    ? "Delete image"
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
                if (!demo && workspace.grant.id)
                  void writeDraft(workspace.grant.id, null).catch(() =>
                    notifications.error(
                      "Could not discard the saved recovery copy.",
                    ),
                  );
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
      {recovery && !pending && (
        <NotesDialog
          title="Unsaved note draft found"
          onCancel={() => undefined}
        >
          <p className="mb-3 break-all text-sm font-medium">
            {recovery.noteId}
          </p>
          <p className="text-sm text-muted">
            Recover your unsaved edits or discard this device-local copy.
            Recovering does not overwrite the workspace file; a changed or
            missing file keeps your draft in the editor.
          </p>
          <div className="mt-6 flex justify-end gap-2">
            <button
              className="notes-button"
              disabled={busy}
              onClick={async () => {
                if (!workspace.grant.id) return;
                try {
                  await writeDraft(workspace.grant.id, null);
                  setRecovery(null);
                } catch {
                  notifications.error(
                    "Could not discard the saved recovery copy.",
                  );
                }
              }}
            >
              Discard draft
            </button>
            <button
              className="notes-primary"
              disabled={busy}
              onClick={async () => {
                if (
                  !workspace.grant.handle ||
                  workspace.grant.permission !== "granted"
                )
                  return;
                setBusy(true);
                try {
                  restorationRef.current = workspace.grant.id;
                  openAttemptRef.current++;
                  const result = await notes.selectNote(recovery.noteId, true);
                  if (result && !result.ok)
                    notifications.info(
                      result.error.kind === "not-found"
                        ? "The file is missing. Your recovered text is still available to copy."
                        : "Could not read the file. Your recovered text is still available.",
                    );
                  else if (
                    result?.ok &&
                    result.value.content !== recovery.baseline
                  )
                    notifications.warning(
                      "The note changed on disk. Your recovered draft will not overwrite it.",
                    );
                  dirtyRef.current = true;
                  setEditingId(recovery.noteId);
                  setBaseline(recovery.baseline);
                  setDraft(recovery.content);
                  setImageId(null);
                  setFolder(recovery.noteId.split("/").slice(0, -1).join("/"));
                  setView("folder");
                  setMode("edit");
                  setPanel("document");
                  setRecovery(null);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Recover draft
            </button>
          </div>
        </NotesDialog>
      )}
    </section>
  );
}
