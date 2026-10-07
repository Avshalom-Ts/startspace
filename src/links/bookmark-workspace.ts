import { parseBookmarkDocument, type BookmarkMetadataDocument } from "./bookmark-metadata-model";

const fileName = "bookmark-metadata.json";
const pending = new WeakMap<FileSystemDirectoryHandle, Promise<BookmarkMetadataDocument>>();

async function snapshot(workspace: FileSystemDirectoryHandle): Promise<{
  raw: string | null; document: BookmarkMetadataDocument;
}> {
  try {
    const folder = await workspace.getDirectoryHandle(".startspace");
    const raw = await (await (await folder.getFileHandle(fileName)).getFile()).text();
    return { raw, document: parseBookmarkDocument(JSON.parse(raw) as unknown) };
  } catch (error) {
    if (error instanceof DOMException && error.name === "NotFoundError")
      return { raw: null, document: { version: 1, bookmarks: {} } satisfies BookmarkMetadataDocument };
    throw error;
  }
}

export async function readBookmarkMetadata(workspace: FileSystemDirectoryHandle) {
  await pending.get(workspace)?.catch(() => undefined);
  return (await snapshot(workspace)).document;
}

export function updateBookmarkMetadata(
  workspace: FileSystemDirectoryHandle,
  workspaceId: string,
  change: (document: BookmarkMetadataDocument) => BookmarkMetadataDocument,
): Promise<BookmarkMetadataDocument> {
  const previous = pending.get(workspace) ?? Promise.resolve();
  const write = async () => {
    const before = await snapshot(workspace);
    const next = parseBookmarkDocument(change(before.document));
    if (JSON.stringify(next) === JSON.stringify(before.document)) return next;
    if ((await snapshot(workspace)).raw !== before.raw)
      throw new Error("Bookmark metadata changed outside StartSpace. Refresh and retry.");
    const folder = await workspace.getDirectoryHandle(".startspace", { create: true });
    let created = false;
    try {
      await folder.getFileHandle(fileName);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "NotFoundError")) throw error;
      created = true;
    }
    const handle = await folder.getFileHandle(fileName, { create: true });
    try {
      const writable = await handle.createWritable();
      try {
        await writable.write(`${JSON.stringify(next, null, 2)}\n`);
        if ((await (await handle.getFile()).text()) !== (before.raw ?? ""))
          throw new Error("Bookmark metadata changed outside StartSpace. Refresh and retry.");
        await writable.close();
      } catch (error) {
        await writable.abort();
        throw error;
      }
    } catch (error) {
      if (created) {
        try {
          if ((await (await handle.getFile()).text()) === "")
            await folder.removeEntry(fileName);
        } catch {
          console.error("[StartSpace] Could not remove the incomplete bookmark metadata file.");
        }
      }
      throw error;
    }
    return next;
  };
  const next = previous.catch(() => undefined).then(() =>
    navigator.locks
      ? navigator.locks.request(`startspace:bookmark-metadata:${workspaceId}`, write)
      : write(),
  );
  pending.set(workspace, next);
  return next;
}

export function signalBookmarkMetadata(workspaceId: string) {
  window.dispatchEvent(new Event("startspace:bookmark-metadata-changed"));
  if (typeof BroadcastChannel !== "undefined") {
    const channel = new BroadcastChannel(`startspace:bookmark-metadata:${workspaceId}`);
    channel.postMessage("updated");
    channel.close();
  }
}
