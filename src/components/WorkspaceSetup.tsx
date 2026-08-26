import { useEffect, useState } from 'react';
import { useConfig } from '../hooks/useConfig';
import { useFavorites } from '../hooks/useFavorites';
import { useWorkspace } from '../hooks/useWorkspace';

// ---------------------------------------------------------------------------
// WorkspaceSetupPrompt
// ---------------------------------------------------------------------------

/**
 * Shown when the user has not yet chosen a workspace folder.
 * Calls showDirectoryPicker() via useWorkspace, and
 * updates extension config so the homepage is shown on subsequent launches.
 */
export function WorkspaceSetupPrompt() {
  const { grant, error, chooseWorkspace } = useWorkspace();
  const [pickedName, setPickedName] = useState<string>('');

  useEffect(() => {
    if (grant.handle) {
      setPickedName(grant.name);
    }
  }, [grant]);

  const done = !!grant.handle;

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
            onClick={chooseWorkspace}
            className="rounded-md border border-border bg-page px-4 py-2 text-sm font-medium text-fg transition-colors hover:border-fg/40 hover:bg-page hover:text-accent focus-visible:outline-2 focus-visible:outline-fg"
          >
            {done ? 'Choose a different folder' : 'Choose workspace folder'}
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

/**
 * The content shown inside <main> after the search bar.
 *
 * When no workspace is configured: show the setup prompt.
 * When a workspace is configured: show favorites (backed by bookmarks).
 */
export function PageContent() {
  const { config, loading: configLoading } = useConfig();
  const { favorites, loading: favoritesLoading } = useFavorites();

  // The workspace selection dialog is async; once the user has chosen a folder
  // and we have written config, the setup prompt should go away.
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

/** Re-export so other modules can import workspace hooks from one barrel. */
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
