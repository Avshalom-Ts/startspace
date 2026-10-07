import { afterEach, expect, it, vi } from "vitest";
import {
  extractDescription, fetchDescription, isFetchableUrl,
  FETCH_TIMEOUT_MS, MAX_DESCRIPTION_BYTES,
} from "./description-fetch";

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

it("prefers nonempty Open Graph, then standard, then Twitter descriptions", () => {
  expect(extractDescription(`
    <meta name="description" content="Standard">
    <meta property="og:description" content="  Open &amp;   Graph ">
    <img src="https://example.com/never-request">
  `)).toBe("Open & Graph");
  expect(extractDescription('<meta property="og:description" content=" "><meta name="description" content="Standard">')).toBe("Standard");
  expect(extractDescription("<meta name='twitter:description' content='Twitter'>")).toBe("Twitter");
  expect(extractDescription('<script>"<meta name=\'description\' content=\'wrong\'>"</script><!-- <meta name="description" content="wrong"> -->')).toBeNull();
  expect(extractDescription(`<meta name="description" content="${"x".repeat(2100)}">`)).toHaveLength(2000);
});

it.each([
  "file:///private.md", "ftp://example.com/a", "http://localhost/a",
  "http://127.1/a", "http://10.0.0.1", "http://192.168.1.1",
  "http://172.16.0.1", "http://169.254.169.254", "http://100.64.0.1",
  "http://[::1]", "https://user:password@example.com", "http://machine.local",
])("excludes unsafe or local URL %s", (url) => expect(isFetchableUrl(url)).toBe(false));

it("allows public HTTP(S) pages", () => {
  expect(isFetchableUrl("https://example.com/page")).toBe(true);
  expect(isFetchableUrl("http://example.org/page")).toBe(true);
});

it("fetches directly without credentials/referrer or redirects", async () => {
  const network = vi.fn().mockResolvedValue(new Response('<meta name="description" content="Fetched">', {
    headers: { "content-type": "text/html; charset=utf-8" },
  }));
  vi.stubGlobal("fetch", network);
  expect(await fetchDescription("https://example.com")).toBe("Fetched");
  expect(network).toHaveBeenCalledWith("https://example.com", expect.objectContaining({
    credentials: "omit", redirect: "error", referrerPolicy: "no-referrer",
  }));
});

it.each([
  [new Response("failed", { status: 503, headers: { "content-type": "text/html" } }), "HTTP 503"],
  [new Response("{}", { headers: { "content-type": "application/json" } }), "HTML"],
  [new Response("<html></html>", { headers: { "content-type": "text/html" } }), "No description"],
  [new Response("x".repeat(MAX_DESCRIPTION_BYTES + 1), { headers: { "content-type": "text/html" } }), "1 MiB"],
])("rejects failed, non-HTML, empty-metadata and oversized responses", async (response, message) => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
  await expect(fetchDescription("https://example.com")).rejects.toThrow(message);
});

it("aborts a timed-out request and cancels an externally aborted request", async () => {
  vi.useFakeTimers();
  vi.stubGlobal("fetch", vi.fn((_url: string, options: RequestInit) => new Promise((_resolve, reject) => {
    options.signal?.addEventListener("abort", () => reject(options.signal?.reason));
  })));
  const timeout = expect(fetchDescription("https://example.com")).rejects.toThrow("timed out");
  await vi.advanceTimersByTimeAsync(FETCH_TIMEOUT_MS);
  await timeout;
  const controller = new AbortController();
  const aborted = expect(fetchDescription("https://example.com", controller.signal)).rejects.toThrow("cancelled");
  controller.abort(new Error("cancelled"));
  await aborted;
});

it("accepts the exact response-byte limit", async () => {
  const meta = '<meta name="description" content="At limit">';
  const html = meta + " ".repeat(MAX_DESCRIPTION_BYTES - meta.length);
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(html, {
    headers: { "content-type": "text/html" },
  })));
  expect(await fetchDescription("https://example.com")).toBe("At limit");
});
