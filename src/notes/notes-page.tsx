// notes-page.tsx
//
// Renders the Notes feature's persistent two-pane workspace. The explorer
// reflects the granted filesystem while useNotes owns filesystem operations.

import { useEffect, useState, type ReactNode } from "react";
import { marked } from "marked";
import { useWorkspace } from "../hooks/useWorkspace";
import { slugifyNoteName } from "../types/notes-path";
import type { FolderEntry, NoteEntry } from "../types/notes";
import { searchNotes, type NoteSearchResult } from "./notes-search";
import { useNotes } from "./use-notes";

function renderMarkdown(content: string): string {
  return marked.parse(content, { async: false }) as string;
}

export function NotesPage() {
  const notes = useNotes();
  const { grant, chooseWorkspace } = useWorkspace();
  const [activeFolderId, setActiveFolderId] = useState("");
  const [newNoteName, setNewNoteName] = useState("");
  const [newFolderName, setNewFolderName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(null), 3000);
    return () => window.clearTimeout(timer);
  }, [message]);

  useEffect(() => {
    const refreshOnFocus = () => void notes.refresh();
    window.addEventListener("focus", refreshOnFocus);
    return () => window.removeEventListener("focus", refreshOnFocus);
  }, [notes.refresh]);

  useEffect(() => {
    const selectLinkedNote = () => {
      const noteId = new URLSearchParams(
        window.location.hash.split("?")[1] ?? "",
      ).get("note");
      if (noteId) void notes.selectNote(noteId);
    };
    selectLinkedNote();
    window.addEventListener("hashchange", selectLinkedNote);
    return () => window.removeEventListener("hashchange", selectLinkedNote);
  }, [notes.selectNote]);

  const createNote = async () => {
    const name = newNoteName.trim();
    if (!name) return setMessage("Enter a note name.");
    const result = await notes.createNote(
      activeFolderId,
      `${slugifyNoteName(name)}.md`,
      `# ${name}\n\n`,
    );
    if (!result.ok) return setMessage(result.error.message);
    setNewNoteName("");
    await notes.selectNote(result.value.id);
    setMessage(`Created ${result.value.title}.`);
  };

  const createFolder = async () => {
    const name = newFolderName.trim();
    if (!name) return setMessage("Enter a folder name.");
    const result = await notes.createFolder(activeFolderId, name);
    if (!result.ok) return setMessage(result.error.message);
    setNewFolderName("");
    setMessage(`Created ${name}.`);
  };

  const renameFolder = async (folderId: string, name: string) => {
    const result = await notes.renameFolder(folderId, name);
    if (!result.ok) {
      setMessage(result.error.message);
      return false;
    }
    setActiveFolderId((current) =>
      current.startsWith(folderId)
        ? `${result.value.id}${current.slice(folderId.length)}`
        : current,
    );
    setMessage(`Renamed ${name}.`);
    return true;
  };

  if (!grant.handle || grant.permission !== "granted") {
    return (
      <section className="w-full max-w-xl border border-border bg-surface p-6 text-center">
        <h2 className="mb-2 text-lg font-medium text-fg">
          Notes workspace not selected
        </h2>
        <p className="mb-4 text-sm text-muted">
          Choose a workspace folder before working with local Markdown notes.
        </p>
        <div className="flex justify-center gap-2">
          <button
            onClick={() => void chooseWorkspace()}
            className="border border-border bg-page px-4 py-2 text-sm text-fg hover:border-fg/40"
          >
            Choose folder
          </button>
          <a
            href="#settings"
            className="border border-border px-4 py-2 text-sm text-fg hover:bg-page"
          >
            Open Settings
          </a>
        </div>
      </section>
    );
  }

  const searchResults =
    searchQuery.trim() && notes.index
      ? searchNotes(notes.index.notes, searchQuery)
      : [];
  return (
    <section className="w-full max-w-7xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-fg">Notes</h2>
          <p className="text-sm text-muted">Local Markdown workspace</p>
        </div>
        <button
          onClick={() => void notes.refresh()}
          className="border border-border bg-surface px-3 py-2 text-sm text-fg hover:bg-page"
        >
          Refresh workspace
        </button>
      </div>
      {message && (
        <p
          className="mb-4 border border-border bg-surface px-3 py-2 text-sm text-fg"
          role="status"
        >
          {message}
        </p>
      )}
      {notes.error && (
        <p
          className="mb-4 border border-red-500 bg-red-50 px-3 py-2 text-sm text-red-600"
          role="alert"
        >
          {notes.error.message}
        </p>
      )}
      <div className="grid min-h-144 grid-cols-1 border border-border bg-surface lg:grid-cols-[17rem_minmax(0,1fr)]">
        <aside className="border-b border-border lg:border-r lg:border-b-0">
          <div className="border-b border-border p-3">
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              type="search"
              placeholder="Search notes"
              aria-label="Search notes"
              className="w-full border border-border bg-page px-3 py-2 text-sm text-fg placeholder-muted focus:outline-none"
            />
          </div>
          <div className="border-b border-border p-3">
            <label
              className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted"
              htmlFor="new-note-name"
            >
              New note in {activeFolderId || "workspace root"}
            </label>
            <div className="flex gap-2">
              <input
                id="new-note-name"
                value={newNoteName}
                onChange={(event) => setNewNoteName(event.target.value)}
                onKeyDown={(event) =>
                  event.key === "Enter" && void createNote()
                }
                placeholder="Note name"
                className="min-w-0 flex-1 border border-border bg-page px-2 py-1.5 text-sm text-fg"
              />
              <button
                onClick={() => void createNote()}
                className="border border-border px-2 py-1 text-sm text-fg hover:bg-page"
              >
                New
              </button>
            </div>
            <label
              className="mb-1 mt-3 block text-xs font-medium uppercase tracking-wide text-muted"
              htmlFor="new-folder-name"
            >
              New folder
            </label>
            <div className="flex gap-2">
              <input
                id="new-folder-name"
                value={newFolderName}
                onChange={(event) => setNewFolderName(event.target.value)}
                onKeyDown={(event) =>
                  event.key === "Enter" && void createFolder()
                }
                placeholder="Folder name"
                className="min-w-0 flex-1 border border-border bg-page px-2 py-1.5 text-sm text-fg"
              />
              <button
                onClick={() => void createFolder()}
                className="border border-border px-2 py-1 text-sm text-fg hover:bg-page"
              >
                Add
              </button>
            </div>
          </div>
          <div className="app-scrollbar max-h-112 overflow-y-auto p-2 lg:max-h-[calc(100vh-16rem)]">
            {notes.loading && !notes.index ? (
              <p className="p-2 text-sm text-muted">Loading workspace...</p>
            ) : (
              <NoteExplorer
                workspaceName={grant.name}
                folders={notes.index?.folders ?? []}
                notes={notes.index?.notes ?? []}
                activeFolderId={activeFolderId}
                selectedNoteId={notes.selectedNoteId}
                onSelectFolder={setActiveFolderId}
                onSelectNote={(id) => void notes.selectNote(id)}
                onRenameFolder={renameFolder}
                onDeleteFolder={async (id) => {
                  const result = await notes.deleteFolder(id);
                  setMessage(
                    result.ok ? "Folder deleted." : result.error.message,
                  );
                  return result.ok;
                }}
              />
            )}
          </div>
        </aside>
        <main className="min-w-0">
          {searchQuery.trim() ? (
            <SearchResults
              results={searchResults}
              onSelect={(id) => {
                void notes.selectNote(id);
                setSearchQuery("");
              }}
            />
          ) : notes.selectedNote ? (
            <NoteEditor
              note={notes.selectedNote}
              folders={notes.index?.folders ?? []}
              onSave={async (content) => {
                const result = await notes.editNote(
                  notes.selectedNote!.id,
                  content,
                );
                setMessage(result.ok ? "Saved." : result.error.message);
                return result.ok;
              }}
              onRename={async (name) => {
                const result = await notes.renameNote(
                  notes.selectedNote!.id,
                  `${slugifyNoteName(name)}.md`,
                );
                setMessage(result.ok ? "Note renamed." : result.error.message);
                return result.ok;
              }}
              onMove={async (folderId, name) => {
                const result = await notes.moveNote(
                  notes.selectedNote!.id,
                  folderId,
                  slugifyNoteName(name),
                );
                if (result.ok) await notes.selectNote(result.value.id);
                setMessage(result.ok ? "Note moved." : result.error.message);
                return result.ok;
              }}
              onDelete={async () => {
                const result = await notes.deleteNote(notes.selectedNote!.id);
                if (result.ok) await notes.selectNote(null);
                setMessage(result.ok ? "Note deleted." : result.error.message);
              }}
            />
          ) : (
            <EmptyEditor hasNotes={(notes.index?.notes.length ?? 0) > 0} />
          )}
        </main>
      </div>
    </section>
  );
}

