import { useBookmarks } from "./useBookmarks";
import { useBookmarkMetadata } from "./useBookmarkTree";
export type { BookmarkMetadata, BookmarkNode } from "./useBookmarks";

export function useFavorites() {
  const { bookmarks, loading: bookmarksLoading } = useBookmarks();
  const data = useBookmarkMetadata();
  const favorites = bookmarks
    .filter((bookmark) => data.metadata[bookmark.id]?.favorites)
    .map((bookmark) => ({ id: bookmark.id, title: bookmark.title, url: bookmark.url! }));
  return { ...data, favorites, bookmarksLoading };
}
