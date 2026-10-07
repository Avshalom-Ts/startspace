import type { BookmarkNode } from "../hooks/useBookmarks";
import { emptyBookmarkMetadata } from "./bookmark-metadata-model";
import { readBookmarkMetadata, updateBookmarkMetadata, signalBookmarkMetadata } from "./bookmark-workspace";
import { fetchDescription, hasFetchPermission, isFetchableUrl } from "./description-fetch";
import { isDescriptionEditing } from "./description-editing";

export function bookmarkLeaves(nodes: BookmarkNode[]): BookmarkNode[] {
  return nodes.flatMap((node) => node.url ? [node] : bookmarkLeaves(node.children ?? []));
}

interface EnrichmentOptions {
  workspace: FileSystemDirectoryHandle;
  workspaceId: string;
  manual: boolean;
  bookmarkId?: string;
  signal: AbortSignal;
  isCurrent: () => boolean;
  getTree: () => Promise<BookmarkNode[]>;
  getBookmark: (id: string) => Promise<BookmarkNode | null>;
}

export async function enrichDescription(options: EnrichmentOptions): Promise<boolean> {
  const { workspace, workspaceId, manual, signal } = options;
  if (!navigator.locks)
    throw new Error("This browser cannot coordinate description fetching across tabs.");
  return navigator.locks.request(
    `startspace:description-fetch:${workspaceId}`,
    { ifAvailable: !manual && !options.bookmarkId },
    async (lock) => {
      if (!lock) return false;
      if (signal.aborted || !options.isCurrent()) return false;
      if (!(await hasFetchPermission())) {
        if (manual) throw new Error("Grant website access in Settings > Links to fetch descriptions.");
        return false;
      }
      const before = await readBookmarkMetadata(workspace);
      const node = options.bookmarkId
        ? await options.getBookmark(options.bookmarkId)
        : bookmarkLeaves(await options.getTree()).find((bookmark) =>
          isFetchableUrl(bookmark.url ?? "") && !before.bookmarks[bookmark.id]?.description?.trim(),
        );
      if (!node?.url) return false;
      if (!isFetchableUrl(node.url)) {
        if (manual) throw new Error("Description fetching requires a public HTTP(S) URL.");
        return false;
      }
      const baseline = before.bookmarks[node.id]?.description ?? "";
      if (!manual && baseline.trim()) return false;
      if (isDescriptionEditing(node.id)) return false;
      let failure: Error | null = null;
      let description: string;
      try {
        description = await fetchDescription(node.url, signal);
      } catch (error) {
        if (signal.aborted) return false;
        failure = error instanceof Error ? error : new Error("Description fetch failed.");
        description = `Description fetch failed: ${failure.message}`;
      }
      if (signal.aborted || !options.isCurrent() || !(await hasFetchPermission())) return false;
      const latest = await options.getBookmark(node.id);
      if (!latest || latest.url !== node.url) return false;
      await updateBookmarkMetadata(workspace, workspaceId, (document) => {
        if (signal.aborted || !options.isCurrent())
          throw new Error("Description was not saved because the workspace or setting changed.");
        const entry = document.bookmarks[node.id] ?? emptyBookmarkMetadata();
        if ((entry.description ?? "") !== baseline || isDescriptionEditing(node.id))
          throw new Error("Description changed while fetching. The fetched result was not applied.");
        return {
          ...document,
          bookmarks: { ...document.bookmarks, [node.id]: { ...entry, description, updatedAt: new Date().toISOString() } },
        };
      });
      signalBookmarkMetadata(workspaceId);
      if (failure) throw failure;
      return true;
    },
  );
}