function NoteExplorer({
  workspaceName,
  folders,
  notes,
  activeFolderId,
  selectedNoteId,
  onSelectFolder,
  onSelectNote,
  onRenameFolder,
  onDeleteFolder,
}: {
  workspaceName: string;
  folders: FolderEntry[];
  notes: NoteEntry[];
  activeFolderId: string;
  selectedNoteId: string | null;
  onSelectFolder: (id: string) => void;
  onSelectNote: (id: string) => void;
  onRenameFolder: (id: string, name: string) => Promise<boolean>;
  onDeleteFolder: (id: string) => Promise<boolean>;
}) {
  const childrenOf = (parentId: string) =>
    folders
      .filter(
        (folder) =>
          folder.id !== parentId &&
          folder.id.slice(0, Math.max(0, folder.id.lastIndexOf("/"))) ===
            parentId,
      )
      .sort((left, right) => left.name.localeCompare(right.name));
  const notesIn = (folderId: string) =>
    notes
      .filter((note) => note.folder === folderId)
      .sort((left, right) => left.title.localeCompare(right.title));
  const tree = (folderId: string) => (
    <ul className={folderId ? "ml-3 border-l border-border pl-2" : ""}>
      {notesIn(folderId).map((note) => (
        <li key={note.id}>
          <button
            onClick={() => onSelectNote(note.id)}
            className={`w-full truncate px-2 py-1 text-left text-sm ${selectedNoteId === note.id ? "bg-accent text-accent-foreground" : "text-muted hover:bg-page hover:text-fg"}`}
          >
            {note.title}
          </button>
        </li>
      ))}
      {childrenOf(folderId).map((folder) => (
        <FolderNode
          key={folder.id}
          folder={folder}
          active={activeFolderId === folder.id}
          onSelect={() => onSelectFolder(folder.id)}
          onRename={onRenameFolder}
          onDelete={onDeleteFolder}
        >
          {tree(folder.id)}
        </FolderNode>
      ))}
    </ul>
  );
  return (
    <nav aria-label="Note explorer">
      <button
        onClick={() => onSelectFolder("")}
        className={`mb-1 flex w-full px-2 py-1.5 text-left text-sm font-medium ${activeFolderId === "" ? "bg-page text-fg" : "text-fg hover:bg-page"}`}
        title={workspaceName}
      >
        {workspaceName}
      </button>
      {tree("")}
    </nav>
  );
}

