import { useCallback, useEffect, useRef, useState } from "react";
import { useWorkspace } from "../hooks/useWorkspace";
import type { FolderEntry, NoteEntry, NotesIndex } from "../types/notes";
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
  const [index, setIndex] = useState<NotesIndex | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<NotesUiError | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [selectedNote, setSelectedNote] = useState<NoteEntry | null>(null);
  const [selectedFolderPath, setSelectedFolderPath] = useState("");
  selectionRef.current = selectedNoteId;

  const refresh = useCallback(
    async (selectedId = selectionRef.current) => {
      if (!grant.handle || grant.permission !== "granted") {
        setIndex(null);
        setSelectedNote(null);
        setSelectedNoteId(null);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const nextIndex = await scanWorkspace(grant.handle);
        setIndex(nextIndex);
        if (selectedId) {
          const refreshedSelectedNote =
            nextIndex.notes.find((note) => note.id === selectedId) ?? null;
          setSelectedNote(refreshedSelectedNote);
          if (!refreshedSelectedNote) setSelectedNoteId(null);
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
        await deleteNoteInWorkspace(grant.handle, noteId);
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
        const value = await renameNoteInWorkspace(
          grant.handle,
          noteId,
          newName.endsWith(".md") ? newName : `${newName}.md`,
        );
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
        const value = await moveNoteInWorkspace(
          grant.handle,
          noteId,
          folderId,
          name,
        );
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
        const value = await renameFolderInWorkspace(
          grant.handle,
          folderId,
          newName,
        );
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
    async (noteId: string | null) => {
      selectionRef.current = noteId;
      setSelectedNoteId(noteId);
      if (!noteId || !grant.handle) {
        setSelectedNote(null);
        return;
      }
      try {
        const note = await readNote(grant.handle, noteId);
        if (selectionRef.current === noteId) setSelectedNote(note);
      } catch (cause) {
        setSelectedNote(null);
        setError(mapError(cause));
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
    loading,
    error,
    selectedNoteId,
    selectedNote,
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
