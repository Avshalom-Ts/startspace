import { useEffect, useState, useCallback } from 'react';
import { useConfig } from '../hooks/useConfig';
import type { WorkspaceRef } from '../hooks/useConfig';
import { useFavorites } from '../hooks/useFavorites';
import { useWorkspace } from '../hooks/useWorkspace';

// ---------------------------------------------------------------------------
// WorkspaceSetupPrompt
// ---------------------------------------------------------------------------

/**
 * Shown when the user has not yet chosen a workspace folder.
 * Calls showDirectoryPicker() via useWorkspace, persists the result to
 * chrome.storage.local via useConfig, so the homepage is shown on
 * subsequent launches.
 */
export function WorkspaceSetupPrompt() {
  const { grant, error, chooseWorkspace, reset } = useWorkspace();
  const { config, save: saveConfig } = useConfig();
  const [pickedName, setPickedName] = useState<string>('');

  // Persist the workspace identity to extension config when a folder is granted.
  useEffect(() => {
    if (grant.handle && config && config.currentWorkspace?.name !== grant.handle.name) {
      const ref: WorkspaceRef = {
        id: `ws-${grant.handle.name}`,
        name: grant.handle.name,
      };
      void saveConfig({ ...config, currentWorkspace: ref });
      setPickedName(grant.handle.name);
    } else if (grant.handle) {
      setPickedName(grant.handle.name);
    }
  }, [grant.handle, config, saveConfig]);

  const done = !!grant.handle && grant.permission === 'granted';
  const remembered = !!grant.handle && !done;

  return (
    <div className="w-full max-w-xl">
      <div className="rounded-lg border border-border bg-surface p-6 text-center">
        <h2 className="text-lg font-medium text-fg mb-2">Choose your workspace</h2>
        <p className="text-sm text-muted mb-4">
          StartSpace stores your notes, tasks, and workspace metadata in a folder
          on your computer. Pick a folder to get started.
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={done ? reset : chooseWorkspace}
            className="rounded-md border border-border bg-page px-4 py-2 text-sm font-medium text-fg transition-colors hover:border-fg/40 hover:bg-page hover:text-accent focus-visible:outline-2 focus-visible:outline-fg"
          >
            {done ? 'Choose a different folder' : remembered ? 'Reconnect workspace folder' : 'Choose workspace folder'}
          </button>

          {error ? (
            <p className="text-sm text-red-500">{error}</p>
          ) : done ? (
            <p className="text-sm text-muted">
              Selected: <span className="text-fg">{pickedName}</span>
            </p>
          ) : null}
        </div>

        <p className="mt-4 text-xs text-muted">
          Your browser prompts you to grant access to the folder. StartSpace does not
          upload or share your files — everything stays on your computer.
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PageContent — homepage shell with workspace-aware rendering.
// ---------------------------------------------------------------------------

export function PageContent() {
  const { config, loading: configLoading } = useConfig();
  const { favorites, loading: favoritesLoading } = useFavorites();
  const workspaceReady = config?.currentWorkspace != null;

  if (configLoading) {
    return (
      <div className="w-full flex items-center justify-center py-12">
        <div className="w-4 h-4 border-2 border-border border-t-fg rounded-full animate-spin" />
      </div>
    );
  }

  if (!workspaceReady) {
    return (
      <div className="w-full mt-6">
        <WorkspaceSetupPrompt />
      </div>
    );
  }

  return (
    <div className="w-full mt-6">
      <FavoritesList items={favorites} loading={favoritesLoading} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// FavoritesList — render favorites from bookmarks + extension metadata.
// ---------------------------------------------------------------------------

export { useFavorites } from '../hooks/useFavorites';
export { useConfig } from '../hooks/useConfig';
export { useWorkspace } from '../hooks/useWorkspace';

interface FavoriteItem {
  id: string;
  title: string;
  url: string;
}

export function FavoritesList({
  items,
  loading,
}: {
  items: FavoriteItem[];
  loading: boolean;
}) {
  return (
    <section className="w-full">
      <h2 className="text-sm font-medium uppercase tracking-wide text-muted mb-3">
        Favorites
      </h2>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted">
          <div className="w-4 h-4 border-2 border-border border-t-fg rounded-full animate-spin" />
          <span>Loading bookmarks…</span>
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted">No favorites yet.</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {items.map((item) => (
            <li key={item.id}>
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-fg transition-colors hover:border-fg/40 hover:bg-page hover:text-accent"
              >
                {item.title}
              </a>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-3 text-xs text-muted">
        Favorites are backed by browser bookmarks linked by Bookmark ID.
      </p>
    </section>
  );
}

// ---------------------------------------------------------------------------
// useFavoritesWrite — toggle favorites in extension storage (shared with LinksPage).
// ---------------------------------------------------------------------------

export function useFavoritesWrite() {
  const [loading, setLoading] = useState(false);

  const toggle = useCallback(
    async (id: string, current: boolean) => {
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
                set: (items: Record<string, unknown>, cb?: () => void) => void;
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

        const existing = await new Promise<Record<string, unknown>>((resolve) => {
          local.get([META_KEY], (result: Record<string, unknown>) => {
            resolve(result);
          });
        });

        const raw = existing[META_KEY];
        const meta: Record<string, { favorites: boolean; tags: string[]; dateAdded: string; relatedNotes: string[]; relatedTasks: string[] }> =
          raw && typeof raw === 'object' ? (raw as Record<string, { favorites: boolean; tags: string[]; dateAdded: string; relatedNotes: string[]; relatedTasks: string[] }>) : {};

        const entry = meta[id] ?? {
          favorites: false,
          tags: [],
          dateAdded: new Date().toISOString(),
          relatedNotes: [],
          relatedTasks: [],
        };

        entry.favorites = !current;
        meta[id] = entry;

        await new Promise<void>((resolve) => {
          local.set({ [META_KEY]: meta }, () => {
            resolve();
          });
        });

        setLoading(false);
      } catch (err) {
        console.warn('[StartSpace] failed to toggle favorite:', err);
        setLoading(false);
      }
    },
    []
  );

  return { toggle, loading };
}
