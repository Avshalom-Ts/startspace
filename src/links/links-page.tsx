// LinksPage.tsx
//
// Three-region Links workspace: folder sidebar, bookmark grid/list and the
// selected-bookmark inspector. Browser fields go through the Bookmark API;
// favorites, tags, descriptions, recent opens and note relations are
// StartSpace metadata keyed by the browser Bookmark ID.

import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import {
  findBookmarkNode,
  unwrapBookmarkRoots,
} from "../bookmarks/bookmark-tree";
import type {
  CreateBookmarkInput,
  UpdateBookmarkInput,
} from "../bookmarks/bookmark-service";
import {
  applyLinkFilters,
  bookmarkFolderPath,
  EMPTY_FILTERS,
  isSafeLinkUrl,
  selectViewLinks,
  sortLinks,
  type LinkFilters,
  type LinksSort,
  type LinksView,
} from "./links-view";
import type { BookmarkMetadata, BookmarkNode } from "../hooks/useBookmarks";
import { useWorkspace } from "../hooks/useWorkspace";
import { useNotifications } from "../notifications/notification-context";
import { setTaskBookmarkLink } from "../tasks/task-workspace";
import type { Task } from "../tasks/tasks-model";
import type { NoteEntry } from "../types/notes";
import {
  BookmarkEditor,
  DeleteDialog,
  type EditorState,
} from "./links-dialogs";
import {
  createDemoLinksMetadata,
  demoLinksNotes,
  demoLinksTasks,
  demoLinksTree,
} from "./links-demo";
import { LinksGrid, type LinksLayout } from "./links-grid";
import { LinksInspector } from "./links-inspector";
import { LinksSidebar } from "./links-sidebar";
import { useDrawerFocusTrap } from "./links-ui";

interface LinksPageProps {
  tree: BookmarkNode[];
  metadata: Record<string, BookmarkMetadata>;
  metadataAvailable?: boolean;
  metadataError?: string | null;
  fetchingId?: string | null;
  onFetchDescription?: (id: string) => Promise<void>;
  notes: NoteEntry[];
  tasks: Task[];
  onToggleFavorite: (id: string, current: boolean) => void;
  onUpdateMetadata: (
    id: string,
    patch: Partial<BookmarkMetadata>,
  ) => Promise<void>;
  onCreate: (input: CreateBookmarkInput) => Promise<BookmarkNode>;
  onUpdate: (id: string, changes: UpdateBookmarkInput) => Promise<BookmarkNode>;
  onMove: (id: string, parentId: string) => Promise<BookmarkNode>;
  onDelete: (node: BookmarkNode) => Promise<void>;
  loading: boolean;
  mutating: boolean;
  error: string | null;
  onClearError: () => void;
  onRetry: () => void;
}

const VIEW_TITLES = {
  all: "All Links",
  favorites: "Favorites",
  recent: "Recent",
} as const;
const EMPTY_MESSAGES = {
  all: "No bookmarks yet.",
  favorites: "No favorites yet. Use the star on a bookmark to add it here.",
  recent: "Bookmarks you open from StartSpace in the last 30 days appear here.",
  folder: "No bookmarks in this folder.",
} as const;