function FolderNode({
  folder,
  active,
  onSelect,
  onRename,
  onDelete,
  children,
}: {
  folder: FolderEntry;
  active: boolean;
  onSelect: () => void;
  onRename: (id: string, name: string) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  children: ReactNode;
}) {
  const [expanded, setExpanded] = useState(true);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(folder.name);
  useEffect(() => setName(folder.name), [folder.name]);
  const saveRename = async () => {
    if (name.trim() && (await onRename(folder.id, name.trim())))
      setRenaming(false);
  };
  return (
    <li>
      <div className={`flex items-center gap-1 ${active ? "bg-page" : ""}`}>
        <button
          onClick={() => setExpanded(!expanded)}
          aria-label={`${expanded ? "Collapse" : "Expand"} ${folder.name}`}
          className="w-6 py-1 text-xs text-muted hover:text-fg"
        >
          {expanded ? "-" : "+"}
        </button>
        {renaming ? (
          <input
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void saveRename();
              if (event.key === "Escape") setRenaming(false);
            }}
            onBlur={() => void saveRename()}
            className="min-w-0 flex-1 border border-border bg-page px-1 py-0.5 text-sm text-fg"
            aria-label="Folder name"
          />
        ) : (
          <button
            onClick={onSelect}
            className="min-w-0 flex-1 truncate py-1 text-left text-sm text-fg hover:text-accent"
          >
            {folder.name}
          </button>
        )}
        <button
          onClick={() => setRenaming(true)}
          className="px-1 text-xs text-muted hover:text-fg"
          aria-label={`Rename ${folder.name}`}
        >
          Rename
        </button>
        <button
          onClick={() => void onDelete(folder.id)}
          className="px-1 text-xs text-muted hover:text-red-600"
          aria-label={`Delete ${folder.name}`}
        >
          Delete
        </button>
      </div>
      {expanded && children}
    </li>
  );
}

