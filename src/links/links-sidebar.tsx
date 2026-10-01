// links-sidebar.tsx
//
// Links navigation: smart views with real counts and the browser folder tree.

import { useState, type KeyboardEvent } from "react";
import {
  ChevronDown,
  ChevronRight,
  Clock,
  Folder,
  FolderPlus,
  Library,
  PanelLeftClose,
  Plus,
  Search,
  Star,
} from "lucide-react";
import {
  countBookmarkLeaves,
  matchFolderIds,
  type LinksView,
} from "./links-view";
import type { BookmarkNode } from "../hooks/useBookmarks";
import { MenuButton, type MenuItem } from "./links-ui";

interface LinksSidebarProps {
  roots: BookmarkNode[];
  rootIds: Set<string>;
  view: LinksView;
  counts: { all: number; favorites: number; recent: number };
  onSelectView: (view: LinksView) => void;
  onAddBookmark: () => void;
  onNewFolder: (parentId?: string) => void;
  onEditFolder: (folder: BookmarkNode) => void;
  onDeleteFolder: (folder: BookmarkNode) => void;
  onHide: () => void;
}

/** Renders the folder/navigation panel of the Links page. */
export function LinksSidebar({
  roots,
  rootIds,
  view,
  counts,
  onSelectView,
  onAddBookmark,
  onNewFolder,
  onEditFolder,
  onDeleteFolder,
  onHide,
}: LinksSidebarProps) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(roots.map((root) => root.id)),
  );
  const matches = matchFolderIds(roots, query);
  const smartViews = [
    {
      view: { kind: "all" } as const,
      label: "All Links",
      icon: Library,
      count: counts.all,
    },
    {
      view: { kind: "favorites" } as const,
      label: "Favorites",
      icon: Star,
      count: counts.favorites,
    },
    {
      view: { kind: "recent" } as const,
      label: "Recent",
      icon: Clock,
      count: counts.recent,
    },
  ];
  const toggle = (id: string) =>
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  /** Arrow/Home/End navigation across visible folder rows. */
  const onTreeKey = (event: KeyboardEvent<HTMLUListElement>) => {
    const items = [
      ...event.currentTarget.querySelectorAll<HTMLButtonElement>(
        "[data-folder-id]",
      ),
    ];
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    const current = items[index];
    if (!current) return;
    const move = (target?: HTMLButtonElement) => {
      event.preventDefault();
      target?.focus();
    };
    if (event.key === "ArrowDown") move(items[index + 1]);
    else if (event.key === "ArrowUp") move(items[index - 1]);
    else if (event.key === "Home") move(items[0]);
    else if (event.key === "End") move(items[items.length - 1]);
    else if (event.key === "ArrowRight") {
      event.preventDefault();
      if (current.dataset.expandable !== "true") return;
      if (current.dataset.expanded === "true") move(items[index + 1]);
      else toggle(current.dataset.folderId!);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      if (current.dataset.expanded === "true" && matches === null)
        toggle(current.dataset.folderId!);
      else
        move(
          items.find(
            (item) => item.dataset.folderId === current.dataset.parentId,
          ),
        );
    }
  };

  return (
    <nav
      aria-label="Links folders"
      className="flex h-full min-h-0 flex-col rounded-[10px] border border-border bg-surface"
    >
      <div className="flex items-center justify-between gap-2 px-4 pt-4">
        <h2 className="text-lg font-semibold text-fg">Links</h2>
        <div className="flex gap-1">
          <button
            type="button"
            data-links-add
            className="notes-icon-button"
            aria-label="Add bookmark"
            title="Add bookmark"
            onClick={onAddBookmark}
          >
            <Plus size={18} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="notes-icon-button"
            aria-label="Hide folders"
            title="Hide folders"
            onClick={onHide}
          >
            <PanelLeftClose size={18} aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className="relative px-4 pb-3 pt-3">
        <Search
          size={16}
          aria-hidden="true"
          className="pointer-events-none absolute left-7 top-1/2 -translate-y-1/2 text-muted"
        />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search folders…"
          aria-label="Search folders"
          className="notes-input pl-9"
        />
      </div>
      <div className="app-scrollbar min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        <ul className="space-y-0.5">
          {smartViews.map(({ view: target, label, icon: Icon, count }) => {
            const selected = view.kind === target.kind;
            return (
              <li key={label}>
                <button
                  type="button"
                  aria-current={selected ? "page" : undefined}
                  onClick={() => onSelectView(target)}
                  className={`notes-nav-row ${selected ? "notes-selected" : ""}`}
                >
                  <Icon
                    size={16}
                    aria-hidden="true"
                    className={
                      target.kind === "favorites" ? "text-accent" : "text-muted"
                    }
                  />
                  <span className="flex-1 truncate text-left">{label}</span>
                  <span className="rounded bg-fg/5 px-1.5 text-xs text-muted">
                    {count}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <hr className="my-2 border-border" />
        {matches?.size === 0 ? (
          <p className="px-3 py-2 text-sm text-muted">
            No folders match “{query.trim()}”.
          </p>
        ) : (
          <ul
            role="tree"
            aria-label="Bookmark folders"
            className="space-y-0.5"
            onKeyDown={onTreeKey}
          >
            {roots
              .filter((root) => !root.url)
              .map((root) => (
                <FolderRow
                  key={root.id}
                  folder={root}
                  depth={0}
                  rootIds={rootIds}
                  matches={matches}
                  expanded={expanded}
                  selectedId={view.kind === "folder" ? view.id : null}
                  onToggle={toggle}
                  onSelect={(id) => onSelectView({ kind: "folder", id })}
                  onNewFolder={onNewFolder}
                  onEditFolder={onEditFolder}
                  onDeleteFolder={onDeleteFolder}
                />
              ))}
          </ul>
        )}
      </div>
      <div className="border-t border-border p-2">
        <button
          type="button"
          className="notes-nav-row"
          onClick={() =>
            onNewFolder(view.kind === "folder" ? view.id : undefined)
          }
        >
          <FolderPlus size={16} aria-hidden="true" className="text-muted" />
          New Folder
        </button>
      </div>
    </nav>
  );
}

/** One tree item with disclosure, descendant count and folder actions. */
function FolderRow({
  folder,
  depth,
  rootIds,
  matches,
  expanded,
  selectedId,
  onToggle,
  onSelect,
  onNewFolder,
  onEditFolder,
  onDeleteFolder,
}: {
  folder: BookmarkNode;
  depth: number;
  rootIds: Set<string>;
  matches: Set<string> | null;
  expanded: Set<string>;
  selectedId: string | null;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
  onNewFolder: (parentId?: string) => void;
  onEditFolder: (folder: BookmarkNode) => void;
  onDeleteFolder: (folder: BookmarkNode) => void;
}) {
  if (matches && !matches.has(folder.id)) return null;
  const subfolders = (folder.children ?? []).filter((child) => !child.url);
  const open = matches !== null || expanded.has(folder.id);
  const selected = selectedId === folder.id;
  const title = folder.title || "Browser bookmarks";
  const actions: MenuItem[] = [
    { label: "New folder here", onSelect: () => onNewFolder(folder.id) },
  ];
  if (!rootIds.has(folder.id))
    actions.push(
      { label: "Edit or move folder", onSelect: () => onEditFolder(folder) },
      {
        label: "Delete folder",
        onSelect: () => onDeleteFolder(folder),
        danger: true,
      },
    );
  return (
    <li
      role="treeitem"
      aria-expanded={subfolders.length ? open : undefined}
      aria-selected={selected}
    >
      <div
        className={`group flex min-h-9 items-center rounded-md border-l-2 border-transparent pr-1 hover:bg-fg/5 ${selected ? "notes-selected" : ""}`}
        style={{ paddingLeft: depth * 16 + 4 }}
      >
        {subfolders.length ? (
          <button
            type="button"
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded text-muted hover:text-fg"
            aria-label={`${open ? "Collapse" : "Expand"} ${title}`}
            onClick={() => onToggle(folder.id)}
          >
            {open ? (
              <ChevronDown size={16} aria-hidden="true" />
            ) : (
              <ChevronRight size={16} aria-hidden="true" />
            )}
          </button>
        ) : (
          <span className="w-7 shrink-0" />
        )}
        <button
          type="button"
          data-folder-id={folder.id}
          data-parent-id={folder.parentId}
          data-expandable={subfolders.length > 0}
          data-expanded={subfolders.length > 0 && open}
          onClick={() => onSelect(folder.id)}
          className="flex min-w-0 flex-1 items-center gap-2 py-1.5 text-left text-sm text-fg"
        >
          <Folder
            size={16}
            aria-hidden="true"
            className="shrink-0 text-accent"
          />
          <span className="truncate">{title}</span>
        </button>
        <span
          className="ml-1 rounded bg-fg/5 px-1.5 text-xs text-muted"
          aria-label={`${countBookmarkLeaves(folder)} bookmarks`}
        >
          {countBookmarkLeaves(folder)}
        </span>
        <MenuButton
          label={`Folder actions for ${title}`}
          items={actions}
          className="opacity-70 group-hover:opacity-100 group-focus-within:opacity-100"
        />
      </div>
      {open && subfolders.length > 0 && (
        <ul role="group" className="space-y-0.5">
          {subfolders.map((child) => (
            <FolderRow
              key={child.id}
              folder={child}
              depth={depth + 1}
              rootIds={rootIds}
              matches={matches}
              expanded={expanded}
              selectedId={selectedId}
              onToggle={onToggle}
              onSelect={onSelect}
              onNewFolder={onNewFolder}
              onEditFolder={onEditFolder}
              onDeleteFolder={onDeleteFolder}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
