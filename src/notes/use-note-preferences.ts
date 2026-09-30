// React bridge for workspace-stored Notes favorites, tags and recent opens.
// Broadcasts only a refresh signal; note data remains on the user's filesystem.
import { useCallback, useEffect, useRef, useState } from "react";
import {
  readNoteMetadata,
  updateNoteMetadata,
  type NoteMetadataDocument,
  type NotePreferences,
} from "./note-metadata";

/** Reads validated metadata and coordinates local and cross-tab refreshes. */
export function useNotePreferences(
  workspace: FileSystemDirectoryHandle | null,
  workspaceId: string | null,
  permission: string,
  demo: boolean,
) {
  const [document, setDocument] = useState<NoteMetadataDocument | null>(null);
  const [error, setError] = useState<string | null>(null);
  const channel = useRef<BroadcastChannel | null>(null);
  const requestId = useRef(0);
  const currentWorkspace = useRef(workspace);
  currentWorkspace.current = workspace;
  const currentId = useRef(workspaceId);
  currentId.current = workspaceId;
  const refresh = useCallback(async () => {
    const request = ++requestId.current;
    if (demo || !workspace || permission !== "granted") {
      setDocument(null);
      return;
    }
    try {
      const next = await readNoteMetadata(workspace);
      if (request !== requestId.current) return;
      setDocument(next);
      setError(null);
    } catch (cause) {
      if (request !== requestId.current) return;
      setDocument(null);
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not read note metadata.",
      );
    }
  }, [workspace, permission, demo]);

  useEffect(() => {
    void refresh();
    window.addEventListener("focus", refresh);
    if (!demo && workspaceId && typeof BroadcastChannel !== "undefined") {
      channel.current = new BroadcastChannel(
        `startspace:note-metadata:${workspaceId}`,
      );
      channel.current.onmessage = () => void refresh();
    }
    return () => {
      requestId.current++;
      window.removeEventListener("focus", refresh);
      channel.current?.close();
      channel.current = null;
    };
  }, [refresh, workspaceId, demo]);

  const update = useCallback(
    async (
      noteId: string,
      change: (current: NotePreferences) => NotePreferences,
    ) => {
      if (
        !workspace ||
        !workspaceId ||
        permission !== "granted" ||
        demo ||
        error
      )
        return false;
      const request = ++requestId.current;
      try {
        const next = await updateNoteMetadata(
          workspace,
          workspaceId,
          noteId,
          change,
        );
        if (
          currentWorkspace.current === workspace &&
          currentId.current === workspaceId
        ) {
          if (request === requestId.current) setDocument(next);
          else void refresh();
          channel.current?.postMessage("updated");
          setError(null);
        }
        return true;
      } catch (cause) {
        if (
          currentWorkspace.current === workspace &&
          currentId.current === workspaceId
        ) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Could not update note metadata.",
          );
          void refresh();
        }
        return false;
      }
    },
    [workspace, workspaceId, permission, demo, error, refresh],
  );

  return { document, error, refresh, update };
}
