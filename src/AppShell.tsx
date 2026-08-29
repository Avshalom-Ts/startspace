import { useState, useEffect } from 'react';
import { Header } from './Header';
import { SearchBar, PageFooter } from './components';
import { NAV } from './data/nav';
import { useTheme } from './hooks/useTheme';
import { PageContent } from './components/WorkspaceSetup';
import { LinksPage } from './components/LinksPage';
import { NotesPage } from './notes/notes-page';
import { SettingsPage } from './components/SettingsPage';
import { TasksPage } from './tasks/tasks-page';
import { useBookmarkTree, useBookmarkMetadata } from './hooks/useBookmarkTree';
import type { BookmarkMetadata } from './hooks/useBookmarks';

// ---------------------------------------------------------------------------
// useFavoritesWrite — toggle the favorites flag in extension storage.
// ---------------------------------------------------------------------------

function useFavoritesWrite() {
  const [loading, setLoading] = useState(false);

  const toggle = async (id: string, current: boolean): Promise<void> => {
    setLoading(true);
    try {
      const chromeExt = (globalThis as {
        chrome?: {
          storage?: {
            local: {
              get: (
                keys: string[],
                cb: (result: Record<string, unknown>) => void
              ) => void;
              set: (
                items: Record<string, unknown>,
                cb?: () => void
              ) => void;
            };
          };
        };
      }).chrome;

      if (!chromeExt?.storage?.local) {
        setLoading(false);
        return;
      }

      const local = chromeExt.storage.local;
      const META_KEY = 'startspace.bookmarkMetadata';
      local.get([META_KEY], (result: Record<string, unknown>) => {
        const raw = result[META_KEY];
        const meta =
          raw && typeof raw === 'object'
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
      console.warn('[StartSpace] failed to toggle favorite:', err);
      setLoading(false);
    }
  };

  return { toggle, loading };
}

// ---------------------------------------------------------------------------
// AppShell — hash-based page routing
// ---------------------------------------------------------------------------

const PAGE_NAMES = ['home', 'links', 'notes', 'tasks', 'settings'] as const;
type PageName = (typeof PAGE_NAMES)[number];

export function AppShell() {
  const [searchQuery, setSearchQuery] = useState('');
  const { mounted } = useTheme();
  const [page, setPage] = useState<PageName>('home');

  // Derive the active page from the URL hash on mount and on hashchange.
  useEffect(() => {
    function derive() {
      const raw = window.location.hash.replace(/^#/, '') || 'home';
      setPage((PAGE_NAMES as readonly string[]).includes(raw) ? (raw as PageName) : 'home');
    }
    derive();
    window.addEventListener('hashchange', derive);
    return () => window.removeEventListener('hashchange', derive);
  }, []);

  // Update nav items to produce hash hrefs that the router understands.
  const nav = NAV.map((item) => {
    const idx = PAGE_NAMES.indexOf(item.label.toLowerCase() as PageName);
    const href = idx >= 0 ? `#${PAGE_NAMES[idx]}` : item.href;
    return { ...item, href };
  });

  // Data needed by pages.
  const { tree, loading: treeLoading } = useBookmarkTree();
  const { metadata, loading: metaLoading } = useBookmarkMetadata();
  const { toggle: toggleFavorite, loading: toggleLoading } = useFavoritesWrite();

  const isLinks = page === 'links';
  const isNotes = page === 'notes';
  const isSettings = page === 'settings';
  const showLoading = treeLoading || metaLoading || toggleLoading;

  return (
    <div className="min-h-screen flex flex-col bg-page">
      <Header nav={nav} />

      <main className="flex-1 flex flex-col items-center px-6 py-12 max-w-6xl mx-auto w-full">
        {page === 'home' && (
          <div className="w-full py-3">
            <SearchBar value={searchQuery} onChange={setSearchQuery} />
          </div>
        )}

        {isNotes ? (
          <NotesPage />
        ) : page === 'tasks' ? (
          <TasksPage />
        ) : isLinks ? (
          <LinksPage
            tree={tree}
            metadata={metadata}
            onToggleFavorite={toggleFavorite}
            loading={showLoading}
          />
        ) : isSettings ? (
          <SettingsPage />
        ) : (
          <PageContent />
        )}
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
