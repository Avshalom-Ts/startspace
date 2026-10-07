import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { WebsiteAccess } from "./website-access";

const notices = vi.hoisted(() => ({ error: vi.fn(), info: vi.fn() }));
vi.mock("../../notifications/notification-context", () => ({ useNotifications: () => notices }));
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root;
let container: HTMLDivElement;
let granted = false;
const request = vi.fn();
const remove = vi.fn();
beforeEach(() => {
  granted = false;
  request.mockReset().mockImplementation(async () => { granted = true; return true; });
  remove.mockReset().mockImplementation(async () => { granted = false; return true; });
  notices.info.mockReset();
  notices.error.mockReset();
  vi.stubGlobal("chrome", { permissions: {
    contains: async () => granted, request, remove,
  } });
  container = document.createElement("div");
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  vi.unstubAllGlobals();
});

it("grants optional HTTP(S) access only on an explicit click and supports revocation", async () => {
  await act(async () => root.render(<WebsiteAccess />));
  expect(request).not.toHaveBeenCalled();
  await act(async () => container.querySelector("button")!.click());
  expect(request).toHaveBeenCalledWith({ origins: ["https://*/*", "http://*/*"] });
  expect(container.textContent).toContain("Website access granted");
  await act(async () => container.querySelector("button")!.click());
  expect(remove).toHaveBeenCalledWith({ origins: ["https://*/*", "http://*/*"] });
  expect(container.textContent).toContain("fetching is paused");
});

it("explains denial without displaying granted access", async () => {
  request.mockResolvedValue(false);
  await act(async () => root.render(<WebsiteAccess />));
  await act(async () => container.querySelector("button")!.click());
  expect(notices.info).toHaveBeenCalledWith(expect.stringContaining("not granted"));
  expect(container.textContent).toContain("fetching is paused");
});
