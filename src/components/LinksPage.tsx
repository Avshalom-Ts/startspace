// LinksPage.tsx
//
// Renders the existing bookmark folder-chip navigation and link-card grid,
// with create, edit, move, and delete controls backed by the browser store.

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { collectBookmarkFolders, collectBookmarkLinks, collectBookmarkNodeIds, findBookmarkNode, unwrapBookmarkRoots } from "../bookmarks/bookmark-tree";
import { filterFavoriteLinks, filterLinks } from "../bookmarks/links-search";
import type { CreateBookmarkInput, UpdateBookmarkInput } from "../bookmarks/bookmark-service";
import type { BookmarkMetadata, BookmarkNode } from "../hooks/useBookmarks";
import { useNotifications } from "../notifications/notification-context";

type EditorState = { mode: "create-link" | "create-folder" | "edit"; node?: BookmarkNode };

interface LinksPageProps {
  tree: BookmarkNode[];
  metadata: Record<string, BookmarkMetadata>;
  onToggleFavorite: (id: string, current: boolean) => void;
  onCreate: (input: CreateBookmarkInput) => Promise<BookmarkNode>;
  onUpdate: (id: string, changes: UpdateBookmarkInput) => Promise<BookmarkNode>;
  onMove: (id: string, parentId: string) => Promise<BookmarkNode>;
  onDelete: (node: BookmarkNode) => Promise<void>;
  loading: boolean;
  mutating: boolean;
  error: string | null;
  onClearError: () => void;
}

