// Settings integration tests ensure browser-owned search is read-only and refreshes.
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { BrowserSearchSettings } from "./browser-search-settings";

vi.mock("../notifications/notification-context", () => ({
  useNotifications: () => ({ error: vi.fn() }),
}));
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => vi.unstubAllGlobals());

it("shows Chrome's honest default label and a browser settings link without an engine selector", async () => {
  vi.stubGlobal("chrome", { search: { query: vi.fn() } });
  vi.stubGlobal("navigator", { userAgent: "Chrome/140" });
  const container = document.createElement("div");
  const root = createRoot(container);
  await act(async () => root.render(<BrowserSearchSettings />));
  expect(container.textContent).toContain("Browser default");
  expect(container.querySelector("select")).toBeNull();
  expect(container.querySelector("a")?.getAttribute("href")).toBe("chrome://settings/searchEngines");
  await act(async () => root.unmount());
});

it("refreshes the engine reported by Firefox when returning from browser settings", async () => {
  let name = "First";
  vi.stubGlobal("browser", { search: {
    search: vi.fn(),
    get: async () => [{ name, isDefault: true }],
  } });
  const container = document.createElement("div");
  const root = createRoot(container);
  await act(async () => root.render(<BrowserSearchSettings />));
  expect(container.textContent).toContain("First");
  name = "Second";
  await act(async () => window.dispatchEvent(new Event("focus")));
  expect(container.textContent).toContain("Second");
  await act(async () => root.unmount());
});
