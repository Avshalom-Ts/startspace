export const FETCH_ORIGINS = ["https://*/*", "http://*/*"];
export const MAX_DESCRIPTION_BYTES = 1024 * 1024;
export const FETCH_TIMEOUT_MS = 10_000;

export function isFetchableUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase().replace(/\.$/, "");
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password)
      return false;
    if (!host.includes(".") || host.includes(":") ||
      /(?:^|\.)(?:localhost|local|internal|test|invalid)$/.test(host))
      return false;
    if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
      const [a, b, c] = host.split(".").map(Number);
      if (a === undefined || b === undefined || c === undefined) return false;
      if (a === 0 || a === 10 || a === 127 || a >= 224 ||
        (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
        (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) ||
        (a === 192 && b === 0 && (c === 0 || c === 2)) ||
        (a === 192 && b === 88 && c === 99) ||
        (a === 198 && b === 51 && c === 100) ||
        (a === 203 && b === 0 && c === 113) ||
        (a === 198 && (b === 18 || b === 19))) return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function extractDescription(html: string): string | null {
  // Parse only meta tags, never the downloaded document or its resource elements.
  const clean = html.replace(/<!--[\s\S]*?-->|<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, "");
  const tags = clean.match(/<meta\b(?:[^"'<>]|"[^"]*"|'[^']*')*>/gi) ?? [];
  const document = new DOMParser().parseFromString(tags.join(""), "text/html");
  const metadata = [...document.querySelectorAll("meta")];
  for (const key of ["og:description", "description", "twitter:description"]) {
    for (const meta of metadata) {
      if ((meta.getAttribute("property") ?? meta.getAttribute("name"))?.toLowerCase() !== key)
        continue;
      const value = meta.getAttribute("content")?.replace(/\s+/g, " ").trim();
      if (value) return value.slice(0, 2000);
    }
  }
  return null;
}

export async function hasFetchPermission(): Promise<boolean> {
  return globalThis.chrome?.permissions
    ? chrome.permissions.contains({ origins: FETCH_ORIGINS }) : false;
}

export async function requestFetchPermission(): Promise<boolean> {
  if (!globalThis.chrome?.permissions)
    throw new Error("Website access can only be granted in the browser extension.");
  return chrome.permissions.request({ origins: FETCH_ORIGINS });
}

export async function fetchDescription(url: string, signal?: AbortSignal): Promise<string> {
  if (!isFetchableUrl(url)) throw new Error("Description fetching requires a public HTTP(S) URL.");
  const controller = new AbortController();
  const abort = () => controller.abort(signal?.reason);
  if (signal?.aborted) abort();
  signal?.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(() => controller.abort(new Error("Description fetch timed out.")), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal, credentials: "omit", redirect: "error",
      referrerPolicy: "no-referrer", cache: "no-store",
      headers: { Accept: "text/html" },
    });
    if (!response.ok) throw new Error(`Website returned HTTP ${response.status}.`);
    if (!(response.headers.get("content-type") ?? "").toLowerCase().includes("text/html"))
      throw new Error("Website did not return an HTML page.");
    if (!response.body) throw new Error("Website returned an empty response.");
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let length = 0;
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        length += value.byteLength;
        if (length > MAX_DESCRIPTION_BYTES)
          throw new Error("Website response exceeds the 1 MiB limit.");
        chunks.push(value);
      }
    } catch (error) {
      await reader.cancel();
      throw error;
    } finally {
      reader.releaseLock();
    }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    const description = extractDescription(new TextDecoder().decode(bytes));
    if (!description) throw new Error("No description found on this website.");
    return description;
  } catch (error) {
    if (controller.signal.aborted)
      throw controller.signal.reason ?? new Error("Description fetch cancelled.");
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}
