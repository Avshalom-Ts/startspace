import { useEffect, useMemo, useRef, useState } from 'react';

// ---------------------------------------------------------------------------
// Types — mirror BookmarkNode from useBookmarks so the Links page renders
// the full tree without the flat-list flattening that useBookmarks does.
// ---------------------------------------------------------------------------

export interface BookmarkTreeNode {
  id: string;
  title: string;
  url?: string;
  children?: BookmarkTreeNode[];
}

type BookmarkMetadata = Record<
  string,
  { favorites: boolean; tags: string[]; dateAdded: string; relatedNotes: string[]; relatedTasks: string[] }
>;

// ---------------------------------------------------------------------------
// LinksPage — a row of folders to drill into, and a card grid below it
// showing either all links (folder tagged) or the drilled-into folder's
// own direct links.
// ---------------------------------------------------------------------------

/**
 * Renders the browser's bookmark tree as a drill-down folder row above a
 * card grid of links. Clicking a folder replaces the row with its nested
 * folders (if any) and narrows the card grid to that folder's own links,
 * tagged with its name. A back arrow steps up to the previous level.
 *
 * The tree is read from chrome.bookmarks.getTree() (browser is source of truth).
 * StartSpace metadata (favorites, tags, related notes/tasks) is linked by
 * Bookmark ID in extension storage and can be surfaced from the Links page.
 */