/** Renders folder navigation and browser-backed bookmark management. */
export function LinksPage({ tree, metadata, onToggleFavorite, onCreate, onUpdate, onMove, onDelete, loading, mutating, error, onClearError }: LinksPageProps) {
  const notifications = useNotifications();
  const [pathIds, setPathIds] = useState<string[]>([]);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [deleting, setDeleting] = useState<BookmarkNode | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const autoEnteredRef = useRef(false);
  const roots = useMemo(() => unwrapBookmarkRoots(tree), [tree]);
  const rootIds = useMemo(() => new Set(roots.map((root) => root.id)), [roots]);
  const nonEmptyRoots = useMemo(() => roots.filter((root) => root.url || (root.children?.length ?? 0) > 0), [roots]);
  const folders = useMemo(() => collectBookmarkFolders(roots), [roots]);
  const currentFolder = pathIds.length ? findBookmarkNode(roots, pathIds[pathIds.length - 1] ?? "") : null;

  useEffect(() => {
    const validIds = pathIds.filter((id) => findBookmarkNode(roots, id));
    if (validIds.length !== pathIds.length) setPathIds(validIds);
  }, [pathIds, roots]);

  useEffect(() => {
    const onlyRoot = nonEmptyRoots.length === 1 ? nonEmptyRoots[0] : null;
    if (!autoEnteredRef.current && pathIds.length === 0 && onlyRoot && !onlyRoot.url) {
      autoEnteredRef.current = true;
      setPathIds([onlyRoot.id]);
    }
  }, [nonEmptyRoots, pathIds.length]);

  if (loading) return <LoadingBookmarks />;
  if (roots.length === 0) return <p className="text-sm text-muted">No bookmarks found in the browser.</p>;

  const rowFolders = (currentFolder ? currentFolder.children ?? [] : nonEmptyRoots).filter((child) => !child.url);
  const folderCards = currentFolder && pathIds.length > 1
    ? (currentFolder.children ?? []).filter((child) => child.url).map((node) => ({ node, folderTitle: currentFolder.title }))
    : collectBookmarkLinks(roots);
  const searching = Boolean(searchQuery.trim());
  const allVisibleCards = searching || favoritesOnly ? collectBookmarkLinks(roots) : folderCards;
  const searchedCards = filterLinks(allVisibleCards, searchQuery);
  const cards = favoritesOnly ? filterFavoriteLinks(searchedCards, metadata) : searchedCards;

  return (
    <section className="w-full">
      <div className="mb-4 flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted">⌕</span>
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search links by name or URL…"
            aria-label="Search links"
            className="w-full rounded-lg border border-border bg-surface py-2.5 pl-9 pr-3 text-sm text-fg placeholder:text-muted focus-visible:outline-2 focus-visible:outline-fg"
          />
        </div>
        <button
          type="button"
          onClick={() => setFavoritesOnly((selected) => !selected)}
          aria-label={favoritesOnly ? "Show all links" : "Show favorite links only"}
          aria-pressed={favoritesOnly}
          title={favoritesOnly ? "Show all links" : "Show favorite links only"}
          className={`inline-flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-lg border text-lg transition-colors focus-visible:outline-2 focus-visible:outline-fg ${favoritesOnly ? "border-accent bg-accent/10 text-accent" : "border-border bg-surface text-muted hover:border-fg/40 hover:text-fg"}`}
        >
          {favoritesOnly ? "★" : "☆"}
        </button>
      </div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {currentFolder && <button onClick={() => setPathIds((path) => path.slice(0, -1))} className="inline-flex items-center rounded-full border border-border px-2 py-1 text-sm text-muted transition-colors hover:border-fg/40 hover:text-fg focus-visible:outline-2 focus-visible:outline-fg" title="Back to previous folder" aria-label="Back to previous folder">←</button>}
          {rowFolders.map((folder) => (
            <span key={folder.id} className="inline-flex items-center rounded-full border border-border text-sm text-fg transition-colors hover:border-fg/40 hover:bg-surface">
              <button onClick={() => setPathIds((path) => [...path, folder.id])} className="rounded-l-full px-3 py-1 focus-visible:outline-2 focus-visible:outline-fg">{folder.title}</button>
              {!rootIds.has(folder.id) && <button onClick={() => setEditor({ mode: "edit", node: folder })} className="rounded-r-full border-l border-border px-2 py-1 text-muted hover:text-fg focus-visible:outline-2 focus-visible:outline-fg" aria-label={`Manage folder ${folder.title}`} title="Edit, move, or delete folder">•••</button>}
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={() => setEditor({ mode: "create-link" })} className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-fg hover:border-fg/40 hover:text-accent focus-visible:outline-2 focus-visible:outline-fg">New link</button>
          <button onClick={() => setEditor({ mode: "create-folder" })} className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-fg hover:border-fg/40 hover:text-accent focus-visible:outline-2 focus-visible:outline-fg">New folder</button>
        </div>
      </div>

      {error && <div role="alert" className="mb-4 flex items-center justify-between gap-3 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-500"><span>{error}</span><button onClick={onClearError} aria-label="Dismiss error">×</button></div>}

      {cards.length ? <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">{cards.map(({ node, folderTitle }) => <LinkCard key={node.id} node={node} meta={metadata[node.id]} folderTitle={folderTitle} onToggleFavorite={onToggleFavorite} onEdit={() => setEditor({ mode: "edit", node })} />)}</ul> : <p className="text-sm text-muted">{searching ? `No links match “${searchQuery.trim()}”${favoritesOnly ? " among your favorites" : ""}.` : favoritesOnly ? "No favorite links yet." : "No links in this folder."}</p>}

      {editor && <BookmarkEditor editor={editor} currentFolder={currentFolder} folderTree={roots} folders={folders} busy={mutating} onSave={async (values) => {
        try {
          if (editor.mode === "create-link") await onCreate({ parentId: values.parentId, title: values.title, url: values.url });
          else if (editor.mode === "create-folder") await onCreate({ parentId: values.parentId, title: values.title });
          else if (editor.node) {
            await onUpdate(editor.node.id, editor.node.url ? { title: values.title, url: values.url } : { title: values.title });
            if (values.parentId !== editor.node.parentId) await onMove(editor.node.id, values.parentId);
          }
          notifications.success(editor.mode === "create-link" ? "Link created." : editor.mode === "create-folder" ? "Folder created." : "Bookmark updated.");
          setEditor(null);
        } catch (failure) {
          notifications.error(failure instanceof Error ? failure.message : "The bookmark operation failed. Try again.");
          onClearError();
          throw failure;
        }
      }} onRequestDelete={editor.node && !rootIds.has(editor.node.id) ? () => { setDeleting(editor.node ?? null); setEditor(null); } : undefined} onClose={() => setEditor(null)} />}

      {deleting && <DeleteDialog node={deleting} busy={mutating} onConfirm={async () => {
        try {
          const deletedKind = deleting.url ? "Link" : "Folder";
          await onDelete(deleting);
          notifications.success(`${deletedKind} deleted.`);
          setDeleting(null);
        } catch (failure) {
          notifications.error(failure instanceof Error ? failure.message : "The bookmark could not be deleted. Try again.");
          onClearError();
          throw failure;
        }
      }} onClose={() => setDeleting(null)} />}
    </section>
  );
}

/** Displays the Links page loading indicator. */
function LoadingBookmarks() {
  return <div className="flex items-center gap-2 py-4 text-sm text-muted"><div className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-fg" /><span>Loading bookmarks…</span></div>;
}

/** Renders a single bookmark card and its management controls. */
function LinkCard({ node, meta, folderTitle, onToggleFavorite, onEdit }: { node: BookmarkNode; meta?: BookmarkMetadata; folderTitle: string; onToggleFavorite: (id: string, current: boolean) => void; onEdit: () => void }) {
  const isFavorite = meta?.favorites === true;
  const domain = getDomain(node.url);
  return <li className="group rounded-lg border border-border bg-surface p-3 transition-colors hover:border-fg/30">
    <div className="flex items-start justify-between gap-2">
      <a href={node.url} target="_self" rel="noopener noreferrer" className="min-w-0 flex-1"><p className={`truncate text-sm text-fg transition-colors group-hover:text-accent ${isFavorite ? "font-medium" : ""}`}>{node.title || domain}</p>{domain && <p className="truncate text-xs text-muted">{domain}</p>}</a>
      <div className="flex shrink-0 gap-1">
        <button onClick={() => onToggleFavorite(node.id, isFavorite)} className={`inline-flex items-center rounded border px-1.5 py-0.5 text-xs ${isFavorite ? "border-accent bg-accent/10 text-accent" : "border-border text-muted hover:text-fg"}`} title={isFavorite ? "Remove from favorites" : "Add to favorites"} aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}>{isFavorite ? "★" : "☆"}</button>
        <button onClick={onEdit} className="rounded border border-border px-1.5 py-0.5 text-xs text-muted hover:text-fg" title="Edit, move, or delete link" aria-label={`Manage link ${node.title}`}>•••</button>
      </div>
    </div>
    <div className="mt-2 flex flex-wrap gap-1"><span className="inline-flex items-center rounded-full border border-border bg-page px-2 py-0.5 text-xs text-muted">{folderTitle}</span>{(meta?.tags ?? []).map((tag) => <span key={tag} className="inline-flex items-center rounded-full border border-border bg-page px-2 py-0.5 text-xs text-muted">{tag}</span>)}</div>
  </li>;
}

interface EditorValues { title: string; url?: string; parentId: string }

/** Modal form shared by create, rename, URL edit, and move operations. */
function BookmarkEditor({ editor, currentFolder, folderTree, folders, busy, onSave, onRequestDelete, onClose }: { editor: EditorState; currentFolder: BookmarkNode | null; folderTree: BookmarkNode[]; folders: BookmarkNode[]; busy: boolean; onSave: (values: EditorValues) => Promise<void>; onRequestDelete?: () => void; onClose: () => void }) {
  const node = editor.node;
  const isLink = editor.mode === "create-link" || Boolean(node?.url);
  const [title, setTitle] = useState(node?.title ?? "");
  const [url, setUrl] = useState(node?.url ?? "");
  const fallbackParent = currentFolder?.id ?? folders[0]?.id ?? "";
  const [parentId, setParentId] = useState(node?.parentId ?? fallbackParent);
  const [validation, setValidation] = useState<string | null>(null);
  const excludedIds = new Set(node && !node.url ? collectBookmarkNodeIds(node) : []);
  const titleText = editor.mode === "create-link" ? "New link" : editor.mode === "create-folder" ? "New folder" : `Edit ${isLink ? "link" : "folder"}`;

  /** Validates and submits values to the browser-backed mutation callback. */
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) { setValidation("Enter a name."); return; }
    if (!parentId) { setValidation("Choose a destination folder."); return; }
    if (isLink) {
      try { new URL(url); } catch { setValidation("Enter a valid URL, including its protocol."); return; }
    }
    setValidation(null);
    try { await onSave({ title: title.trim(), url: isLink ? url.trim() : undefined, parentId }); } catch { /* hook displays the actionable browser error */ }
  }

  return <Modal title={titleText} onClose={onClose}>
    <form onSubmit={(event) => void submit(event)} className="space-y-4">
      <label className="block text-sm text-fg">Name<input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} className="mt-1 w-full rounded-md border border-border bg-page px-3 py-2 text-fg focus-visible:outline-2 focus-visible:outline-fg" /></label>
      {isLink && <label className="block text-sm text-fg">URL<input type="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://example.com" className="mt-1 w-full rounded-md border border-border bg-page px-3 py-2 text-fg focus-visible:outline-2 focus-visible:outline-fg" /></label>}
      <fieldset>
        <legend className="text-sm text-fg">Folder</legend>
        <FolderTreePicker tree={folderTree} selectedId={parentId} excludedIds={excludedIds} onSelect={setParentId} />
      </fieldset>
      {validation && <p role="alert" className="text-sm text-red-500">{validation}</p>}
      <div className="flex items-center justify-between gap-3"><div>{onRequestDelete && <button type="button" onClick={onRequestDelete} className="text-sm text-red-500 hover:underline">Delete</button>}</div><div className="flex gap-2"><button type="button" onClick={onClose} className="rounded-md border border-border px-3 py-1.5 text-sm text-fg">Cancel</button><button disabled={busy} className="rounded-md bg-accent px-3 py-1.5 text-sm text-accent-foreground disabled:opacity-50">{busy ? "Saving…" : "Save"}</button></div></div>
    </form>
  </Modal>;
}

