import { useCallback, useEffect, useRef, useState } from "react";
import { useWorkspace } from "../hooks/useWorkspace";
import type { FolderEntry, NoteEntry, NotesIndex } from "../types/notes";
import {
  ensureNoteIdentities,
  forgetNoteIdentity,
  readNoteIdentities,
  relocateNoteFolder,
  relocateNoteIdentity,
  stableNoteReference,
  updateNoteIdentities,
} from "./note-identity";
import { migrateNoteEdges } from "./note-link-migration";
import {
  createFolder as createFolderInWorkspace,
  createNote as createNoteInWorkspace,
  deleteFolder as deleteFolderInWorkspace,
  deleteNote as deleteNoteInWorkspace,
  importMarkdownFiles,
  moveNote as moveNoteInWorkspace,
  NoteWorkspaceError,
  readNote,
  renameFolder as renameFolderInWorkspace,
  renameNote as renameNoteInWorkspace,
  scanWorkspace,
  writeNote,
  type ImportResult,
} from "./notes-workspace";

export type NotesUiError = {
  kind:
    | "workspace-missing"
    | "access-revoked"
    | "not-found"
    | "already-exists"
    | "invalid-name"
    | "io"
    | "unknown";
  message: string;
};
export type NoteResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: NotesUiError };

function failure<T>(error: NotesUiError): NoteResult<T> {
  return { ok: false, error };
}
function mapError(error: unknown): NotesUiError {
  if (error instanceof NoteWorkspaceError) {
    const kind =
      error.kind === "invalid-path"
        ? "invalid-name"
        : error.kind === "unavailable"
          ? "workspace-missing"
          : error.kind;
    return { kind, message: error.message };
  }
  return {
    kind: "unknown",
    message: error instanceof Error ? error.message : String(error),
  };
}

