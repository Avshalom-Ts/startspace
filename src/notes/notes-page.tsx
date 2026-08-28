// notes-page.tsx
//
// Owns the Notes feature's main page: folder tree, note list, note editor,
// and the action bar (create, import, search within notes).
//
// Routing: the Notes page is rendered inside AppShell when the hash is "#notes".
// The note editor is a single-panel view (no split-pane in v1) with a title
// field, a Markdown textarea, and save/delete/rename actions.
//
// Folder organization: the left panel shows the workspace folder tree; clicking
// a folder narrows the note list to that folder's notes. The root (all notes)
// view shows every note. The editor is independent of folder navigation — once
// a note is selected, the editor shows it regardless of the current folder view.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useNotes } from './use-notes';
import { useWorkspace } from '../hooks/useWorkspace';
import { searchNotes, type NoteSearchResult } from './notes-search';
import { slugifyNoteName } from '../types/notes-path';
import type { NoteEntry, FolderEntry } from '../types/notes';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PageMode = 'list' | 'editor';

// ---------------------------------------------------------------------------
// NotesPage
// ---------------------------------------------------------------------------

export function NotesPage() {
  const notes = useNotes();
  const { grant, chooseWorkspace } = useWorkspace();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const [mode, setMode] = useState<PageMode>('list');
  const [folderFilter, setFolderFilter] = useState('');
  const [newName, setNewName] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [localSuccess, setLocalSuccess] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<NoteSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Sync selected note from the hook.
  useEffect(() => {
    if (notes.selectedNoteId && !notes.selectedNote) {
      notes.selectNote(notes.selectedNoteId);
    }
  }, [notes.selectedNoteId, notes.selectedNote, notes.selectNote]);

  // Clear local message after a short delay.
  useEffect(() => {
    if (!localSuccess && !localError) return;
    const timer = setTimeout(() => {
      setLocalSuccess(null);
      setLocalError(null);
    }, 3000);
    return () => clearTimeout(timer);
  }, [localSuccess, localError]);

  // Filtered notes for the current folder view.
  const displayedNotes = notes.index?.notes.filter((n) => n.folder === folderFilter) ?? [];

  // Search within all notes.
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    setSearchLoading(true);
    const timer = setTimeout(() => {
      if (notes.index) {
        const results = searchNotes(notes.index.notes, searchQuery);
        setSearchResults(results);
      }
      setSearchLoading(false);
    }, 150);
    return () => clearTimeout(timer);
  }, [searchQuery, notes.index]);

  // When the selected note content changes via textarea, update the local
  // selectedNote so the title field can read it (but don't trigger a save).
  const handleContentChange = useCallback((content: string) => {
    if (notes.selectedNote) {
      notes.selectedNote.content = content;
    }
  }, [notes.selectedNote]);

  const handleCreateNote = useCallback(async () => {
    const name = newName.trim();
    if (!name) {
      setLocalError('Enter a note name.');
      return;
    }
    const result = await notes.createNote(folderFilter, `${slugifyNoteName(name)}.md`, `# ${name}\n\n`);
    if (result.ok) {
      setLocalSuccess(`Created note "${result.value.title}".`);
      setNewName('');
      setMode('editor');
      await notes.selectNote(result.value.id);
    } else {
      setLocalError(result.error.message);
    }
  }, [folderFilter, newName, notes.createNote, notes.selectNote]);

  const handleSaveNote = useCallback(async () => {
    if (!notes.selectedNote) return;
    const content = textareaRef.current?.value ?? notes.selectedNote.content;
    handleContentChange(content);
    const result = await notes.editNote(notes.selectedNote.id, content);
    if (result.ok) {
      setLocalSuccess('Saved.');
    } else {
      setLocalError(result.error.message);
    }
  }, [notes.selectedNote, notes.editNote, handleContentChange]);

  const handleDeleteNote = useCallback(async () => {
    if (!notes.selectedNote) return;
    const result = await notes.deleteNote(notes.selectedNote.id);
    if (result.ok) {
      setLocalSuccess('Deleted.');
      setMode('list');
      await notes.selectNote(null);
    } else {
      setLocalError(result.error.message);
    }
  }, [notes.selectedNote, notes.deleteNote, notes.selectNote]);

  const handleRenameNote = useCallback(async () => {
    if (!notes.selectedNote) return;
    const name = newName.trim();
    if (!name) {
      setLocalError('Enter a name.');
      return;
    }
    const result = await notes.renameNote(notes.selectedNote.id, `${slugifyNoteName(name)}.md`);
    if (result.ok) {
      setLocalSuccess(`Renamed to "${result.value.title}".`);
      setNewName('');
    } else {
      setLocalError(result.error.message);
    }
  }, [notes.selectedNote, newName, notes.renameNote]);

  const handleMoveNote = useCallback(async (targetFolderId: string) => {
    if (!notes.selectedNote) return;
    const name = newName.trim() || notes.selectedNote.title;
    const result = await notes.moveNote(notes.selectedNote.id, targetFolderId, slugifyNoteName(name));
    if (result.ok) {
      setLocalSuccess('Moved.');
      setNewName('');
      await notes.selectNote(result.value.id);
    } else {
      setLocalError(result.error.message);
    }
  }, [newName, notes.moveNote, notes.selectNote, notes.selectedNote]);


  const handleCreateFolder = useCallback(async () => {
    const name = newFolderName.trim();
    if (!name) {
      setLocalError('Enter a folder name.');
      return;
    }
    const result = await notes.createFolder(folderFilter, name);
    if (result.ok) {
      setLocalSuccess(`Created folder "${name}".`);
      setNewFolderName('');
    } else {
      setLocalError(result.error.message);
    }
  }, [folderFilter, newFolderName, notes.createFolder]);

  const handleDeleteFolder = useCallback(async (folderId: string) => {
    const result = await notes.deleteFolder(folderId);
    if (result.ok) {
      setLocalSuccess('Folder deleted.');
      if (folderFilter === folderId) {
        setFolderFilter('');
      }
    } else {
      setLocalError(result.error.message);
    }
  }, [folderFilter, notes.deleteFolder]);

  const handleImport = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      if (files.length === 0) return;
      const result = await notes.importFiles(files, folderFilter);
      if (result.ok) {
        setLocalSuccess(`Imported ${result.value.imported.length} note(s).`);
      } else {
        setLocalError(result.error.message);
      }
      e.target.value = '';
    },
    [folderFilter, notes.importFiles],
  );

  const handleSearchApply = useCallback(() => {
    setSearchQuery((q) => q);
  }, []);

  const handleTitleChange = useCallback((title: string) => {
    if (!notes.selectedNote || !textareaRef.current) return;
    const newContent = title ? `# ${title}\n\n${notes.selectedNote.content.replace(/^#\s+.+$/m, '').trimStart()}` : notes.selectedNote.content;
    textareaRef.current.value = newContent;
    notes.selectedNote.content = newContent;
    notes.selectedNote.title = title;
  }, [notes.selectedNote]);

  if (!grant.handle || grant.permission !== 'granted') {
    return (
      <section className="w-full max-w-xl rounded-lg border border-border bg-surface p-6 text-center">
        <h2 className="text-lg font-medium text-fg mb-2">Notes workspace not selected</h2>
        <p className="text-sm text-muted mb-4">Choose a workspace folder in Settings before creating, importing, or searching notes.</p>
        <div className="flex justify-center gap-2">
          <button onClick={() => void chooseWorkspace()} className="rounded-md border border-border bg-page px-4 py-2 text-sm font-medium text-fg hover:border-fg/40">Choose folder</button>
          <a href="#settings" className="rounded-md border border-border px-4 py-2 text-sm text-fg hover:bg-page">Open Settings</a>
        </div>
      </section>
    );
  }

  return (
    <div className="w-full max-w-6xl">
      {/* Page header */}
      <div className="mb-6 flex items-center justify-between">
      {/* Note search */}
      <div className="flex-1 mr-4">
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearchApply()}
          placeholder="Search notes by title or content…"
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg placeholder-muted focus:border-fg/40 focus:outline-none"
        />
        {searchQuery && (
          <div className="mt-2 flex items-center justify-between">
            <p className="text-xs text-muted">
              {searchLoading ? 'Searching…' : `${searchResults.length} result(s)`}
            </p>
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs text-muted hover:text-fg"
            >
              Clear
            </button>
          </div>
        )}
      </div>
          {/* Import notes */}
              <div className="flex items-center">
          <button
            onClick={handleImport}
            className="rounded-md border border-border bg-page px-3 py-2 text-sm text-fg transition-colors hover:border-fg/40 hover:bg-surface hover:text-accent focus-visible:outline-2 focus-visible:outline-fg"
          >
            Import notes
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".md,.txt"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      </div>

      {/* Messages */}
      {(localSuccess || localError) && (
        <div className="mb-4 rounded-md border p-3 text-sm">
          {localSuccess ? (
            <div className="text-fg">{localSuccess}</div>
          ) : (
            <div className="text-red-500">{localError}</div>
          )}
        </div>
      )}


      {/* Two-column layout: folder tree + note list / editor */}
      <div className="flex flex-col md:flex-row gap-6">
        {/* Left: folder tree */}
        <aside className="w-full md:w-56 shrink-0">
          <FolderTree
            workspaceName={grant.name}
            folders={notes.index?.folders ?? []}
            notes={notes.index?.notes ?? []}
            currentFolder={folderFilter}
            onSelect={setFolderFilter}
            onSelectNote={(id) => {
              void notes.selectNote(id);
              setMode('editor');
            }}
            onCreateFolder={handleCreateFolder}
            onDeleteFolder={handleDeleteFolder}
            newFolderName={newFolderName}
            setNewFolderName={setNewFolderName}
          />
        </aside>

        {/* Right: note list or editor */}
        <div className="flex-1 min-w-0">
          {notes.loading && !notes.selectedNote ? (
            <div className="flex items-center gap-2 text-sm text-muted py-4">
              <div className="w-4 h-4 border-2 border-border border-t-fg rounded-full animate-spin" />
              <span>Loading notes…</span>
            </div>
          ) : notes.error ? (
            <div className="rounded-lg border border-red-500 bg-red-50 p-4 text-sm text-red-500">
              <p>{notes.error.message}</p>
            </div>
          ) : searchResults.length > 0 && searchQuery ? (
            <section className="rounded-lg border border-border">
              <h3 className="px-4 py-2 text-sm font-medium text-muted uppercase tracking-wide">
                Search results
              </h3>
              <ul className="divide-y divide-border">
                {searchResults.map((r) => (
                  <li key={r.note.id} className="px-4 py-3">
                    <button
                      onClick={() => {
                        notes.selectNote(r.note.id);
                        setMode('editor');
                        setSearchQuery('');
                      }}
                      className="w-full text-left transition-colors hover:bg-surface rounded p-1"
                    >
                      <p className="text-sm font-medium text-fg truncate">{r.note.title}</p>
                      <p className="text-xs text-muted truncate">{r.note.id}</p>
                      <p className="text-xs text-muted">Matched {r.matchType === 'title' ? 'title' : 'content'}</p>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : mode === 'editor' && notes.selectedNote ? (
            <NoteEditor
              note={notes.selectedNote}
              onSave={handleSaveNote}
              onDelete={handleDeleteNote}
              onRename={handleRenameNote}
              onMove={handleMoveNote}
              folders={notes.index?.folders ?? []}
              onChangeName={setNewName}
              editingName={newName}
              editingTitle={notes.selectedNote.title}
              onTitleChange={handleTitleChange}
              textareaRef={textareaRef}
            />
          ) : (
            <NoteList
              notes={displayedNotes}
              folders={notes.index?.folders ?? []}
              folderFilter={folderFilter}
              onSelectNote={(id) => {
                notes.selectNote(id);
                setMode('editor');
              }}
              onCreateNote={handleCreateNote}
              onNewNameChange={setNewName}
              newNoteName={newName}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// FolderTree
// ---------------------------------------------------------------------------

function FolderTree({
  workspaceName,
  folders,
  notes,
  currentFolder,
  onSelect,
  onSelectNote,
  onCreateFolder,
  onDeleteFolder,
  newFolderName,
  setNewFolderName,
}: {
  workspaceName: string;
  folders: FolderEntry[];
  notes: NoteEntry[];
  currentFolder: string;
  onSelect: (id: string) => void;
  onSelectNote: (id: string) => void;
  onCreateFolder: (name: string) => void;
  onDeleteFolder: (id: string) => void;
  newFolderName: string;
  setNewFolderName: (name: string) => void;
}) {
  const childrenOf = (parentId: string) => folders
    .filter((folder) => {
      if (!folder.id || folder.id === parentId) return false;
      const parent = folder.id.slice(0, Math.max(0, folder.id.lastIndexOf('/')));
      return parent === parentId;
    })
    .sort((a, b) => a.name.localeCompare(b.name));
  const notesIn = (folderId: string) => notes
    .filter((note) => note.folder === folderId)
    .sort((a, b) => a.title.localeCompare(b.title));

  const renderFolder = (folder: FolderEntry) => {
    const children = childrenOf(folder.id);
    const folderNotes = notesIn(folder.id);
    return (
      <li key={folder.id} className="border-t border-border">
        <details open={!currentFolder || currentFolder === folder.id || folder.id.startsWith(`${currentFolder}/`)}>
          <summary className="flex cursor-pointer list-none items-center gap-1 px-2 py-1.5 text-sm text-fg hover:bg-surface [&::-webkit-details-marker]:hidden">
            <span className="text-xs text-muted">▶</span>
            <button
              onClick={(event) => {
                event.preventDefault();
                onSelect(folder.id);
              }}
              className={`min-w-0 flex-1 truncate rounded px-1 text-left ${currentFolder === folder.id ? 'bg-surface font-medium' : ''}`}
            >
              {folder.name}
            </button>
            <span className="text-xs text-muted">{folder.noteCount}</span>
            <button
              onClick={(event) => {
                event.preventDefault();
                onDeleteFolder(folder.id);
              }}
              aria-label={`Delete ${folder.name}`}
              className="rounded border border-border px-1.5 py-0.5 text-xs text-muted hover:border-red-500 hover:text-red-500 focus-visible:outline-2 focus-visible:outline-fg"
            >
              ✕
            </button>
          </summary>
          <div className="ml-3 border-l border-border pl-2">
            {children.length > 0 && <ul>{children.map(renderFolder)}</ul>}
            {folderNotes.length > 0 && (
              <ul className="pb-1">
                {folderNotes.map((note) => (
                  <li key={note.id}>
                    <button
                      onClick={() => onSelectNote(note.id)}
                      className="w-full truncate rounded px-2 py-1 text-left text-xs text-muted hover:bg-surface hover:text-fg"
                    >
                      {note.title}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </details>
      </li>
    );
  };

  const rootNotes = notesIn('');

  return (
    <div className="rounded-lg border border-border">
      <div className="p-3">
        <div className="mb-3">
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted">New folder</label>
          <div className="flex gap-2">
            <input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onCreateFolder(newFolderName.trim())}
              placeholder="Folder name"
              className="min-w-0 flex-1 rounded border border-border bg-surface px-2 py-1 text-sm text-fg placeholder-muted focus:border-fg/40 focus:outline-none"
            />
            <button
              onClick={() => onCreateFolder(newFolderName.trim())}
              className="rounded border border-border bg-page px-2 py-1 text-sm text-fg hover:border-fg/40 hover:bg-surface focus-visible:outline-2 focus-visible:outline-fg"
            >
              Add
            </button>
          </div>
        </div>
        <h3 className="text-xs font-medium uppercase tracking-wide text-muted">Folders</h3>
        <button
          onClick={() => onSelect('')}
          className={`w-full rounded-md px-3 py-1.5 text-sm transition-colors ${currentFolder === '' ? 'bg-surface text-fg font-medium' : 'text-fg hover:bg-surface'}`}
        >
          All notes
        </button>
        <div className="mt-2 flex items-center gap-1 px-1 text-sm font-medium text-fg" title={workspaceName}>
          <span aria-hidden="true">📁</span>
          <span className="truncate">{workspaceName}</span>
        </div>
        {rootNotes.length > 0 && (
          <ul className="mt-1 border-l border-border pl-3">
            {rootNotes.map((note) => (
              <li key={note.id}>
                <button onClick={() => onSelectNote(note.id)} className="w-full truncate rounded px-2 py-1 text-left text-xs text-muted hover:bg-surface hover:text-fg">
                  {note.title}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <ul className="border-t border-border">
        {childrenOf('').map(renderFolder)}
        {folders.length === 0 && (
          <li className="px-3 py-2 text-xs text-muted">
            No folders yet.
          </li>
        )}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// NoteList — the list view when no note is being edited
// ---------------------------------------------------------------------------

function NoteList({
  notes,
  folders,
  folderFilter,
  onSelectNote,
  onCreateNote,
  onNewNameChange,
  newNoteName,
}: {
  notes: NoteEntry[];
  folders: FolderEntry[];
  folderFilter: string;
  onSelectNote: (id: string) => void;
  onCreateNote: () => void;
  onNewNameChange: (name: string) => void;
  newNoteName: string;
}) {
  const folderTitle = folderFilter ? (folders.find((f) => f.id === folderFilter)?.name ?? folderFilter) : 'All notes';
  return (
    <div>
      {/* Folder breadcrumb + actions */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-fg">{folderTitle}</h3>
          <p className="text-xs text-muted">{notes.length} note(s)</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={newNoteName}
            onChange={(e) => onNewNameChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onCreateNote()}
            placeholder="New note name"
            className="w-40 rounded border border-border bg-surface px-2 py-1 text-sm text-fg placeholder-muted focus:border-fg/40 focus:outline-none"
          />
          <button
            onClick={onCreateNote}
            className="rounded border border-border bg-page px-3 py-1.5 text-sm text-fg hover:border-fg/40 hover:bg-surface focus-visible:outline-2 focus-visible:outline-fg"
          >
            + New note
          </button>
        </div>
      </div>

      {notes.length === 0 ? (
        <div className="rounded-lg border border-border p-6 text-center">
          <p className="text-sm text-muted">
            {folderFilter ? 'No notes in this folder.' : 'No notes yet. Create one or import Markdown files.'}
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {notes.map((note) => (
            <li key={note.id}>
              <button
                onClick={() => onSelectNote(note.id)}
                className="w-full px-4 py-3 text-left transition-colors hover:bg-surface rounded-t-lg"
              >
                <p className="text-sm font-medium text-fg truncate">{note.title}</p>
                <p className="text-xs text-muted mt-0.5 truncate">{note.id}</p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// NoteEditor — the editor view for a selected note
// ---------------------------------------------------------------------------

function NoteEditor({
  note,
  onSave,
  onDelete,
  onRename,
  onMove,
  folders,
  onChangeName,
  editingName,
  editingTitle,
  onTitleChange,
  textareaRef,
}: {
  note: NoteEntry;
  onSave: () => void;
  onDelete: () => void;
  onRename: () => void;
  onMove: (folderId: string) => void;
  folders: FolderEntry[];
  onChangeName: (name: string) => void;
  editingName: string;
  editingTitle: string;
  onTitleChange: (title: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}) {
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          <input
            value={editingName}
            onChange={(e) => onChangeName(e.target.value)}
            placeholder="Note name"
            className="min-w-0 rounded border border-border bg-surface px-2 py-1 text-sm text-fg placeholder-muted focus:border-fg/40 focus:outline-none"
          />
          <span className="text-xs text-muted">.md</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onRename}
            className="rounded border border-border px-2 py-1 text-xs text-fg hover:border-fg/40 hover:bg-surface focus-visible:outline-2 focus-visible:outline-fg"
          >
            Rename
          </button>
          <button
            onClick={onSave}
            className="rounded border border-border px-2 py-1 text-xs text-fg hover:border-fg/40 hover:bg-surface focus-visible:outline-2 focus-visible:outline-fg"
          >
            Save
          </button>
          <button
            onClick={onDelete}
            className="rounded border border-border px-2 py-1 text-xs text-red-500 hover:border-red-500/40 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-fg"
          >
            Delete
          </button>
          <select
            aria-label="Move note to folder"
            defaultValue={note.folder}
            onChange={(e) => onMove(e.target.value)}
            className="rounded border border-border bg-surface px-2 py-1 text-xs text-fg"
          >
            <option value="">Root folder</option>
            {folders.map((folder) => <option key={folder.id} value={folder.id}>{folder.id}</option>)}
          </select>
        </div>
      </div>

      {/* Title */}
      <div className="px-4 py-3 border-b border-border">
        <input
          type="text"
          value={editingTitle}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Untitled"
          className="w-full rounded border border-border bg-surface px-3 py-2 text-base font-medium text-fg placeholder-muted focus:border-fg/40 focus:outline-none"
        />
      </div>

      {/* Content */}
      <div className="px-4 py-3">
        <textarea
          ref={textareaRef}
          value={note.content}
          onChange={(e) => {
            // The parent's handleContentChange will update the note's content
            // via the ref, but the aria-selected changes are ephemeral in React
            // controlled inputs — we use the textarea's on change to update the
            // local note.content so the title field can derive from it.
            if (note.content !== e.target.value) {
              note.content = e.target.value;
            }
          }}
          placeholder="Write Markdown…"
          className="w-full min-h-[300px] rounded border border-border bg-surface p-3 text-sm text-fg placeholder-muted focus:border-fg/40 focus:outline-none resize-y"
        />
      </div>

      {/* Metadata line */}
      <div className="px-4 py-2 border-t border-border text-xs text-muted flex items-center gap-4">
        <span>Folder: {note.folder || '(root)'}</span>
        <span>Modified: {new Date(note.modifiedAt).toLocaleString()}</span>
      </div>
    </div>
  );
}
