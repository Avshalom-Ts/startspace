import { useState, useCallback } from "react";

// ---------------------------------------------------------------------------
// FavoritesList — render favorites from bookmarks + extension metadata.
// ---------------------------------------------------------------------------

export { useFavorites } from "../hooks/useFavorites";
export { useConfig } from "../hooks/useConfig";
export { useWorkspace } from "../hooks/useWorkspace";

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
    <section className="w-full flex flex-col items-center">
      <h2 className="text-sm text-center font-medium uppercase tracking-wide text-muted mb-3">
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
        <ul className="flex flex-wrap justify-center items-center gap-2">
          {items.map((item) => (
            <li key={item.id}>
              <a
                href={item.url}
                target="_self"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-fg transition-colors hover:border-fg/40 hover:bg-page hover:text-accent"
              >
                {item.title}
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// useFavoritesWrite — toggle favorites in extension storage (shared with LinksPage).
// ---------------------------------------------------------------------------

export function useFavoritesWrite() {
  const [loading, setLoading] = useState(false);

  const toggle = useCallback(async (id: string, current: boolean) => {
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

      const existing = await new Promise<Record<string, unknown>>((resolve) => {
        local.get([META_KEY], (result: Record<string, unknown>) => {
          resolve(result);
        });
      });

      const raw = existing[META_KEY];
      const meta: Record<
        string,
        {
          favorites: boolean;
          tags: string[];
          dateAdded: string;
          relatedNotes: string[];
          relatedTasks: string[];
        }
      > =
        raw && typeof raw === "object"
          ? (raw as Record<
              string,
              {
                favorites: boolean;
                tags: string[];
                dateAdded: string;
                relatedNotes: string[];
                relatedTasks: string[];
              }
            >)
          : {};

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
      console.warn("[StartSpace] failed to toggle favorite:", err);
      setLoading(false);
    }
  }, []);

  return { toggle, loading };
}
