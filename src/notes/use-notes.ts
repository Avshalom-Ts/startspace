import { useCallback, useEffect, useState } from 'react';
import { useWorkspace } from '../hooks/useWorkspace';
import type { FolderEntry, NoteEntry, NotesIndex } from '../types/notes';
import {
  createFolder as createFolderInWorkspace,
  createNote as createNoteInWorkspace,
  deleteFolder as deleteFolderInWorkspace,
  deleteNote as deleteNoteInWorkspace,
  importMarkdownFiles,
  moveNote as moveNoteInWorkspace,
  NoteWorkspaceError,
  readNote,
  renameNote as renameNoteInWorkspace,
  scanWorkspace,
  writeNote,
  type ImportResult,
} from './notes-workspace';

export type NotesUiError = { kind: 'workspace-missing' | 'access-revoked' | 'not-found' | 'already-exists' | 'invalid-name' | 'io' | 'unknown'; message: string };
export type NoteResult<T> = { ok: true; value: T } | { ok: false; error: NotesUiError };

function failure<T>(error: NotesUiError): NoteResult<T> { return { ok: false, error }; }
function mapError(error: unknown): NotesUiError {
  if (error instanceof NoteWorkspaceError) {
    const kind = error.kind === 'invalid-path' ? 'invalid-name' : error.kind === 'unavailable' ? 'workspace-missing' : error.kind;
    return { kind, message: error.message };
  }
  return { kind: 'unknown', message: error instanceof Error ? error.message : String(error) };
}

export function useNotes() {
  const { grant } = useWorkspace();
  const [index, setIndex] = useState<NotesIndex | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<NotesUiError | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [selectedNote, setSelectedNote] = useState<NoteEntry | null>(null);
  const [selectedFolderPath, setSelectedFolderPath] = useState('');

  const refresh = useCallback(async () => {
    if (!grant.handle) { setIndex(null); return; }
    setLoading(true); setError(null);
    try { setIndex(await scanWorkspace(grant.handle)); }
    catch (cause) { setError(mapError(cause)); }
    finally { setLoading(false); }
  }, [grant.handle]);

  useEffect(() => { void refresh(); }, [refresh]);

  const createNote = useCallback(async (folderId: string, name: string, content: string): Promise<NoteResult<NoteEntry>> => {
    if (!grant.handle) return failure({ kind: 'workspace-missing', message: 'Choose a workspace folder first.' });
    try { const value = await createNoteInWorkspace(grant.handle, folderId, name.endsWith('.md') ? name : `${name}.md`, content); await refresh(); return { ok: true, value }; }
    catch (cause) { return failure(mapError(cause)); }
  }, [grant.handle, refresh]);

  const editNote = useCallback(async (noteId: string, content: string): Promise<NoteResult<NoteEntry>> => {
    if (!grant.handle) return failure({ kind: 'workspace-missing', message: 'Choose a workspace folder first.' });
    try { const value = await writeNote(grant.handle, noteId, content); setSelectedNote(value); await refresh(); return { ok: true, value }; }
    catch (cause) { return failure(mapError(cause)); }
  }, [grant.handle, refresh]);

  const deleteNote = useCallback(async (noteId: string): Promise<NoteResult<void>> => {
    if (!grant.handle) return failure({ kind: 'workspace-missing', message: 'Choose a workspace folder first.' });
    try { await deleteNoteInWorkspace(grant.handle, noteId); if (selectedNoteId === noteId) { setSelectedNoteId(null); setSelectedNote(null); } await refresh(); return { ok: true, value: undefined }; }
    catch (cause) { return failure(mapError(cause)); }
  }, [grant.handle, refresh, selectedNoteId]);

  const renameNote = useCallback(async (noteId: string, newName: string): Promise<NoteResult<NoteEntry>> => {
    if (!grant.handle) return failure({ kind: 'workspace-missing', message: 'Choose a workspace folder first.' });
    try { const value = await renameNoteInWorkspace(grant.handle, noteId, newName.endsWith('.md') ? newName : `${newName}.md`); if (selectedNoteId === noteId) { setSelectedNoteId(value.id); setSelectedNote(value); } await refresh(); return { ok: true, value }; }
    catch (cause) { return failure(mapError(cause)); }
  }, [grant.handle, refresh, selectedNoteId]);

  const moveNote = useCallback(async (noteId: string, folderId: string, name: string): Promise<NoteResult<NoteEntry>> => {
    if (!grant.handle) return failure({ kind: 'workspace-missing', message: 'Choose a workspace folder first.' });
    try { const value = await moveNoteInWorkspace(grant.handle, noteId, folderId, name); if (selectedNoteId === noteId) { setSelectedNoteId(value.id); setSelectedNote(value); } await refresh(); return { ok: true, value }; }
    catch (cause) { return failure(mapError(cause)); }
  }, [grant.handle, refresh, selectedNoteId]);

  const createFolder = useCallback(async (folderId: string, name: string): Promise<NoteResult<FolderEntry>> => {
    if (!grant.handle) return failure({ kind: 'workspace-missing', message: 'Choose a workspace folder first.' });
    try { const value = await createFolderInWorkspace(grant.handle, folderId, name); await refresh(); return { ok: true, value }; }
    catch (cause) { return failure(mapError(cause)); }
  }, [grant.handle, refresh]);

  const deleteFolder = useCallback(async (folderId: string): Promise<NoteResult<void>> => {
    if (!grant.handle) return failure({ kind: 'workspace-missing', message: 'Choose a workspace folder first.' });
    try { await deleteFolderInWorkspace(grant.handle, folderId); await refresh(); return { ok: true, value: undefined }; }
    catch (cause) { return failure(mapError(cause)); }
  }, [grant.handle, refresh]);

  const importFiles = useCallback(async (files: File[], folderId: string): Promise<NoteResult<ImportResult>> => {
    if (!grant.handle) return failure({ kind: 'workspace-missing', message: 'Choose a workspace folder first.' });
    try { const value = await importMarkdownFiles(grant.handle, folderId, files); await refresh(); return { ok: true, value }; }
    catch (cause) { return failure(mapError(cause)); }
  }, [grant.handle, refresh]);

  const selectNote = useCallback(async (noteId: string | null) => {
    setSelectedNoteId(noteId);
    if (!noteId || !grant.handle) { setSelectedNote(null); return; }
    try { setSelectedNote(await readNote(grant.handle, noteId)); } catch (cause) { setSelectedNote(null); setError(mapError(cause)); }
  }, [grant.handle]);
  const selectFolder = useCallback((folderId: string) => setSelectedFolderPath(folderId), []);
  const navigateUp = useCallback(() => setSelectedFolderPath(path => path.slice(0, Math.max(0, path.lastIndexOf('/')))), []);

  return { index, loading, error, selectedNoteId, selectedNote, selectedFolderPath, refresh, createNote, editNote, deleteNote, renameNote, moveNote, createFolder, deleteFolder, importFiles, selectNote, selectFolder, navigateUp };
}