/** Displays the real bookmark hierarchy and selects one destination folder. */
function FolderTreePicker({ tree, selectedId, excludedIds, onSelect }: { tree: BookmarkNode[]; selectedId: string; excludedIds: Set<string>; onSelect: (id: string) => void }) {
  return <div className="mt-1 max-h-56 overflow-y-auto rounded-md border border-border bg-page p-2" role="tree" aria-label="Destination folder">
    <FolderTreeLevel nodes={tree} selectedId={selectedId} excludedIds={excludedIds} onSelect={onSelect} root />
  </div>;
}

/** Recursively renders one nesting level of destination folders. */
function FolderTreeLevel({ nodes, selectedId, excludedIds, onSelect, root = false }: { nodes: BookmarkNode[]; selectedId: string; excludedIds: Set<string>; onSelect: (id: string) => void; root?: boolean }) {
  const folders = nodes.filter((node) => !node.url && !excludedIds.has(node.id));
  if (!folders.length) return root ? <p className="px-2 py-1 text-sm text-muted">No destination folders available.</p> : null;
  return <ul className={root ? "space-y-0.5" : "ml-3 space-y-0.5 border-l border-border pl-2"} role="group">
    {folders.map((folder) => {
      const selected = folder.id === selectedId;
      return <li key={folder.id} role="treeitem" aria-selected={selected}>
        <button type="button" onClick={() => onSelect(folder.id)} className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm focus-visible:outline-2 focus-visible:outline-fg ${selected ? "bg-accent text-accent-foreground" : "text-fg hover:bg-surface"}`}>
          <span aria-hidden="true">{selected ? "●" : "○"}</span>
          <span className="truncate">{folder.title || "Browser bookmarks"}</span>
        </button>
        <FolderTreeLevel nodes={folder.children ?? []} selectedId={selectedId} excludedIds={excludedIds} onSelect={onSelect} />
      </li>;
    })}
  </ul>;
}

/** Confirms destructive link deletion or recursive folder deletion. */
function DeleteDialog({ node, busy, onConfirm, onClose }: { node: BookmarkNode; busy: boolean; onConfirm: () => Promise<void>; onClose: () => void }) {
  const descendantCount = collectBookmarkNodeIds(node).length - 1;
  return <Modal title={`Delete ${node.url ? "link" : "folder"}?`} onClose={onClose}>
    <p className="text-sm text-muted">{node.url ? `“${node.title}” will be removed from your browser bookmarks.` : `“${node.title}” and its ${descendantCount} descendant${descendantCount === 1 ? "" : "s"} will be removed from your browser bookmarks.`}</p>
    <div className="mt-5 flex justify-end gap-2"><button onClick={onClose} className="rounded-md border border-border px-3 py-1.5 text-sm text-fg">Cancel</button><button disabled={busy} onClick={() => void onConfirm().catch(() => undefined)} className="rounded-md bg-red-600 px-3 py-1.5 text-sm text-white disabled:opacity-50">{busy ? "Deleting…" : "Delete"}</button></div>
  </Modal>;
}

/** Accessible overlay shell for bookmark management dialogs. */
function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div role="dialog" aria-modal="true" aria-labelledby="bookmark-dialog-title" className="w-full max-w-md rounded-lg border border-border bg-surface p-5 shadow-xl"><div className="mb-4 flex items-center justify-between"><h2 id="bookmark-dialog-title" className="text-lg font-medium text-fg">{title}</h2><button onClick={onClose} aria-label="Close dialog" className="text-xl text-muted hover:text-fg">×</button></div>{children}</div></div>;
}

/** Returns a display-safe hostname for a bookmark URL. */
function getDomain(url: string | undefined): string {
  if (!url) return "";
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; }
}
