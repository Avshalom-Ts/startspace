// use-search-data.ts
//
// React bridge that gathers every data source the central search bar needs:
// the browser bookmark tree (Bookmark API), workspace notes and tasks
// (File System Access API). The orchestration itself is pure and lives in search.ts; rendering
// lives in SearchResults.tsx.
//
// Workspace data is loaded once per granted handle and cached for the session;
// the caller can trigger `reload` (e.g. after edits on other pages).

import { useCallback, useEffect, useMemo, useState } from "react";
import { useBookmarkTree } from "../hooks/useBookmarkTree";
import { useWorkspace } from "../hooks/useWorkspace";
import { scanWorkspace } from "../notes/notes-workspace";
import { readTasks } from "../tasks/task-workspace";
import type { BookmarkNode } from "../hooks/useBookmarks";
import type { NoteEntry } from "../types/notes";
import type { Task } from "../tasks/tasks-model";

/** Everything the search orchestrator needs, plus a loading state. */
export interface SearchData {
  bookmarkTree: BookmarkNode[];
  notes: NoteEntry[];
  tasks: Task[];
  /** True while any source is still loading. */
  loading: boolean;
  /** Re-reads workspace sources (notes, tasks); the bookmark tree reloads via its own hook. */
  reload: () => void;
}

/**
 * Gathers search data from the bookmark tree, the workspace (notes and
 * tasks).
 *
 * Notes and tasks are empty until a workspace folder is granted and readable;
 * bookmarks are empty when the Bookmark API is unavailable (e.g. dev preview).
 *
 * @returns The current search data snapshot and a reload function.
 */
export function useSearchData(): SearchData {
  const { tree, loading: treeLoading } = useBookmarkTree();
  const { grant } = useWorkspace();

  const [notes, setNotes] = useState<NoteEntry[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);

  const loadWorkspace = useCallback(async () => {
    if (!grant.handle || grant.permission !== "granted") {
      setNotes([]);
      setTasks([]);
      return;
    }
    setWorkspaceLoading(true);
    try {
      const [index, document] = await Promise.all([
        scanWorkspace(grant.handle),
        readTasks(grant.handle),
      ]);
      setNotes(index.notes);
      setTasks(document.tasks);
    } catch (cause) {
      console.warn(
        "[StartSpace] search: failed to read workspace data:",
        cause,
      );
      setNotes([]);
      setTasks([]);
    } finally {
      setWorkspaceLoading(false);
    }
  }, [grant.handle, grant.permission]);

  useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace]);

  useEffect(() => {
    const refreshAfterLocalChange = () => void loadWorkspace();
    window.addEventListener(
      "startspace:workspace-changed",
      refreshAfterLocalChange,
    );
    return () =>
      window.removeEventListener(
        "startspace:workspace-changed",
        refreshAfterLocalChange,
      );
  }, [loadWorkspace]);

  return useMemo(
    () => ({
      bookmarkTree: tree,
      notes,
      tasks,
      loading: treeLoading || workspaceLoading,
      reload: () => void loadWorkspace(),
    }),
    [
      tree,
      notes,
      tasks,
      treeLoading,
      workspaceLoading,
      loadWorkspace,
    ],
  );
}