/** Renders the Links page, with an opt-in synthetic preview (#links?demo=1). */
export function LinksPage(props: LinksPageProps) {
  const notifications = useNotifications();
  const { grant } = useWorkspace();
  const [demo, setDemo] = useState(
    () => new URLSearchParams(location.hash.split("?")[1]).get("demo") === "1",
  );
  const [demoMetadata, setDemoMetadata] = useState(() =>
    createDemoLinksMetadata(Date.now()),
  );
  const [previewTasks, setPreviewTasks] = useState(() => demoLinksTasks);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [deleting, setDeleting] = useState<BookmarkNode | null>(null);
  const [view, setView] = useState<LinksView>({ kind: "all" });
  const [layout, setLayout] = useState<LinksLayout>(() =>
    localStorage.getItem("startspace.links.layout") === "list"
      ? "list"
      : "grid",
  );
  const [sort, setSort] = useState<LinksSort>("name-asc");
  const [filters, setFilters] = useState<LinkFilters>(EMPTY_FILTERS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [foldersHidden, setFoldersHidden] = useState(false);
  const [foldersDrawer, setFoldersDrawer] = useState(false);
  // undefined = no pending focus; null = fall back to Add bookmark.
  const [focusAfterDelete, setFocusAfterDelete] = useState<
    string | null | undefined
  >(undefined);
  const foldersRef = useRef<HTMLDivElement>(null);
  const inspectorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const syncLayout = (event: Event) => {
      const next = (event as CustomEvent<LinksLayout>).detail;
      if (next === "grid" || next === "list") setLayout(next);
    };
    window.addEventListener("startspace:links-layout-changed", syncLayout);
    return () =>
      window.removeEventListener("startspace:links-layout-changed", syncLayout);
  }, []);

  const tree = demo ? demoLinksTree : props.tree;
  const metadata = demo ? demoMetadata : props.metadata;
  const metadataAvailable = demo || props.metadataAvailable !== false;
  const notes = demo ? demoLinksNotes : props.notes;
  const tasks = demo ? previewTasks : props.tasks;
  const roots = useMemo(() => unwrapBookmarkRoots(tree), [tree]);
  const rootIds = useMemo(() => new Set(roots.map((root) => root.id)), [roots]);
  const now = Date.now();

  const viewFolder =
    view.kind === "folder" ? findBookmarkNode(roots, view.id) : null;
  const selectedNode = selectedId ? findBookmarkNode(roots, selectedId) : null;
  const inspectorDrawer = Boolean(selectedNode?.url);
  const editorMissing =
    !demo &&
    !props.loading &&
    Boolean(editor?.node && !findBookmarkNode(roots, editor.node.id));
  useDrawerFocusTrap(foldersRef, foldersDrawer, "(min-width: 64rem)");
  useDrawerFocusTrap(inspectorRef, inspectorDrawer, "(min-width: 90rem)");

  useEffect(() => {
    const applyNavigationHandoff = () => {
      const params = new URLSearchParams(location.hash.split("?")[1]);
      const query = params.get("q");
      const viewName = params.get("view");
      const tag = params.get("tag");
      if (viewName === "favorites" || viewName === "recent") {
        setView({ kind: viewName });
        setFilters(EMPTY_FILTERS);
      } else if (tag) {
        setView({ kind: "all" });
        setFilters({ ...EMPTY_FILTERS, tags: [tag] });
      } else if (query) {
        setView({ kind: "all" });
        setFilters({ ...EMPTY_FILTERS, text: query });
      }
    };
    applyNavigationHandoff();
    window.addEventListener("hashchange", applyNavigationHandoff);
    return () =>
      window.removeEventListener("hashchange", applyNavigationHandoff);
  }, []);

  useEffect(() => {
    if (view.kind === "folder" && !viewFolder && !props.loading)
      setView({ kind: "all" });
  }, [view, viewFolder, props.loading]);
  useEffect(() => {
    if (selectedId && !selectedNode && !props.loading) setSelectedId(null);
  }, [selectedId, selectedNode, props.loading]);
  useEffect(() => {
    if (!foldersDrawer && !inspectorDrawer) return;
    const close = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || editor || deleting) return;
      setFoldersDrawer(false);
      setSelectedId(null);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [foldersDrawer, inspectorDrawer, editor, deleting]);

  const allLinks = selectViewLinks(roots, { kind: "all" }, metadata, now);
  const counts = {
    all: allLinks.length,
    favorites: selectViewLinks(roots, { kind: "favorites" }, metadata, now)
      .length,
    recent: selectViewLinks(roots, { kind: "recent" }, metadata, now).length,
  };
  const viewLinks = selectViewLinks(roots, view, metadata, now);
  const effectiveSort: LinksSort =
    view.kind !== "folder" && sort === "browser" ? "name-asc" : sort;
  const filtered = applyLinkFilters(viewLinks, filters, metadata);
  const items =
    view.kind === "recent" ? filtered : sortLinks(filtered, effectiveSort);
  const folderPath = selectedNode
    ? bookmarkFolderPath(roots, selectedNode.id)
        .map((folder) => folder.title || "Browser bookmarks")
        .join(" / ")
    : "";

  useEffect(() => {
    if (focusAfterDelete === undefined) return;
    const card = focusAfterDelete
      ? document.querySelector<HTMLElement>(
          `[data-link-id="${CSS.escape(focusAfterDelete)}"]`,
        )
      : null;
    const add = [
      ...document.querySelectorAll<HTMLElement>("[data-links-add]"),
    ].find((element) => element.offsetParent !== null);
    (card ?? add)?.focus();
    setFocusAfterDelete(undefined);
  }, [focusAfterDelete]);

  /** Writes metadata to storage, or to the in-memory preview state. */
  const updateMetadata = async (
    id: string,
    patch: Partial<BookmarkMetadata>,
  ) => {
    if (demo) {
      setDemoMetadata((current) => ({
        ...current,
        [id]: {
          favorites: false,
          tags: [],
          dateAdded: new Date().toISOString(),
          relatedNotes: [],
          relatedTasks: [],
          ...current[id],
          ...patch,
        },
      }));
      return;
    }
    try {
      await props.onUpdateMetadata(id, patch);
    } catch (failure) {
      notifications.error(
        failure instanceof Error
          ? failure.message
          : "Bookmark details could not be saved. Try again.",
      );
      throw failure;
    }
  };
  const updateTaskLink = async (
    taskId: string,
    bookmarkId: string,
    linked: boolean,
  ): Promise<boolean> => {
    if (demo) {
      setPreviewTasks((current) =>
        current.map((task) => {
          if (task.id !== taskId) return task;
          const bookmarkIds = linked
            ? task.bookmarkIds.includes(bookmarkId)
              ? task.bookmarkIds
              : [...task.bookmarkIds, bookmarkId]
            : task.bookmarkIds.filter((id) => id !== bookmarkId);
          return { ...task, bookmarkIds };
        }),
      );
      return true;
    }
    if (!grant.handle || grant.permission !== "granted") {
      notifications.error("Connect a workspace before changing task links.");
      return false;
    }
    try {
      await setTaskBookmarkLink(grant.handle, taskId, bookmarkId, linked);
      window.dispatchEvent(new Event("startspace:workspace-changed"));
      notifications.success(linked ? "Task linked to bookmark." : "Task unlinked from bookmark.");
      return true;
    } catch (failure) {
      notifications.error(
        failure instanceof Error
          ? failure.message
          : "Task link could not be saved. Refresh and retry.",
      );
      return false;
    }
  };
  const toggleFavorite = (id: string, current: boolean) => {
    if (demo) void updateMetadata(id, { favorites: !current });
    else props.onToggleFavorite(id, current);
  };
  const openLink = (node: BookmarkNode, event?: MouseEvent) => {
    if (!isSafeLinkUrl(node.url)) {
      event?.preventDefault();
      notifications.error(
        "This bookmark uses a URL type StartSpace does not open.",
      );
      return;
    }
    const url = node.url;
    const recorded = metadataAvailable ? updateMetadata(node.id, {
      lastOpenedAt: new Date().toISOString(),
    }).catch(() => undefined) : Promise.resolve();
    if (
      event &&
      (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)
    )
      return;
    event?.preventDefault();
    void recorded.finally(() => window.location.assign(url));
  };
  const copyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      notifications.success("URL copied.");
    } catch {
      notifications.error("The URL could not be copied.");
    }
  };
  const guardDemo = () => {
    if (!demo) return false;
    notifications.info("Browser bookmarks are not changed in the preview.");
    return true;
  };
  const selectView = (next: LinksView) => {
    setView(next);
    setFoldersDrawer(false);
  };
  const filterByTag = (tag: string) => {
    setView({ kind: "all" });
    setFilters({ ...EMPTY_FILTERS, text: tag });
  };
  const newFolder = (parentId?: string) =>
    setEditor({ mode: "create-folder", parentId: parentId ?? viewFolder?.id });
  const addBookmark = () =>
    setEditor({ mode: "create-link", parentId: viewFolder?.id });
  const showFolders = () => {
    if (window.matchMedia("(min-width: 1024px)").matches)
      setFoldersHidden(false);
    else setFoldersDrawer(true);
  };

  if (props.loading && !demo) return <LoadingBookmarks />;
  if (!demo && roots.length === 0)
    return (
      <section className="mx-auto mt-10 max-w-xl rounded-xl border border-border bg-surface p-8 text-center">
        <h1 className="text-2xl font-semibold text-fg">Links</h1>
        <p className="my-4 text-muted">
          {props.error ?? "No bookmarks found in the browser."}
        </p>
        <div className="flex justify-center gap-2">
          {props.error && (
            <button
              type="button"
              className="notes-primary"
              onClick={props.onRetry}
            >
              Retry
            </button>
          )}
          <button
            type="button"
            className="notes-button"
            onClick={() => setDemo(true)}
          >
            Preview the layout
          </button>
        </div>
      </section>
    );

  const title =
    view.kind === "folder"
      ? viewFolder?.title || "Browser bookmarks"
      : VIEW_TITLES[view.kind];
  const gridCols = foldersHidden
    ? "lg:grid-cols-[minmax(0,1fr)]"
    : "lg:grid-cols-[clamp(220px,15%,300px)_minmax(0,1fr)]";

  return (
    <section
      className="flex min-h-0 flex-1 flex-col"
      aria-label="Links workspace"
    >
      {demo && (
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded border border-accent/30 bg-accent/10 px-4 py-2 text-xs">
          <span>
            <strong>Design preview</strong> · Synthetic bookmarks, tags and
            relationships. Nothing is saved to your browser or workspace.
          </span>
          <button
            type="button"
            className="underline"
            onClick={() => {
              setDemo(false);
              setSelectedId(null);
              setView({ kind: "all" });
              setFilters(EMPTY_FILTERS);
            }}
          >
            Exit preview
          </button>
        </div>
      )}
      {!demo && (!metadataAvailable || props.metadataError) && (
        <div role={props.metadataError ? "alert" : "status"} className="mb-2 rounded border border-border p-3 text-sm">
          {props.metadataError ?? "Connect a workspace to use favorites, descriptions, tags, and recent links."}
          {props.metadataError && <button type="button" className="notes-button ml-2" onClick={props.onRetry}>Retry metadata</button>}
        </div>
      )}
      {props.error && !demo && (
        <div
          role="alert"
          className="mb-2 flex items-center justify-between gap-3 rounded border border-red-400 px-3 py-2 text-sm"
        >
          <span>{props.error}</span>
          <span className="flex gap-3">
            <button type="button" className="underline" onClick={props.onRetry}>
              Retry
            </button>
            <button
              type="button"
              className="underline"
              onClick={props.onClearError}
            >
              Dismiss
            </button>
          </span>
        </div>
      )}

      <div
        className={`relative grid min-h-0 flex-1 grid-cols-1 gap-4 ${gridCols}`}
      >
        {foldersDrawer && (
          <div
            className="fixed inset-0 z-30 bg-black/45 lg:hidden"
            onClick={() => setFoldersDrawer(false)}
          />
        )}
        <div
          ref={foldersRef}
          className={
            foldersDrawer
              ? `fixed inset-y-0 left-0 z-40 w-[min(320px,90vw)] bg-page p-3 shadow-2xl lg:static lg:z-auto lg:w-auto lg:bg-transparent lg:p-0 lg:shadow-none ${foldersHidden ? "lg:hidden" : ""}`
              : `hidden min-h-0 ${foldersHidden ? "" : "lg:block"}`
          }
        >
          <LinksSidebar
            roots={roots}
            rootIds={rootIds}
            view={view}
            counts={counts}
            onSelectView={selectView}
            onAddBookmark={addBookmark}
            onNewFolder={newFolder}
            onEditFolder={(folder) => setEditor({ mode: "edit", node: folder })}
            onDeleteFolder={setDeleting}
            onHide={() =>
              foldersDrawer ? setFoldersDrawer(false) : setFoldersHidden(true)
            }
          />
        </div>

        <LinksGrid
          title={title}
          items={items}
          showFolderPaths={view.kind === "folder"}
          totalBeforeFilters={viewLinks.length}
          metadata={metadata}
          selectedId={selectedId}
          layout={layout}
          sort={effectiveSort}
          allowBrowserOrder={view.kind === "folder"}
          recentView={view.kind === "recent"}
          filters={filters}
          emptyMessage={!metadataAvailable && (view.kind === "favorites" || view.kind === "recent")
            ? "Workspace metadata is unavailable. Connect the workspace or retry reading its metadata."
            : EMPTY_MESSAGES[view.kind]}
          metadataAvailable={metadataAvailable}
          showAddOnEmpty={view.kind === "all" || view.kind === "folder"}
          foldersHidden={foldersHidden}
          onShowFolders={showFolders}
          onLayout={setLayout}
          onSort={setSort}
          onFilters={setFilters}
          onClearFilters={() => setFilters(EMPTY_FILTERS)}
          onSelect={(id) =>
            setSelectedId((current) => (current === id ? null : id))
          }
          onInspect={setSelectedId}
          onToggleFavorite={toggleFavorite}
          onOpen={openLink}
          onEdit={(node) => setEditor({ mode: "edit", node })}
          onDelete={setDeleting}
          onAddBookmark={addBookmark}
          onTagClick={filterByTag}
        />

        {inspectorDrawer && (
          <div
            className="absolute inset-0 z-20 rounded-[10px] bg-black/45 wide:hidden"
            onClick={() => setSelectedId(null)}
          />
        )}
        <div
          ref={inspectorRef}
          className={
            inspectorDrawer
              ? "absolute inset-y-0 right-0 z-30 w-full rounded-[10px] shadow-2xl md:w-90 wide:w-[390px]"
              : "hidden"
          }
        >
          <LinksInspector
            node={selectedNode}
            folderPath={folderPath}
            meta={selectedNode ? metadata[selectedNode.id] : undefined}
            notes={notes}
            tasks={tasks}
            onSetTaskLink={updateTaskLink}
            onClose={() => setSelectedId(null)}
            onToggleFavorite={toggleFavorite}
            onUpdateMetadata={updateMetadata}
            onOpen={openLink}
            onCopy={(url) => void copyUrl(url)}
            onEdit={(node) => setEditor({ mode: "edit", node })}
            onDelete={setDeleting}
            onTagClick={filterByTag}
            metadataAvailable={metadataAvailable}
            fetching={props.fetchingId === selectedNode?.id}
            onFetchDescription={!demo ? props.onFetchDescription : undefined}
          />
        </div>
      </div>

      {editor && (
        <BookmarkEditor
          editor={editor}
          folderTree={roots}
          busy={props.mutating}
          missing={editorMissing}
          onSave={async (values) => {
            if (guardDemo()) {
              setEditor(null);
              return;
            }
            try {
              if (editor.mode === "create-link")
                await props.onCreate({
                  parentId: values.parentId,
                  title: values.title,
                  url: values.url,
                });
              else if (editor.mode === "create-folder")
                await props.onCreate({
                  parentId: values.parentId,
                  title: values.title,
                });
              else if (editor.node) {
                await props.onUpdate(
                  editor.node.id,
                  editor.node.url
                    ? { title: values.title, url: values.url }
                    : { title: values.title },
                );
                if (values.parentId !== editor.node.parentId)
                  await props.onMove(editor.node.id, values.parentId);
              }
              notifications.success(
                editor.mode === "create-link"
                  ? "Bookmark created."
                  : editor.mode === "create-folder"
                    ? "Folder created."
                    : "Bookmark updated.",
              );
              setEditor(null);
            } catch (failure) {
              notifications.error(
                failure instanceof Error
                  ? failure.message
                  : "The bookmark operation failed. Try again.",
              );
              props.onClearError();
              throw failure;
            }
          }}
          onRequestDelete={
            editor.node && !rootIds.has(editor.node.id)
              ? () => {
                  setDeleting(editor.node ?? null);
                  setEditor(null);
                }
              : undefined
          }
          onClose={() => setEditor(null)}
        />
      )}

      {deleting && (
        <DeleteDialog
          node={deleting}
          busy={props.mutating}
          onConfirm={async () => {
            if (guardDemo()) {
              setDeleting(null);
              return;
            }
            try {
              const deletedKind = deleting.url ? "Bookmark" : "Folder";
              const index = items.findIndex(
                (item) => item.node.id === deleting.id,
              );
              const neighbour = items[index + 1] ?? items[index - 1];
              await props.onDelete(deleting);
              if (deleting.id === selectedId) setSelectedId(null);
              if (index >= 0) setFocusAfterDelete(neighbour?.node.id ?? null);
              notifications.success(`${deletedKind} deleted.`);
              setDeleting(null);
            } catch (failure) {
              notifications.error(
                failure instanceof Error
                  ? failure.message
                  : "The bookmark could not be deleted. Try again.",
              );
              props.onClearError();
              throw failure;
            }
          }}
          onClose={() => setDeleting(null)}
        />
      )}
    </section>
  );
}

/** Labeled skeleton of the three Links regions while bookmarks load. */
function LoadingBookmarks() {
  return (
    <div
      role="status"
      className="grid min-h-0 flex-1 grid-cols-1 gap-4 motion-safe:animate-pulse lg:grid-cols-[clamp(220px,15%,300px)_minmax(0,1fr)]"
    >
      <span className="sr-only">Loading bookmarks…</span>
      <div className="hidden space-y-3 rounded-[10px] border border-border bg-surface p-4 lg:block">
        {Array.from({ length: 8 }, (_, index) => (
          <div key={index} className="h-5 rounded bg-fg/10" />
        ))}
      </div>
      <div className="space-y-3">
        <div className="h-8 w-48 rounded bg-fg/10" />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4 ultra:grid-cols-6">
          {Array.from({ length: 9 }, (_, index) => (
            <div
              key={index}
              className="h-29 rounded-[10px] border border-border bg-surface"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
