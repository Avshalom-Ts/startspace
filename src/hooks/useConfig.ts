import { useState, useEffect, useCallback } from "react";

// ---------------------------------------------------------------------------
// Types — match the JSON shape decided in .plan/001-define-data-formats.md,
// section 6.
// ---------------------------------------------------------------------------

export interface WebSearchEngine {
  name: string;
  urlTemplate: string;
}

/** The allowlisted web search engines available in StartSpace Settings. */
export const WEB_SEARCH_ENGINES: readonly WebSearchEngine[] = [
  { name: "Google", urlTemplate: "https://www.google.com/search?q={query}" },
  { name: "Bing", urlTemplate: "https://www.bing.com/search?q={query}" },
  { name: "DuckDuckGo", urlTemplate: "https://duckduckgo.com/?q={query}" },
  {
    name: "Brave Search",
    urlTemplate: "https://search.brave.com/search?q={query}",
  },
];

/** The engine used for first-run config and invalid legacy config values. */
export const DEFAULT_WEB_SEARCH_ENGINE = WEB_SEARCH_ENGINES[0]!;

export interface WorkspaceRef {
  /** StartSpace-generated stable identity for the granted workspace handle.
   *  Not the filesystem path — paths can change; the id is stable across sessions
   *  for the same granted handle. */
  id: string;
  /** User-visible workspace name shown in Settings / setup UI. */
  name: string;
}

export interface Config {
  version: number;
  webSearchEngine: WebSearchEngine;
  currentWorkspace: WorkspaceRef | null;
}

// ---------------------------------------------------------------------------
// Storage helpers — extension storage via chrome.storage.local.
// ---------------------------------------------------------------------------

const CONFIG_KEY = "startspace.config";

function readConfig(): Promise<Config | null> {
  return new Promise((resolve) => {
    const chromeExt = (
      globalThis as {
        chrome?: {
          storage?: {
            local: {
              get: (
                keys: string[],
                callback: (result: Record<string, unknown>) => void,
              ) => void;
            };
          };
        };
      }
    ).chrome;
    if (!chromeExt?.storage?.local) {
      resolve(null);
      return;
    }
    chromeExt.storage.local.get(
      [CONFIG_KEY],
      (result: Record<string, unknown>) => {
        const raw = result[CONFIG_KEY];
        if (raw && typeof raw === "object") {
          resolve(raw as Config);
        } else {
          resolve(null);
        }
      },
    );
  });
}

function writeConfig(config: Config): Promise<void> {
  return new Promise((resolve) => {
    const chromeExt = (
      globalThis as {
        chrome?: {
          storage?: {
            local: {
              set: (
                items: Record<string, unknown>,
                callback?: () => void,
              ) => void;
            };
          };
        };
      }
    ).chrome;
    if (!chromeExt?.storage?.local) {
      resolve();
      return;
    }
    chromeExt.storage.local.set({ [CONFIG_KEY]: config }, () => {
      resolve();
    });
  });
}

/** Notifies other in-page config consumers after the extension config changes. */
function notifyConfigChanged(): void {
  window.dispatchEvent(new Event("startspace:config-changed"));
}

/** Returns a configured engine only when it belongs to the supported catalog. */
function knownSearchEngine(
  engine: WebSearchEngine | undefined,
): WebSearchEngine {
  return (
    WEB_SEARCH_ENGINES.find(
      (candidate) =>
        candidate.name === engine?.name &&
        candidate.urlTemplate === engine.urlTemplate,
    ) ?? DEFAULT_WEB_SEARCH_ENGINE
  );
}

// ---------------------------------------------------------------------------
// useConfig
// ---------------------------------------------------------------------------

/**
 * Reads the extension config from chrome.storage.local and exposes it.
 * Config includes: webSearchEngine, currentWorkspace (or null on first launch),
 * and a schema version.
 *
 * On first launch, currentWorkspace is null and the setup UI should prompt the
 * user to choose a workspace folder via the File System Access API.
 */
export function useConfig() {
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = () => {
      setLoading(true);
      readConfig().then((cfg) => {
        // If no config exists yet, seed a default so the rest of the app can
        // read a sensible config shape even before the user has chosen a workspace.
        const defaultCfg: Config = {
          version: 1,
          webSearchEngine: knownSearchEngine(cfg?.webSearchEngine),
          currentWorkspace: cfg?.currentWorkspace ?? null,
        };
        setConfig(defaultCfg);
        setLoading(false);
      });
    };
    load();
    window.addEventListener("startspace:config-changed", load);
    return () => window.removeEventListener("startspace:config-changed", load);
  }, []);

  const save = useCallback(async (next: Config) => {
    await writeConfig(next);
    setConfig(next);
    notifyConfigChanged();
  }, []);

  return { config, loading, save };
}
