// Owns page routing and keyboard search activation; web searches use browser defaults.
import { useState, useEffect, useMemo, useRef } from "react";
import { Header } from "./Header";
import { SearchBar, PageFooter } from "./components";
import { NAV } from "./data/nav";
import { useTheme } from "./hooks/useTheme";
import { PageContent } from "./components/page-content";
import { LinksPage } from "./links/links-page";
import { NotesPage } from "./notes/notes-page";
import { SettingsPage } from "./settings/SettingsPage";
import { TasksPage } from "./tasks/tasks-page";
import { useBookmarkTree, useBookmarkMetadata } from "./hooks/useBookmarkTree";
import { useSearchData } from "./search/use-search-data";
import { searchWeb } from "./search/browser-search";
import { useNotifications } from "./notifications/notification-context";
import { orchestrateSearch } from "./search/search";
import { SearchResults } from "./search/SearchResults";
import { collectBookmarkNodeIds } from "./bookmarks/bookmark-tree";
import { useFavoritesWrite } from "./links/favorites-list";

// ---------------------------------------------------------------------------
// AppShell â€” hash-based page routing
// ---------------------------------------------------------------------------

const PAGE_NAMES = ["home", "links", "notes", "tasks", "settings"] as const;
type PageName = (typeof PAGE_NAMES)[number];

