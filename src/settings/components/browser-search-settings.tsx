// Read-only browser search settings. Refreshes engine metadata when returning to the page.
import { useEffect, useState } from "react";
import {
  getBrowserSearchInfo,
  openSearchSettings,
  searchSettingsUrl,
} from "../../search/browser-search";
import { useNotifications } from "../../notifications/notification-context";

/** Displays browser-owned search configuration and an action to change it in browser settings. */
export function BrowserSearchSettings() {
  const [info, setInfo] = useState<Awaited<
    ReturnType<typeof getBrowserSearchInfo>
  > | null>(null);
  const notifications = useNotifications();
  const settingsUrl = searchSettingsUrl();
  useEffect(() => {
    let active = true;
    const refresh = () =>
      void getBrowserSearchInfo().then((next) => {
        if (active) setInfo(next);
      });
    refresh();
    window.addEventListener("focus", refresh);
    return () => {
      active = false;
      window.removeEventListener("focus", refresh);
    };
  }, []);
  return (
    <section className="mt-8 w-full max-w-xl border-t border-border pt-6">
      <h3 className="mb-1 text-base font-medium text-fg">Web search</h3>
      <p className="mb-3 text-sm text-muted">
        Web searches use your browser’s selected search engine. Change it in
        your browser settings.
      </p>
      <p className="mb-3 text-sm text-fg" role="status">
        Search engine:{" "}
        {info
          ? info.available
            ? (info.name ?? "Browser default, ")
            : "Unavailable in this preview or browser"
          : "Loading…"}
        {settingsUrl && (
          <a
            href={settingsUrl}
            onClick={(event) => {
              event.preventDefault();
              void openSearchSettings().catch(() =>
                notifications.error(
                  `Open your browser’s search settings manually, or paste ${settingsUrl} into the address bar.`,
                ),
              );
            }}
            className="text-sm text-accent underline focus-visible:outline-2 ml-1"
          >
            Open browser search settings to change it
          </a>
        )}
      </p>
      <p className="mt-3 text-sm text-muted">
        {settingsUrl
          ? `If the link is blocked, paste ${settingsUrl} into the address bar.`
          : "Open your browser’s Settings and find Search engine."}
      </p>
    </section>
  );
}
