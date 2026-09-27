// Browser search adapter. Requires the search permission; never constructs provider URLs.
// Firefox exposes engine metadata; Chromium only exposes default-provider queries.

interface BrowserApi {
  search?: {
    query?: (details: { text: string; disposition: "CURRENT_TAB" }) => Promise<void>;
    search?: (details: { query: string; disposition: "CURRENT_TAB" }) => Promise<void>;
    get?: () => Promise<{ name: string; isDefault: boolean }[]>;
  };
  tabs?: { create: (details: { url: string }) => Promise<unknown> };
}

/** Finds a supported search API by capability, preferring the browser namespace. */
function browserApi(): BrowserApi | undefined {
  const globals = globalThis as { browser?: BrowserApi; chrome?: BrowserApi };
  return [globals.browser, globals.chrome].find(
    (api) => api?.search?.query || api?.search?.search,
  );
}

/** Submits a nonempty query with the default provider in this tab; rejects on API failure. */
export async function searchWeb(query: string): Promise<void> {
  const text = query.trim();
  if (!text) return;
  const search = browserApi()?.search;
  if (search?.query) await search.query({ text, disposition: "CURRENT_TAB" });
  else if (search?.search) await search.search({ query: text, disposition: "CURRENT_TAB" });
  else throw new Error("Browser search is unavailable.");
}

/** Reads the default engine name when exposed, without guessing it or caching a provider. */
export async function getBrowserSearchInfo(): Promise<{ available: boolean; name: string | null }> {
  const search = browserApi()?.search;
  let name: string | null = null;
  try {
    name = (await search?.get?.())?.find((engine) => engine.isDefault)?.name ?? null;
  } catch {
    // Metadata failure must not prevent searches using the browser's default.
  }
  return { available: !!search, name };
}

/** Returns a browser settings destination; unknown browsers receive manual guidance. */
export function searchSettingsUrl(userAgent = navigator.userAgent): string | null {
  if (/Firefox\//.test(userAgent)) return "about:preferences#search";
  if (/Edg\//.test(userAgent)) return "edge://settings/search";
  if (/OPR\//.test(userAgent)) return "opera://settings/searchEngines";
  if (/Chrome\//.test(userAgent)) return "chrome://settings/searchEngines";
  return null;
}

/** Opens only the detected browser settings page through tabs.create; may reject restricted URLs. */
export async function openSearchSettings(): Promise<void> {
  const url = searchSettingsUrl();
  const tabs = browserApi()?.tabs;
  if (!url || !tabs) throw new Error("Open browser search settings manually.");
  await tabs.create({ url });
}
