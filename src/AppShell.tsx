// Owns page routing and keyboard search activation; web searches use browser defaults.
import { useState, useEffect, useMemo, useRef } from "react";
import { Header } from "./Header";
import { SearchBar, PageFooter } from "./components";
import { NAV } from "./data/nav";
import { useTheme } from "./hooks/useTheme";
import { isHomeLimit, useConfig } from "./hooks/useConfig";
import { PageContent } from "./components/page-content";
import { LinksPage } from "./links/links-page";
import { NotesPage } from "./notes/notes-page";
import { SettingsPage } from "./settings/SettingsPage";
import { TasksPage } from "./tasks/tasks-page";
import { useBookmarkTree, useBookmarkMetadata } from "./hooks/useBookmarkTree";
import { useSearchData } from "./search/use-search-data";
import { searchWeb } from "./search/browser-search";
import { useNotifications } from "./notifications/notification-context";
import {
  searchSelectedSources,
  type SelectedSearchScope,
  type LocalSearchScope,
} from "./search/search";
import { SearchResults } from "./search/SearchResults";
import { collectBookmarkNodeIds } from "./bookmarks/bookmark-tree";
import { useDescriptionFetching } from "./links/use-description-fetching";

// ---------------------------------------------------------------------------
// AppShell â€” hash-based page routing
// ---------------------------------------------------------------------------

const PAGE_NAMES = ["home", "links", "notes", "tasks", "settings"] as const;
type PageName = (typeof PAGE_NAMES)[number];

