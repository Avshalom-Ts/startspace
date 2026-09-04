import { useState, useEffect, useMemo } from "react";
import { Header } from "./Header";
import { SearchBar, PageFooter } from "./components";
import { NAV } from "./data/nav";
import { useTheme } from "./hooks/useTheme";
import { PageContent } from "./components/page-content";
import { LinksPage } from "./links/LinksPage";
import { NotesPage } from "./notes/notes-page";
import { SettingsPage } from "./settings/SettingsPage";
import { TasksPage } from "./tasks/tasks-page";
import { useBookmarkTree, useBookmarkMetadata } from "./hooks/useBookmarkTree";
import type { BookmarkMetadata } from "./hooks/useBookmarks";
import { useSearchData } from "./search/use-search-data";
import { orchestrateSearch } from "./search/search";
import { SearchResults } from "./search/SearchResults";
import { collectBookmarkNodeIds } from "./bookmarks/bookmark-tree";

// ---------------------------------------------------------------------------
// useFavoritesWrite — toggle the favorites flag in extension storage.
// ---------------------------------------------------------------------------

function useFavoritesWrite() {
  const [loading, setLoading] = useState(false);

  const toggle = async (id: string, current: boolean): Promise<void> => {
    setLoading(true);
    try {
      const chromeExt = (
        globalThis as {
          chrome?: {
            storage?: {
              local: {
                get: (
                  keys: string[],
                  cb: (result: Record<string, unknown>) => void,
                ) => void;
                set: (items: Record<string, unknown>, cb?: () => void) => void;
              };
            };
          };
        }
      ).chrome;

      if (!chromeExt?.storage?.local) {
        setLoading(false);
        return;
      }

      const local = chromeExt.storage.local;
      const META_KEY = "startspace.bookmarkMetadata";
      local.get([META_KEY], (result: Record<string, unknown>) => {
        const raw = result[META_KEY];
        const meta =
          raw && typeof raw === "object"
            ? (raw as Record<string, BookmarkMetadata>)
            : {};

        const entry: BookmarkMetadata = meta[id] ?? {
          favorites: false,
          tags: [],
          dateAdded: new Date().toISOString(),
          relatedNotes: [],
          relatedTasks: [],
        };

        entry.favorites = !current;
        meta[id] = entry;

        local.set({ [META_KEY]: meta }, () => {
          setLoading(false);
        });
      });
    } catch (err) {
      console.warn("[StartSpace] failed to toggle favorite:", err);
      setLoading(false);
    }
  };

  return { toggle, loading };
}

// ---------------------------------------------------------------------------
// AppShell — hash-based page routing
// ---------------------------------------------------------------------------

const PAGE_NAMES = ["home", "links", "notes", "tasks", "settings"] as const;
type PageName = (typeof PAGE_NAMES)[number];

export function AppShell() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSearchResult, setActiveSearchResult] = useState(-1);
  const { mounted } = useTheme();
  const [page, setPage] = useState<PageName>("home");

  // Derive the active page from the URL hash on mount and on hashchange.
  useEffect(() => {
    function derive() {
      const raw =
        window.location.hash.replace(/^#/, "").split("?")[0] || "home";
      setPage(
        (PAGE_NAMES as readonly string[]).includes(raw)
          ? (raw as PageName)
          : "home",
      );
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
      ...(searchResults.webUrl ? [searchResults.webUrl] : []),
    ],
    [searchResults],
  );
  useEffect(() => setActiveSearchResult(-1), [searchQuery]);
  const submitSearch = () => {
    const url = searchResultUrls[activeSearchResult] ?? searchResults.webUrl;
    if (url) window.location.assign(url);
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
  const { toggle: toggleFavorite, loading: toggleLoading } =
    useFavoritesWrite();

  const isLinks = page === "links";
  const isNotes = page === "notes";
  const isSettings = page === "settings";
  const showLoading = treeLoading || metaLoading || toggleLoading;

  return (
    <div className="min-h-screen flex flex-col bg-page">
      <Header nav={nav} />

      <main className="flex-1 flex flex-col px-6 py-12 max-w-6xl mx-auto w-full">
        {page === "home" && (
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="relative w-full max-w-3xl py-3">
              <SearchBar
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
            onToggleFavorite={(id, current) => {
              void toggleFavorite(id, current).then(bookmarkMetadata.reload);
            }}
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
          />
        ) : isSettings ? (
          <SettingsPage />
        ) : null}
      </main>

      <PageFooter />

      {!mounted && (
        <div className="fixed inset-0 flex items-center justify-center bg-page z-50 pointer-events-none">
          <div className="w-4 h-4 border-2 border-border border-t-fg rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
