import { useConfig } from "../hooks/useConfig";
import { useFavorites } from "../hooks/useFavorites";
import { FavoritesList } from "../links/favorites-list";

// ---------------------------------------------------------------------------
// PageContent — homepage shell with workspace-aware rendering.
// ---------------------------------------------------------------------------

export function PageContent() {
  const { loading: configLoading } = useConfig();
  const { favorites, loading: favoritesLoading } = useFavorites();

  if (configLoading) {
    return (
      <div className="w-full flex items-center justify-center py-12">
        <div className="w-4 h-4 border-2 border-border border-t-fg rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full mt-6">
      <FavoritesList items={favorites} loading={favoritesLoading} />
    </div>
  );
}
