
// ---------------------------------------------------------------------------
// FavoritesList — render favorites from bookmarks + workspace metadata.
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
