// Regression coverage for default-provider delegation and unavailable browser APIs.
import { afterEach, expect, it, vi } from "vitest";
import { getBrowserSearchInfo, searchWeb, searchSettingsUrl, openSearchSettings } from "./browser-search";

afterEach(() => vi.unstubAllGlobals());

it("delegates literal query text to Chrome without choosing a provider", async () => {
  const query = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal("chrome", { search: { query } });
  await searchWeb("  cats & dogs?  ");
  expect(query).toHaveBeenCalledWith({ text: "cats & dogs?", disposition: "CURRENT_TAB" });
  expect(await getBrowserSearchInfo()).toEqual({ available: true, name: null });
});

it("uses Firefox default search and reads the selected engine", async () => {
  const search = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal("browser", { search: { search, get: async () => [
    { name: "Other", isDefault: false }, { name: "Selected", isDefault: true },
  ] } });
  await searchWeb("hello");
  expect(search).toHaveBeenCalledWith({ query: "hello", disposition: "CURRENT_TAB" });
  expect((await getBrowserSearchInfo()).name).toBe("Selected");
});

it("does not search empty text and rejects unavailable search without a provider fallback", async () => {
  vi.stubGlobal("browser", undefined);
  vi.stubGlobal("chrome", undefined);
  await expect(searchWeb("  ")).resolves.toBeUndefined();
  await expect(searchWeb("hello")).rejects.toThrow();
  expect((await getBrowserSearchInfo()).available).toBe(false);
});

it("propagates search failures while tolerating unavailable engine metadata", async () => {
  vi.stubGlobal("browser", { search: {
    search: vi.fn().mockRejectedValue(new Error("denied")),
    get: vi.fn().mockRejectedValue(new Error("denied")),
  } });
  await expect(searchWeb("hello")).rejects.toThrow();
  expect(await getBrowserSearchInfo()).toEqual({ available: true, name: null });
});

it("selects browser-specific settings destinations", () => {
  expect(searchSettingsUrl("Firefox/140")).toBe("about:preferences#search");
  expect(searchSettingsUrl("Chrome/140 Edg/140")).toBe("edge://settings/search");
  expect(searchSettingsUrl("Chrome/140")).toBe("chrome://settings/searchEngines");
  expect(searchSettingsUrl("Safari/600")).toBeNull();
});

it("opens settings through the extension tab API and propagates restrictions", async () => {
  const create = vi.fn().mockRejectedValue(new Error("restricted"));
  vi.stubGlobal("navigator", { userAgent: "Firefox/140" });
  vi.stubGlobal("browser", { search: { search: vi.fn() }, tabs: { create } });
  await expect(openSearchSettings()).rejects.toThrow();
  expect(create).toHaveBeenCalledWith({ url: "about:preferences#search" });
});