export function AppShell() {
  const notifications = useNotifications();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchScopes, setSearchScopes] = useState<SelectedSearchScope[]>([
    "bookmarks", "notes", "tasks", "web",
  ]);
  const [activeSearchResult, setActiveSearchResult] = useState(-1);
  const [unlimitedScope, setUnlimitedScope] = useState<LocalSearchScope | null>(null);

  /** Toggles independent search sources and returns expanded results to limited mode. */
  const toggleSearchScope = (scope: SelectedSearchScope) => {
    setSearchScopes((current) =>
      current.includes(scope)
        ? current.filter((item) => item !== scope)
        : [...current, scope],
    );
    setUnlimitedScope(null);
    setActiveSearchResult(-1);
  };

  /** Keeps all matches from one feature inside the dropdown. */
  const showAllResults = (scope: LocalSearchScope) => {
    setSearchScopes([scope]);
    setUnlimitedScope(scope);
    setActiveSearchResult(-1);
  };
  const { mounted } = useTheme();
  const { config: appConfig } = useConfig();
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
    () =>
      searchSelectedSources(
        searchData,
        searchQuery,
        searchScopes,
        {
          bookmarks: isHomeLimit(appConfig?.preferences?.searchLinksLimit)
            ? appConfig.preferences.searchLinksLimit
            : 6,
          notes: isHomeLimit(appConfig?.preferences?.searchNotesLimit)
            ? appConfig.preferences.searchNotesLimit
            : 6,
          tasks: isHomeLimit(appConfig?.preferences?.searchTasksLimit)
            ? appConfig.preferences.searchTasksLimit
            : 6,
        },
        unlimitedScope,
      ),
    [searchData, searchQuery, searchScopes, unlimitedScope, appConfig],
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
  const activeSearchLabel = useMemo(() => {
    const results = [
      ...searchResults.bookmarks.map((result) => result.bookmark.title || result.bookmark.url),
      ...searchResults.notes.map((result) => result.note.title),
      ...searchResults.tasks.map((task) => task.title),
      ...(searchResults.webQuery ? [`Search the web for ${searchResults.webQuery}`] : []),
    ];
    return activeSearchResult >= 0 ? results[activeSearchResult] : null;
  }, [activeSearchResult, searchResults]);
  useEffect(() => setActiveSearchResult(-1), [searchQuery, searchResults]);
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
  const descriptionFetching = useDescriptionFetching(
    bookmarkMetadata.available && !metaLoading && !bookmarkMetadata.error,
    page === "home",
  );

  const isLinks = page === "links";
  const isNotes = page === "notes";
  const isSettings = page === "settings";
  const fullHeight = isNotes || isLinks || page === "tasks" || isSettings;
  // Favorite toggles must not blank the Links layout, so only initial reads count.
  const showLoading = treeLoading || metaLoading;

  const searchInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const focusHomeSearch = () => {
      if (
        page !== "home" ||
        (document.activeElement !== document.body &&
          document.activeElement !== document.documentElement) ||
        document.querySelector(
          'dialog[open], [role="dialog"], [role="alertdialog"]',
        )
      )
        return;
      searchInputRef.current?.focus();
    };
    const focusSearch = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchInputRef.current?.focus();
      } else if (
        event.key === "Escape" &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey &&
        !event.shiftKey
      ) {
        focusHomeSearch();
      }
    };
    focusHomeSearch();
    window.addEventListener("focus", focusHomeSearch);
    window.addEventListener("keydown", focusSearch);
    return () => {
      window.removeEventListener("focus", focusHomeSearch);
      window.removeEventListener("keydown", focusSearch);
    };
  }, [page]);

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
            : page === "home"
              ? "flex-1 flex flex-col px-4 pb-4 w-full"
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
              resultCount={searchResultUrls.length}
              activeResultIndex={activeSearchResult}
              compact
            />
            <p className="sr-only" role="status" aria-live="polite">
              {searchQuery.trim()
                ? activeSearchLabel
                  ? `${searchResultUrls.length} results. ${activeSearchLabel} selected.`
                  : `${searchResultUrls.length} results available.`
                : ""}
            </p>
            {searchQuery.trim() && (
              <div className="absolute inset-x-0 top-full z-20">
                <SearchResults
                  onWebSearch={() => void submitWebSearch()}
                  results={searchResults}
                  onShowAll={showAllResults}
                  unlimitedScope={unlimitedScope}
                  query={searchQuery}
                  activeResultIndex={activeSearchResult}
                />
              </div>
            )}
          </div>
        )}
        {page === "home" && (
          <div className="flex min-h-0 flex-1 flex-col">
            <section className="home-hero -mx-4 flex min-h-56 flex-col items-center justify-center px-4 py-6 text-center">
              {(appConfig?.preferences?.showGreeting ?? true) && (
                <>
                  <h1 className="text-2xl font-semibold text-fg">
                    Good{" "}
                    {new Date().getHours() >= 5 && new Date().getHours() < 12
                      ? "morning"
                      : new Date().getHours() < 18 &&
                          new Date().getHours() >= 12
                        ? "afternoon"
                        : "evening"}
                    !
                  </h1>
                  <p className="mt-1 text-sm text-muted">
                    Your browser. Your workspace. Your data.
                  </p>
                </>
              )}
              <div className="relative mt-4 w-full max-w-5xl">
                <SearchBar
                  ref={searchInputRef}
                  value={searchQuery}
                  onChange={(query) => {
                    setSearchQuery(query);
                    setActiveSearchResult(-1);
                  }}
                  onSubmit={submitSearch}
                  onNavigate={navigateSearchResults}
                  resultCount={searchResultUrls.length}
                  activeResultIndex={activeSearchResult}
                />
                <p className="sr-only" role="status" aria-live="polite">
                  {searchQuery.trim()
                    ? activeSearchLabel
                      ? `${searchResultUrls.length} results. ${activeSearchLabel} selected.`
                      : `${searchResultUrls.length} results available.`
                    : ""}
                </p>
                <nav
                  aria-label="Search scope"
                  className="mt-2 flex flex-wrap justify-center gap-2"
                >
                  {(
                    [
                      ["bookmarks", "Bookmarks"],
                      ["notes", "Notes"],
                      ["tasks", "Tasks"],
                      ["web", "Web"],
                    ] as const
                  ).map(([scope, label]) => (
                    <button
                      key={scope}
                      type="button"
                      aria-pressed={searchScopes.includes(scope)}
                      onClick={() => toggleSearchScope(scope)}
                      className={`rounded-full border px-3 py-1 text-xs ${searchScopes.includes(scope) ? "border-accent bg-accent/15 text-fg" : "border-border bg-surface/70 text-muted hover:text-fg"}`}
                    >
                      {label}
                    </button>
                  ))}
                </nav>
                {searchQuery.trim() && (
                  <div className="absolute inset-x-0 top-full z-20 mt-2">
                    <SearchResults
                      onWebSearch={() => void submitWebSearch()}
                      results={searchResults}
                      onShowAll={showAllResults}
                      unlimitedScope={unlimitedScope}
                      query={searchQuery}
                      activeResultIndex={activeSearchResult}
                    />
                  </div>
                )}
              </div>
            </section>
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
            metadataAvailable={bookmarkMetadata.available && !bookmarkMetadata.error}
            metadataError={bookmarkMetadata.error}
            onFetchDescription={descriptionFetching.fetch}
            fetchingId={descriptionFetching.fetchingId}
            notes={searchData.notes}
            tasks={searchData.tasks}
            onToggleFavorite={(id, current) => {
              void bookmarkMetadata.update(id, { favorites: !current }).catch((error: unknown) =>
                notifications.error(error instanceof Error ? error.message : "Favorite could not be saved."),
              );
            }}
            onUpdateMetadata={bookmarkMetadata.update}
            onCreate={async (input) => {
              const node = await bookmarkTree.create(input);
              if (node.url) descriptionFetching.afterCreate(node.id);
              return node;
            }}
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
            onRetry={() => {
              void bookmarkTree.reload();
              void bookmarkMetadata.reload();
            }}
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
