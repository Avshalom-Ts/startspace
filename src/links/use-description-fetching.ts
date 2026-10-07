import { useCallback, useEffect, useRef, useState } from "react";
import { useConfig, DEFAULT_PREFERENCES } from "../hooks/useConfig";
import { useWorkspace } from "../hooks/useWorkspace";
import { useNotifications } from "../notifications/notification-context";
import { enrichDescription } from "./description-enrichment";
import { hasFetchPermission } from "./description-fetch";

export function useDescriptionFetching(metadataReady: boolean, home: boolean) {
  const { grant } = useWorkspace();
  const { config, loading } = useConfig();
  const notifications = useNotifications();
  const preferences = { ...DEFAULT_PREFERENCES, ...config?.preferences };
  const current = useRef({ grant, preferences });
  current.current = { grant, preferences };
  const [fetchingId, setFetchingId] = useState<string | null>(null);
  const attempted = useRef(false);
  const mounted = useRef(true);
  const controller = useRef(new AbortController());

  useEffect(() => {
    controller.current = new AbortController();
    mounted.current = true;
    return () => {
      mounted.current = false;
      controller.current.abort();
    };
  }, [grant.id, grant.handle, grant.permission]);

  const run = useCallback(async (bookmarkId?: string, manual = false) => {
    if (!grant.handle || !grant.id || grant.permission !== "granted")
      throw new Error("Connect a workspace to fetch bookmark descriptions.");
    const workspace = grant.handle;
    const workspaceId = grant.id;
    const signal = controller.current.signal;
    const result = await enrichDescription({
      workspace, workspaceId, bookmarkId, manual, signal,
      isCurrent: () => {
        const state = current.current;
        return state.grant.id === workspaceId && state.grant.handle === workspace &&
          state.grant.permission === "granted" &&
          (manual || (bookmarkId ? state.preferences.fetchDescriptionOnSave : state.preferences.fetchDescriptionOnNewTab));
      },
      getTree: () => chrome.bookmarks.getTree(),
      getBookmark: async (id) => {
        try { return (await chrome.bookmarks.get(id))[0] ?? null; }
        catch (error) {
          if (error instanceof Error && /can't find|not found|no bookmark/i.test(error.message)) return null;
          throw error;
        }
      },
    });
    return result;
  }, [grant.handle, grant.id, grant.permission]);

  const report = useCallback((error: unknown) => {
    notifications.error(error instanceof Error ? error.message : "Description could not be fetched.");
  }, [notifications]);

  useEffect(() => {
    if (!home || loading || !metadataReady || attempted.current ||
      !preferences.fetchDescriptionOnNewTab || grant.permission !== "granted") return;
    const timer = setTimeout(() => {
      void hasFetchPermission().then((granted) => {
        if (!granted || !mounted.current || attempted.current || controller.current.signal.aborted) return;
        attempted.current = true;
        return run().catch(report);
      }).catch(report);
    }, 0);
    return () => clearTimeout(timer);
  }, [home, loading, metadataReady, preferences.fetchDescriptionOnNewTab, grant.permission, run, report]);

  return {
    fetchingId,
    afterCreate: (id: string) => {
      if (current.current.preferences.fetchDescriptionOnSave && metadataReady)
        void run(id).catch(report);
    },
    fetch: async (id: string) => {
      setFetchingId(id);
      try {
        if (await run(id, true)) notifications.success("Description fetched.");
        else notifications.info("Description was not changed. The bookmark or workspace may have changed.");
      } catch (error) { report(error); }
      finally { if (mounted.current) setFetchingId(null); }
    },
  };
}