export function AppShell() {
  const notifications = useNotifications();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSearchResult, setActiveSearchResult] = useState(-1);
  const { mounted } = useTheme();
  const [page, setPage] = useState<PageName>("home");
  const routeRef = useRef(window.location.hash || "#home");

  // Derive the active page from the URL hash on mount and on hashchange.
  useEffect(() => {
    function derive() {
      const raw =
        window.location.hash.replace(/^#/, "").split("?")[0] || "home";
      const nextHash = window.location.hash || "#home";
      const apply = () => {
        if (nextHash !== routeRef.current) setSearchQuery("");
        routeRef.current = nextHash;
        if (window.location.hash !== nextHash)
          history.replaceState(null, "", nextHash);
        setPage(
          (PAGE_NAMES as readonly string[]).includes(raw)
            ? (raw as PageName)
            : "home",
        );
      };
      if (nextHash !== routeRef.current) {
        const guard = new CustomEvent("startspace:before-navigate", {
          cancelable: true,
          detail: {
            proceed: () => {
              apply();
              window.dispatchEvent(new HashChangeEvent("hashchange"));
            },
          },
        });
        if (!window.dispatchEvent(guard)) {
          history.replaceState(null, "", routeRef.current);
          return;
        }
      }
      apply();
    }
    derive();
    window.addEventListener("hashchange", derive);
    return () => window.removeEventListener("hashchange", derive);
  }, []);

  // Update nav items to produce hash hrefs that the router understands.
  const nav = NAV.map((item) => {
    const idx = PAGE_NAMES.indexOf(item.label.toLowerCase() as PageName);
    const href = idx >= 0 ? `#${PAGE_NAMES[idx]}` : item.href;
    return { ...item, href };
  });

  // Data needed by pages.
  const searchData = useSearchData();
  const searchResults = useMemo(
    () => orchestrateSearch(searchData, searchQuery),
    [searchData, searchQuery],
  );
  const searchResultUrls = useMemo(
    () => [
      ...searchResults.bookmarks.map((result) => result.bookmark.url),
      ...searchResults.notes.map(
        (result) => `#notes?note=${encodeURIComponent(result.note.id)}`,
      ),
      ...searchResults.tasks.map(
        (task) => `#tasks?task=${encodeURIComponent(task.id)}`,
      ),
      ...(searchResults.webQuery ? [null] : []),
    ],
    [searchResults],
  );
  useEffect(() => setActiveSearchResult(-1), [searchQuery]);
  /** Sends only an explicitly submitted query to the browser's default provider. */
  const submitWebSearch = async () => {
    try {
      await searchWeb(searchResults.webQuery ?? "");
    } catch {
      notifications.error(
        "Web search is unavailable. Try again or use your browserâ€™s address bar.",
      );
    }
  };
  const submitSearch = () => {
    if (searchData.loading || !searchQuery.trim()) return;
    const url =
      searchResultUrls[activeSearchResult < 0 ? 0 : activeSearchResult];
    if (url) window.location.assign(url);
    else void submitWebSearch();
  };
  const navigateSearchResults = (direction: "previous" | "next") => {
    if (!searchResultUrls.length) return;
    setActiveSearchResult((current) => {
      if (current === -1) {
        return direction === "next" ? 0 : searchResultUrls.length - 1;
      }
      const offset = direction === "next" ? 1 : -1;
      return (
        (current + offset + searchResultUrls.length) % searchResultUrls.length
      );
    });
  };
  const bookmarkTree = useBookmarkTree();
  const { tree, loading: treeLoading } = bookmarkTree;
  const bookmarkMetadata = useBookmarkMetadata();
  const { metadata, loading: metaLoading } = bookmarkMetadata;
  const { toggle: toggleFavorite } = useFavoritesWrite();

  const isLinks = page === "links";
  const isNotes = page === "notes";
  const isSettings = page === "settings";
  const fullHeight = isNotes || isLinks || page === "tasks";
  // Favorite toggles must not blank the Links layout, so only initial reads count.
  const showLoading = treeLoading || metaLoading;

  const searchInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, []);

  return (
    <div
      className={
        fullHeight
          ? "flex h-dvh min-h-0 flex-col bg-page"
          : "min-h-screen flex flex-col bg-page"
      }
    >
      <Header nav={nav} page={page} />

      <main
        className={
          fullHeight
            ? "flex min-h-0 flex-1 flex-col px-3 pb-3 min-[1280px]:px-4"
            : "flex-1 flex flex-col px-6 py-12 max-w-6xl mx-auto w-full"
        }
      >
        {fullHeight && (
          <div className="relative z-20 mx-auto w-full max-w-4xl py-3">
            <SearchBar
              ref={searchInputRef}
              value={searchQuery}
              onChange={setSearchQuery}
              onSubmit={submitSearch}
              onNavigate={navigateSearchResults}
              compact
            />
            {searchQuery.trim() && (
              <div className="absolute inset-x-0 top-full z-20">
                <SearchResults
                  onWebSearch={() => void submitWebSearch()}
                  results={searchResults}
                  query={searchQuery}
                  activeResultIndex={activeSearchResult}
                />
              </div>
            )}
          </div>
        )}
        {page === "home" && (
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="relative w-full max-w-3xl py-3">
              <SearchBar
                ref={searchInputRef}
                value={searchQuery}
                onChange={(query) => {
                  setSearchQuery(query);
                  setActiveSearchResult(-1);
                }}
                onSubmit={submitSearch}
                onNavigate={navigateSearchResults}
              />
              {searchQuery.trim() && (
                <div className="absolute inset-x-0 top-full z-20 mt-2">
                  <SearchResults
                    onWebSearch={() => void submitWebSearch()}
                    results={searchResults}
                    query={searchQuery}
                    activeResultIndex={activeSearchResult}
                  />
                </div>
              )}
            </div>
            <PageContent />
          </div>
        )}

        {isNotes ? (
          <NotesPage />
        ) : page === "tasks" ? (
          <TasksPage />
        ) : isLinks ? (
          <LinksPage
            tree={tree}
            metadata={metadata}
            notes={searchData.notes}
            tasks={searchData.tasks}
            onToggleFavorite={(id, current) => {
              void toggleFavorite(id, current).then(bookmarkMetadata.reload);
            }}
            onUpdateMetadata={bookmarkMetadata.update}
            onCreate={bookmarkTree.create}
            onUpdate={bookmarkTree.update}
            onMove={bookmarkTree.move}
            onDelete={async (node) => {
              const ids = collectBookmarkNodeIds(node);
              await bookmarkTree.remove(node.id, !node.url);
              await bookmarkMetadata.removeIds(ids);
            }}
            loading={showLoading}
            mutating={bookmarkTree.mutating}
            error={bookmarkTree.error}
            onClearError={bookmarkTree.clearError}
            onRetry={() => void bookmarkTree.reload()}
          />
        ) : isSettings ? (
          <SettingsPage />
        ) : null}
      </main>

      {!fullHeight && <PageFooter />}

      {!mounted && (
        <div className="fixed inset-0 flex items-center justify-center bg-page z-50 pointer-events-none">
          <div className="w-4 h-4 border-2 border-border border-t-fg rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