function SearchResults({
  results,
  onSelect,
}: {
  results: NoteSearchResult[];
  onSelect: (id: string) => void;
}) {
  return (
    <div className="p-5">
      <h3 className="mb-3 text-sm font-medium text-muted">Search results</h3>
      {results.length ? (
        <ul className="divide-y divide-border border border-border">
          {results.map(({ note, matchType }) => (
            <li key={note.id}>
              <button
                onClick={() => onSelect(note.id)}
                className="w-full px-4 py-3 text-left hover:bg-page"
              >
                <p className="text-sm font-medium text-fg">{note.title}</p>
                <p className="text-xs text-muted">
                  {note.id} - matched {matchType}
                </p>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">No notes match this search.</p>
      )}
    </div>
  );
}

function EmptyEditor({ hasNotes }: { hasNotes: boolean }) {
  return (
    <div className="flex min-h-120 flex-col items-center justify-center p-8 text-center">
      <h3 className="text-lg font-medium text-fg">
        {hasNotes ? "Select a note" : "Start your workspace"}
      </h3>
      <p className="mt-2 max-w-sm text-sm text-muted">
        {hasNotes
          ? "Choose a Markdown file from the explorer to open it here."
          : "Create your first local Markdown note from the explorer."}
      </p>
    </div>
  );
}

function NoteEditor({
  note,
  folders,
  onSave,
  onRename,
  onMove,
  onDelete,
}: {
  note: NoteEntry;
  folders: FolderEntry[];
  onSave: (content: string) => Promise<boolean>;
  onRename: (name: string) => Promise<boolean>;
  onMove: (folderId: string, name: string) => Promise<boolean>;
  onDelete: () => Promise<void>;
}) {
  const [content, setContent] = useState(note.content);
  const [fileName, setFileName] = useState(
    note.id.split("/").pop()?.replace(/\.md$/, "") ?? "",
  );
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  useEffect(() => {
    setContent(note.content);
    setFileName(note.id.split("/").pop()?.replace(/\.md$/, "") ?? "");
  }, [note.id, note.content]);
  return (
    <div className="flex min-h-144 flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-3">
        <div className="flex min-w-0 items-center gap-2">
          <input
            value={fileName}
            onChange={(event) => setFileName(event.target.value)}
            aria-label="Note file name"
            className="w-40 max-w-full border border-border bg-page px-2 py-1 text-sm text-fg"
          />
          <span className="text-sm text-muted">.md</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => void onRename(fileName)}
            className="border border-border px-2 py-1 text-sm text-fg hover:bg-page"
          >
            Rename
          </button>
          <select
            value={note.folder}
            onChange={(event) => void onMove(event.target.value, fileName)}
            aria-label="Move note to folder"
            className="border border-border bg-page px-2 py-1 text-sm text-fg"
          >
            <option value="">Move to workspace root</option>
            {folders.map((folder) => (
              <option key={folder.id} value={folder.id}>
                Move to {folder.id}
              </option>
            ))}
          </select>
          <button
            onClick={() => void onSave(content)}
            className="border border-border bg-page px-2 py-1 text-sm text-fg hover:border-fg/40"
          >
            Save
          </button>
          <button
            onClick={() => void onDelete()}
            className="border border-red-500 px-2 py-1 text-sm text-red-600 hover:bg-red-50"
          >
            Delete
          </button>
        </div>
      </header>
      <div className="flex border-b border-border">
        <button
          onClick={() => setMode("edit")}
          className={`px-4 py-2 text-sm ${mode === "edit" ? "border-b-2 border-accent text-fg" : "text-muted"}`}
        >
          Edit
        </button>
        <button
          onClick={() => setMode("preview")}
          className={`px-4 py-2 text-sm ${mode === "preview" ? "border-b-2 border-accent text-fg" : "text-muted"}`}
        >
          Preview
        </button>
      </div>
      {mode === "edit" ? (
        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          aria-label="Markdown content"
          className="app-scrollbar min-h-116 flex-1 resize-y bg-page p-5 font-mono text-sm leading-6 text-fg focus:outline-none"
        />
      ) : (
        <article
          className="app-scrollbar min-h-116 max-w-none overflow-auto p-5 text-fg"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
        />
      )}
    </div>
  );
}
