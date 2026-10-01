// links-grid.tsx
//
// Center Links region: heading, filter field, view controls and bookmark cards.

import type { MouseEvent } from "react";
import {
  CircleAlert,
  LayoutGrid,
  List,
  PanelLeftOpen,
  Search,
  Star,
} from "lucide-react";
import { isSafeLinkUrl, type LinkFilters, type LinksSort } from "./links-view";
import type { LinkSearchItem } from "./links-search";
import type { BookmarkMetadata, BookmarkNode } from "../hooks/useBookmarks";
import { hostname, LinkIcon, MenuButton, TagChip } from "./links-ui";

export type LinksLayout = "grid" | "list";

interface LinksGridProps {
  title: string;
  items: LinkSearchItem[];
  totalBeforeFilters: number;
  metadata: Record<string, BookmarkMetadata>;
  selectedId: string | null;
  layout: LinksLayout;
  sort: LinksSort;
  allowBrowserOrder: boolean;
  recentView: boolean;
  filters: LinkFilters;
  emptyMessage: string;
  showAddOnEmpty: boolean;
  foldersHidden: boolean;
  onShowFolders: () => void;
  onLayout: (layout: LinksLayout) => void;
  onSort: (sort: LinksSort) => void;
  onFilters: (filters: LinkFilters) => void;
  onClearFilters: () => void;
  onSelect: (id: string) => void;
  onToggleFavorite: (id: string, current: boolean) => void;
  onOpen: (node: BookmarkNode, event?: MouseEvent) => void;
  onEdit: (node: BookmarkNode) => void;
  onDelete: (node: BookmarkNode) => void;
  onAddBookmark: () => void;
  onTagClick: (tag: string) => void;
}

/** Renders the Links heading, toolbar and grid/list of bookmarks. */
export function LinksGrid(props: LinksGridProps) {
  const { title, items, totalBeforeFilters, filters, layout, sort } = props;
  const activeFilters =
    (filters.text.trim() ? 1 : 0) +
    (filters.favoritesOnly ? 1 : 0) +
    filters.tags.length;

  return (
    <section
      aria-labelledby="links-heading"
      className="flex h-full min-h-0 flex-col"
    >
      <div className="flex flex-wrap items-start gap-3 pb-3">
        <div className="flex items-start gap-2">
          <button
            type="button"
            className={`notes-icon-button mt-1 ${props.foldersHidden ? "" : "lg:hidden"}`}
            aria-label="Show folders"
            title="Show folders"
            onClick={props.onShowFolders}
          >
            <PanelLeftOpen size={18} aria-hidden="true" />
          </button>
          <div>
            <h1
              id="links-heading"
              className="text-[26px] font-semibold leading-tight text-fg"
            >
              {title}
            </h1>
            <p className="text-sm text-muted" aria-live="polite">
              {activeFilters
                ? `${items.length} of ${totalBeforeFilters} bookmarks`
                : `${items.length} bookmark${items.length === 1 ? "" : "s"}`}
            </p>
          </div>
        </div>
        <div className="relative min-w-48 flex-1 self-center">
          <Search
            size={16}
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            id="links-filter"
            type="search"
            value={filters.text}
            onChange={(event) =>
              props.onFilters({ ...filters, text: event.target.value })
            }
            placeholder="Filter by name, URL, tag or description…"
            aria-label="Filter bookmarks"
            className="notes-input pl-9"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 self-center">
          <div
            className="flex rounded-md border border-border"
            role="group"
            aria-label="Layout"
          >
            <button
              type="button"
              aria-pressed={layout === "grid"}
              aria-label="Grid view"
              title="Grid view"
              onClick={() => props.onLayout("grid")}
              className={`notes-icon-button ${layout === "grid" ? "bg-accent/15 text-accent!" : ""}`}
            >
              <LayoutGrid size={18} aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-pressed={layout === "list"}
              aria-label="List view"
              title="List view"
              onClick={() => props.onLayout("list")}
              className={`notes-icon-button ${layout === "list" ? "bg-accent/15 text-accent!" : ""}`}
            >
              <List size={18} aria-hidden="true" />
            </button>
          </div>
          {props.recentView ? (
            <span className="text-sm text-muted">Sorted by last opened</span>
          ) : (
            <label className="flex items-center gap-2 text-sm text-muted">
              <span className="sr-only">Sort</span>
              <select
                value={sort}
                onChange={(event) =>
                  props.onSort(event.target.value as LinksSort)
                }
                className="notes-input min-h-9 w-auto py-1.5"
              >
                <option value="name-asc">Name A–Z</option>
                <option value="name-desc">Name Z–A</option>
                {props.allowBrowserOrder && (
                  <option value="browser">Browser order</option>
                )}
              </select>
            </label>
          )}
        </div>
      </div>

      <div className="app-scrollbar min-h-0 flex-1 overflow-y-auto pr-1">
        {items.length ? (
          <ul
            aria-label={`${title} bookmarks`}
            className={
              layout === "grid"
                ? "grid grid-cols-1 gap-3 md:grid-cols-4 ultra:grid-cols-6"
                : "flex flex-col gap-2"
            }
          >
            {items.map(({ node }) => (
              <LinkCard
                key={node.id}
                node={node}
                meta={props.metadata[node.id]}
                layout={layout}
                selected={props.selectedId === node.id}
                onSelect={() => props.onSelect(node.id)}
                onToggleFavorite={props.onToggleFavorite}
                onOpen={(event) => props.onOpen(node, event)}
                onEdit={() => props.onEdit(node)}
                onDelete={() => props.onDelete(node)}
                onTagClick={props.onTagClick}
              />
            ))}
          </ul>
        ) : (
          <div className="rounded-[10px] border border-dashed border-border p-8 text-center text-sm text-muted">
            <p>
              {activeFilters
                ? "No bookmarks match these filters."
                : props.emptyMessage}
            </p>
            {activeFilters ? (
              <button
                type="button"
                className="notes-button mt-3"
                onClick={props.onClearFilters}
              >
                Clear filters
              </button>
            ) : (
              props.showAddOnEmpty && (
                <button
                  type="button"
                  data-links-add
                  className="notes-primary mt-3"
                  onClick={props.onAddBookmark}
                >
                  Add bookmark
                </button>
              )
            )}
          </div>
        )}
      </div>
    </section>
  );
}