/** Reuses a supplied page grant to keep first-time workspace selection in sync. */
export function useNotes(workspace?: ReturnType<typeof useWorkspace>) {
  const fallbackWorkspace = useWorkspace();
  const { grant } = workspace ?? fallbackWorkspace;
  const selectionRef = useRef<string | null>(null);
  const requestRef = useRef(0);
  const handleRef = useRef(grant.handle);
  handleRef.current = grant.handle;
  const [index, setIndex] = useState<NotesIndex | null>(null);
  const indexRef = useRef(index);
  indexRef.current = index;
  const [indexHandle, setIndexHandle] =
    useState<FileSystemDirectoryHandle | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<NotesUiError | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [selectedNote, setSelectedNote] = useState<NoteEntry | null>(null);
  const [missingNoteId, setMissingNoteId] = useState<string | null>(null);
  const [selectedFolderPath, setSelectedFolderPath] = useState("");
  selectionRef.current = selectedNoteId;

  const refresh = useCallback(
    async (selectedId = selectionRef.current) => {
      if (!grant.handle || grant.permission !== "granted") {
        setIndex(null);
        setIndexHandle(null);
        setSelectedNote(null);
        setSelectedNoteId(null);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const nextIndex = await scanWorkspace(grant.handle);
        if (handleRef.current !== grant.handle) return;
        try {
          const identities = await ensureNoteIdentities(
            grant.handle,
            nextIndex.notes.map((note) => note.id),
          );
          nextIndex.notes = nextIndex.notes.map((note) => ({
            ...note,
            stableId: stableNoteReference(identities, note.id),
          }));
          nextIndex.noteAliases = identities.aliases;
          await migrateNoteEdges(grant.handle, identities);
        } catch (cause) {
          setError(mapError(cause));
        }
        setIndex(nextIndex);
        setIndexHandle(grant.handle);
        if (selectedId && selectionRef.current === selectedId) {
          const refreshedSelectedNote =
            nextIndex.notes.find((note) => note.id === selectedId) ?? null;
          setSelectedNote(refreshedSelectedNote);
          if (!refreshedSelectedNote) {
            setSelectedNoteId(null);
            setMissingNoteId(selectedId);
          }
        }
      } catch (cause) {
        setError(mapError(cause));
      } finally {
        setLoading(false);
      }
    },
    [grant.handle, grant.permission],
  );

  useEffect(() => {
    requestRef.current++;
    selectionRef.current = null;
    setSelectedNoteId(null);
    setSelectedNote(null);
    setMissingNoteId(null);
    setIndex(null);
    setIndexHandle(null);
  }, [grant.handle]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (index) window.dispatchEvent(new Event("startspace:workspace-changed"));
  }, [index]);

  const createNote = useCallback(
    async (
      folderId: string,
      name: string,
      content: string,
    ): Promise<NoteResult<NoteEntry>> => {
      if (!grant.handle)
        return failure({
          kind: "workspace-missing",
          message: "Choose a workspace folder first.",
        });
      try {
        const value = await createNoteInWorkspace(
          grant.handle,
          folderId,
          name.endsWith(".md") ? name : `${name}.md`,
          content,
        );
        await refresh();
        return { ok: true, value };
      } catch (cause) {
        return failure(mapError(cause));
      }
    },
    [grant.handle, refresh],
  );

  const editNote = useCallback(
    async (
      noteId: string,
      content: string,
      expectedContent?: string,
    ): Promise<NoteResult<NoteEntry>> => {
      if (!grant.handle)
        return failure({
          kind: "workspace-missing",
          message: "Choose a workspace folder first.",
        });
      try {
        const value = await writeNote(
          grant.handle,
          noteId,
          content,
          expectedContent,
        );
        setSelectedNote(value);
        await refresh();
        return { ok: true, value };
      } catch (cause) {
        return failure(mapError(cause));
      }
    },
    [grant.handle, refresh],
  );

  const deleteNote = useCallback(
    async (noteId: string): Promise<NoteResult<void>> => {
      if (!grant.handle)
        return failure({
          kind: "workspace-missing",
          message: "Choose a workspace folder first.",
        });
      try {
        const identities = await ensureNoteIdentities(grant.handle, [noteId]);
        await migrateNoteEdges(grant.handle, identities);
        const original = await readNote(grant.handle, noteId);
        await deleteNoteInWorkspace(grant.handle, noteId);
        try {
          await updateNoteIdentities(grant.handle, (document) =>
            forgetNoteIdentity(document, noteId),
          );
        } catch (error) {
          try {
            await createNoteInWorkspace(
              grant.handle,
              original.folder,
              noteId.split("/").pop()!,
              original.content,
            );
          } catch {
            throw new Error(
              `Note deletion metadata failed and "${noteId}" could not be restored. Check the workspace before retrying.`,
            );
          }
          throw error;
        }
        if (selectedNoteId === noteId) {
          setSelectedNoteId(null);
          setSelectedNote(null);
        }
        await refresh();
        return { ok: true, value: undefined };
      } catch (cause) {
        return failure(mapError(cause));
      }
    },
    [grant.handle, refresh, selectedNoteId],
  );

  const renameNote = useCallback(
    async (noteId: string, newName: string): Promise<NoteResult<NoteEntry>> => {
      if (!grant.handle)
        return failure({
          kind: "workspace-missing",
          message: "Choose a workspace folder first.",
        });
      try {
        await ensureNoteIdentities(grant.handle, [noteId]);
        const value = await renameNoteInWorkspace(
          grant.handle,
          noteId,
          newName.endsWith(".md") ? newName : `${newName}.md`,
        );
        try {
          const identities = await updateNoteIdentities(
            grant.handle,
            (document) => relocateNoteIdentity(document, noteId, value.id),
          );
          value.stableId = stableNoteReference(identities, value.id);
        } catch (error) {
          try {
            await moveNoteInWorkspace(
              grant.handle,
              value.id,
              noteId.split("/").slice(0, -1).join("/"),
              noteId.split("/").pop()!,
            );
          } catch {
            throw new Error(
              `Metadata failed after renaming. Check both "${noteId}" and "${value.id}" before retrying.`,
            );
          }
          throw error;
        }
        if (selectedNoteId === noteId) {
          setSelectedNoteId(value.id);
          setSelectedNote(value);
        }
        await refresh(selectedNoteId === noteId ? value.id : undefined);
        return { ok: true, value };
      } catch (cause) {
        return failure(mapError(cause));
      }
    },
    [grant.handle, refresh, selectedNoteId],
  );

  const moveNote = useCallback(
    async (
      noteId: string,
      folderId: string,
      name: string,
    ): Promise<NoteResult<NoteEntry>> => {
      if (!grant.handle)
        return failure({
          kind: "workspace-missing",
          message: "Choose a workspace folder first.",
        });
      try {
        await ensureNoteIdentities(grant.handle, [noteId]);
        const value = await moveNoteInWorkspace(
          grant.handle,
          noteId,
          folderId,
          name,
        );
        try {
          const identities = await updateNoteIdentities(
            grant.handle,
            (document) => relocateNoteIdentity(document, noteId, value.id),
          );
          value.stableId = stableNoteReference(identities, value.id);
        } catch (error) {
          try {
            await moveNoteInWorkspace(
              grant.handle,
              value.id,
              noteId.split("/").slice(0, -1).join("/"),
              noteId.split("/").pop()!,
            );
          } catch {
            throw new Error(
              `Metadata failed after moving. Check both "${noteId}" and "${value.id}" before retrying.`,
            );
          }
          throw error;
        }
        if (selectedNoteId === noteId) {
          setSelectedNoteId(value.id);
          setSelectedNote(value);
        }
        await refresh(selectedNoteId === noteId ? value.id : undefined);
        return { ok: true, value };
      } catch (cause) {
        return failure(mapError(cause));
      }
    },
    [grant.handle, refresh, selectedNoteId],
  );

  const createFolder = useCallback(
    async (
      folderId: string,
      name: string,
    ): Promise<NoteResult<FolderEntry>> => {
      if (!grant.handle)
        return failure({
          kind: "workspace-missing",
          message: "Choose a workspace folder first.",
        });
      try {
        const value = await createFolderInWorkspace(
          grant.handle,
          folderId,
          name,
        );
        await refresh();
        return { ok: true, value };
      } catch (cause) {
        return failure(mapError(cause));
      }
    },
    [grant.handle, refresh],
  );

  const deleteFolder = useCallback(
    async (folderId: string): Promise<NoteResult<void>> => {
      if (!grant.handle)
        return failure({
          kind: "workspace-missing",
          message: "Choose a workspace folder first.",
        });
      try {
        await deleteFolderInWorkspace(grant.handle, folderId);
        if (selectedNoteId?.startsWith(`${folderId}/`)) {
          setSelectedNoteId(null);
          setSelectedNote(null);
        }
        await refresh();
        return { ok: true, value: undefined };
      } catch (cause) {
        return failure(mapError(cause));
      }
    },
    [grant.handle, refresh],
  );

  const renameFolder = useCallback(
    async (
      folderId: string,
      newName: string,
    ): Promise<NoteResult<FolderEntry>> => {
      if (!grant.handle)
        return failure({
          kind: "workspace-missing",
          message: "Choose a workspace folder first.",
        });
      try {
        await ensureNoteIdentities(
          grant.handle,
          indexRef.current?.notes.map((note) => note.id) ?? [],
        );
        const value = await renameFolderInWorkspace(
          grant.handle,
          folderId,
          newName,
        );
        try {
          await updateNoteIdentities(grant.handle, (document) =>
            relocateNoteFolder(document, folderId, value.id),
          );
        } catch (error) {
          try {
            await renameFolderInWorkspace(
              grant.handle,
              value.id,
              folderId.split("/").pop()!,
            );
          } catch {
            throw new Error(
              `Metadata failed after folder rename. Check both "${folderId}" and "${value.id}" before retrying.`,
            );
          }
          throw error;
        }
        if (selectedNoteId?.startsWith(`${folderId}/`)) {
          const updatedNoteId = `${value.id}${selectedNoteId.slice(folderId.length)}`;
          setSelectedNoteId(updatedNoteId);
          setSelectedNote((note) =>
            note
              ? {
                  ...note,
                  id: updatedNoteId,
                  folder: value.id + note.folder.slice(folderId.length),
                }
              : null,
          );
          await refresh(updatedNoteId);
        } else {
          await refresh();
        }
        return { ok: true, value };
      } catch (cause) {
        return failure(mapError(cause));
      }
    },
    [grant.handle, refresh, selectedNoteId],
  );

  const importFiles = useCallback(
    async (
      files: File[],
      folderId: string,
    ): Promise<NoteResult<ImportResult>> => {
      if (!grant.handle)
        return failure({
          kind: "workspace-missing",
          message: "Choose a workspace folder first.",
        });
      try {
        const value = await importMarkdownFiles(grant.handle, folderId, files);
        await refresh();
        return { ok: true, value };
      } catch (cause) {
        return failure(mapError(cause));
      }
    },
    [grant.handle, refresh],
  );

  const selectNote = useCallback(
    async (
      noteId: string | null,
      silentMissing = false,
    ): Promise<NoteResult<NoteEntry> | null> => {
      const requestId = ++requestRef.current;
      selectionRef.current = noteId;
      setMissingNoteId(null);
      setSelectedNoteId(noteId);
      if (!noteId || !grant.handle) {
        setSelectedNote(null);
        return null;
      }
      const handle = grant.handle;
      try {
        const note = await readNote(handle, noteId);
        const identity = indexRef.current?.notes.find(
          (item) => item.id === noteId,
        );
        if (identity?.stableId) note.stableId = identity.stableId;
        else {
          try {
            const identities = await readNoteIdentities(handle);
            note.stableId = Object.keys(identities.notes).find(
              (id) => identities.notes[id] === noteId,
            );
          } catch {
            note.stableId = undefined;
          }
        }
        if (requestRef.current === requestId && handleRef.current === handle)
          setSelectedNote(note);
        return { ok: true, value: note };
      } catch (cause) {
        const error = mapError(cause);
        if (requestRef.current === requestId && handleRef.current === handle) {
          setSelectedNote(null);
          if (error.kind === "not-found") setSelectedNoteId(null);
          if (!silentMissing || error.kind !== "not-found") setError(error);
        }
        return { ok: false, error };
      }
    },
    [grant.handle],
  );
  const selectFolder = useCallback(
    (folderId: string) => setSelectedFolderPath(folderId),
    [],
  );
  const navigateUp = useCallback(
    () =>
      setSelectedFolderPath((path) =>
        path.slice(0, Math.max(0, path.lastIndexOf("/"))),
      ),
    [],
  );

  return {
    index,
    indexHandle,
    loading,
    error,
    selectedNoteId,
    selectedNote,
    missingNoteId,
    selectedFolderPath,
    refresh,
    createNote,
    editNote,
    deleteNote,
    renameNote,
    moveNote,
    createFolder,
    deleteFolder,
    renameFolder,
    importFiles,
    selectNote,
    selectFolder,
    navigateUp,
  };
}