export function LinksPage({
  tree,
  metadata,
  onToggleFavorite,
  loading,
}: {
  tree: BookmarkTreeNode[];
  metadata: BookmarkMetadata;
  onToggleFavorite: (id: string, current: boolean) => void;
  loading: boolean;
}) {
  const [path, setPath] = useState<BookmarkTreeNode[]>([]);
  const currentFolder = path[path.length - 1] ?? null;

  // chrome.bookmarks.getTree() wraps everything in a single unnamed root
  // node — unwrap it so the row starts at real folders like "Bookmarks bar".
  const roots = useMemo(() => unwrapRoot(tree), [tree]);
  // hide empty root folders (e.g. an unused "Other bookmarks") from the row
  const nonEmptyRoots = useMemo(() => roots.filter((root) => root.url || (root.children?.length ?? 0) > 0), [roots]);
  const allLinks = useMemo(() => collectAllLinks(roots), [roots]);

  // if only one real root folder remains, skip the single-folder row and
  // start inside it directly — but only once, so the back arrow still works.
  const autoEnteredRef = useRef(false);
  useEffect(() => {
    const onlyRoot = nonEmptyRoots.length === 1 ? nonEmptyRoots[0] : null;
    if (!autoEnteredRef.current && path.length === 0 && onlyRoot && !onlyRoot.url) {
      autoEnteredRef.current = true;
      setPath([onlyRoot]);
    }
  }, [nonEmptyRoots, path.length]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted py-4">
        <div className="w-4 h-4 border-2 border-border border-t-fg rounded-full animate-spin" />
        <span>Loading bookmarks…</span>
      </div>
    );
  }

  if (roots.length === 0) {
    return (
      <p className="text-sm text-muted">
        No bookmarks found in the browser.
      </p>
    );
  }

  const rowFolders = (currentFolder ? currentFolder.children ?? [] : nonEmptyRoots).filter((child) => !child.url);
  // top-level folders (e.g. "Bookmarks bar") stand in for the root view, so
  // show every link there too; only deeper subfolders narrow the card grid.
  const cards = currentFolder && path.length > 1
    ? (currentFolder.children ?? []).filter((child) => child.url).map((link) => ({ node: link, folderTitle: currentFolder.title }))
    : allLinks;

  return (
    <section className="w-full">

      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        {currentFolder && (
          <button
            onClick={() => setPath((p) => p.slice(0, -1))}
            className="inline-flex items-center rounded-full border border-border px-2 py-1 text-sm text-muted transition-colors hover:border-fg/40 hover:text-fg focus-visible:outline-2 focus-visible:outline-fg"
            title="Back to previous folder"
            aria-label="Back to previous folder"
          >
            ←
          </button>
        )}
        {rowFolders.map((folder) => (
          <button
            key={folder.id}
            onClick={() => setPath((p) => [...p, folder])}
            className="inline-flex items-center rounded-full border border-border px-3 py-1 text-sm text-fg transition-colors hover:border-fg/40 hover:bg-surface focus-visible:outline-2 focus-visible:outline-fg"
          >
            {folder.title}
          </button>
        ))}
      </div>

      {cards.length > 0 ? (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {cards.map(({ node, folderTitle }) => (
            <LinkCard
              key={node.id}
              node={node}
              meta={metadata[node.id]}
              folderTitle={folderTitle}
              onToggleFavorite={onToggleFavorite}
            />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">No links in this folder.</p>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// collectAllLinks — flattens the tree into every bookmark link paired with
// its immediate parent folder's title, for the default "all links" view.
// ---------------------------------------------------------------------------

function collectAllLinks(tree: BookmarkTreeNode[]): { node: BookmarkTreeNode; folderTitle: string }[] {
  const result: { node: BookmarkTreeNode; folderTitle: string }[] = [];
  const visit = (folder: BookmarkTreeNode) => {
    for (const child of folder.children ?? []) {
      if (child.url) result.push({ node: child, folderTitle: folder.title });
      else visit(child);
    }
  };
  for (const root of tree) visit(root);
  return result;
}

// ---------------------------------------------------------------------------
// unwrapRoot — chrome.bookmarks.getTree() returns a single unnamed root
// folder wrapping the real top-level folders; peel off single-child
// wrapper levels so the row starts at the actual folders.
// ---------------------------------------------------------------------------

function unwrapRoot(tree: BookmarkTreeNode[]): BookmarkTreeNode[] {
  let nodes = tree;
  while (nodes.length === 1) {
    const only = nodes[0];
    if (!only || only.url || !only.children) break;
    nodes = only.children;
  }
  return nodes;
}

// ---------------------------------------------------------------------------
// LinkCard — small card showing a bookmark's title, domain, folder, and tags.
// ---------------------------------------------------------------------------

function LinkCard({
  node,
  meta,
  folderTitle,
  onToggleFavorite,
}: {
  node: BookmarkTreeNode;
  meta: BookmarkMetadata[string] | undefined;
  folderTitle: string;
  onToggleFavorite: (id: string, current: boolean) => void;
}) {
  const isFavorite = meta?.favorites === true;
  const tags = meta?.tags ?? [];
  const domain = getDomain(node.url);

  return (
    <li className="group rounded-lg border border-border bg-surface p-3 transition-colors hover:border-fg/30">
      <div className="flex items-start justify-between gap-2">
        <a
          href={node.url}
          target="_self"
          rel="noopener noreferrer"
          className="min-w-0 flex-1"
        >
          <p className={`truncate text-sm text-fg transition-colors group-hover:text-accent ${isFavorite ? 'font-medium' : ''}`}>
            {node.title || domain}
          </p>
          {domain && <p className="truncate text-xs text-muted">{domain}</p>}
        </a>
        <button
          onClick={() => onToggleFavorite(node.id, isFavorite)}
          className={`inline-flex shrink-0 items-center rounded border px-1.5 py-0.5 text-xs leading-none transition-colors focus-visible:outline-2 focus-visible:outline-fg ${
            isFavorite
              ? 'border-accent bg-accent/10 text-accent'
              : 'border-border text-muted hover:border-fg/40 hover:text-fg'
          }`}
          title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          {isFavorite ? '★' : '☆'}
        </button>
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        <span className="inline-flex items-center rounded-full border border-border bg-page px-2 py-0.5 text-xs text-muted">
          {folderTitle}
        </span>
        {tags.map((t) => (
          <span
            key={t}
            className="inline-flex items-center rounded-full border border-border bg-page px-2 py-0.5 text-xs text-muted"
          >
            {t}
          </span>
        ))}
      </div>
    </li>
  );
}

function getDomain(url: string | undefined): string {
  if (!url) return '';
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