/** One bookmark card: the card opens the link; the info icon shows details. */
function LinkCard({
  node,
  meta,
  layout,
  selected,
  onSelect,
  onToggleFavorite,
  onOpen,
  onEdit,
  onDelete,
  onTagClick,
}: {
  node: BookmarkNode;
  meta?: BookmarkMetadata;
  layout: LinksLayout;
  selected: boolean;
  onSelect: () => void;
  onToggleFavorite: (id: string, current: boolean) => void;
  onOpen: (event?: MouseEvent) => void;
  onEdit: () => void;
  onDelete: () => void;
  onTagClick: (tag: string) => void;
}) {
  const favorite = meta?.favorites === true;
  const name = node.title || hostname(node.url) || "Untitled bookmark";
  const tags = meta?.tags ?? [];
  const grid = layout === "grid";
  return (
    <li
      className={`relative rounded-[10px] border transition-colors ${selected ? "border-accent/80 bg-accent/10" : "border-border bg-surface hover:border-fg/30"} ${grid ? "min-h-29 p-4" : "px-3 py-2"}`}
    >
      <a
        href={isSafeLinkUrl(node.url) ? node.url : undefined}
        data-link-id={node.id}
        aria-label={`Open ${name}`}
        onClick={onOpen}
        className="absolute inset-0 cursor-pointer rounded-[10px]"
      />
      <div
        className={`pointer-events-none relative flex gap-4 pr-28 ${grid ? "items-start" : "items-center"}`}
      >
        <LinkIcon title={name} url={node.url} size={grid ? 48 : 32} />
        <div
          className={`min-w-0 flex-1 ${grid ? "" : "flex items-center gap-4"}`}
        >
          <p className="truncate font-medium text-fg" title={name}>
            {name}
          </p>
          <p
            className={`truncate text-sm text-muted ${grid ? "" : "flex-1"}`}
            title={node.url}
          >
            {node.url}
          </p>
          {tags.length > 0 && (
            <div
              className={`flex flex-wrap gap-1.5 overflow-hidden ${grid ? "mt-2 max-h-15" : "max-h-7 shrink-0"}`}
            >
              {tags.map((tag) => (
                <TagChip key={tag} onClick={() => onTagClick(tag)}>
                  {tag}
                </TagChip>
              ))}
            </div>
          )}
        </div>
      </div>
      <div
        className={`absolute right-2 flex items-center ${grid ? "top-2" : "top-1/2 -translate-y-1/2"}`}
      >
        <button
          type="button"
          onClick={onSelect}
          aria-pressed={selected}
          aria-label={`Show details for ${name}`}
          title="Show details"
          className={`notes-icon-button ${selected ? "text-accent!" : ""}`}
        >
          <CircleAlert size={18} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => onToggleFavorite(node.id, favorite)}
          aria-pressed={favorite}
          aria-label={
            favorite
              ? `Remove ${name} from favorites`
              : `Add ${name} to favorites`
          }
          title={favorite ? "Remove from favorites" : "Add to favorites"}
          className={`notes-icon-button ${favorite ? "text-accent!" : ""}`}
        >
          <Star
            size={18}
            fill={favorite ? "currentColor" : "none"}
            aria-hidden="true"
          />
        </button>
        <MenuButton
          label={`Actions for ${name}`}
          items={[
            { label: "Open", onSelect: () => onOpen() },
            { label: "Edit or move", onSelect: onEdit },
            { label: "Delete", onSelect: onDelete, danger: true },
          ]}
        />
      </div>
    </li>
  );
}
