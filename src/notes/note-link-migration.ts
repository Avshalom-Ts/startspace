// Converts legacy path-based task and bookmark edges to workspace note IDs.
// Keeps the bookmark store browser-owned and the task document in the workspace.
import type { BookmarkMetadata } from "../hooks/useFavorites";
import { readTasks, writeTasks } from "../tasks/task-workspace";
import type { TasksDocument } from "../tasks/tasks-model";
import { migrateNoteReferences, type NoteIdentities } from "./note-identity";

type BookmarkStorage = Pick<chrome.storage.StorageArea, "get" | "set">;
const bookmarkKey = "startspace.bookmarkMetadata";

/** Creates new documents without changing existing values in place. */
export function convertNoteEdges(
  identities: NoteIdentities,
  tasks: TasksDocument,
  bookmarks: Record<string, BookmarkMetadata>,
) {
  const nextTasks = {
    ...tasks,
    tasks: tasks.tasks.map((task) => ({
      ...task,
      noteIds: migrateNoteReferences(identities, task.noteIds),
    })),
  };
  const nextBookmarks = Object.fromEntries(
    Object.entries(bookmarks).map(([id, entry]) => {
      if (
        !Array.isArray(entry.relatedNotes) ||
        !entry.relatedNotes.every((reference) => typeof reference === "string")
      )
        throw new Error(
          "Invalid bookmark note relationships. Metadata was not migrated.",
        );
      return [
        id,
        {
          ...entry,
          relatedNotes: migrateNoteReferences(identities, entry.relatedNotes),
        },
      ];
    }),
  ) as Record<string, BookmarkMetadata>;
  return { nextTasks, nextBookmarks };
}

/** Migrates both stores after the identity file is durable; rolls tasks back if browser storage fails. */
export async function migrateNoteEdges(
  workspace: FileSystemDirectoryHandle,
  identities: NoteIdentities,
  storage: BookmarkStorage | undefined = globalThis.chrome?.storage?.local,
): Promise<void> {
  const tasks = await readTasks(workspace);
  const raw = storage
    ? (await storage.get([bookmarkKey]))[bookmarkKey]
    : undefined;
  if (
    raw !== undefined &&
    (!raw || typeof raw !== "object" || Array.isArray(raw))
  )
    throw new Error(
      "Invalid bookmark metadata. Relationships were not migrated.",
    );
  const bookmarks = (raw ?? {}) as Record<string, BookmarkMetadata>;
  const { nextTasks, nextBookmarks } = convertNoteEdges(
    identities,
    tasks,
    bookmarks,
  );
  const tasksChanged =
    JSON.stringify(nextTasks.tasks) !== JSON.stringify(tasks.tasks);
  const bookmarksChanged =
    JSON.stringify(nextBookmarks) !== JSON.stringify(bookmarks);
  if (tasksChanged) await writeTasks(workspace, nextTasks);
  try {
    if (storage && bookmarksChanged)
      await storage.set({ [bookmarkKey]: nextBookmarks });
  } catch (error) {
    if (tasksChanged) {
      try {
        await writeTasks(workspace, tasks);
      } catch {
        throw new Error(
          "Bookmark migration failed and task rollback failed. Check both stores before retrying.",
        );
      }
    }
    throw error;
  }
}
