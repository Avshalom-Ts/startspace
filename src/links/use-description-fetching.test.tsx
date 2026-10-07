import { act, StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useDescriptionFetching } from "./use-description-fetching";

const state = vi.hoisted(() => ({
  grant: { handle: {} as FileSystemDirectoryHandle | null, id: "fixture" as string | null, permission: "granted" },
  preferences: { fetchDescriptionOnSave: true, fetchDescriptionOnNewTab: true },
  enrich: vi.fn(), permission: vi.fn(),
  notifications: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}));
vi.mock("../hooks/useWorkspace", () => ({ useWorkspace: () => ({ grant: state.grant }) }));
vi.mock("../hooks/useConfig", () => ({
  DEFAULT_PREFERENCES: { fetchDescriptionOnSave: true, fetchDescriptionOnNewTab: true },
  useConfig: () => ({ config: { preferences: state.preferences }, loading: false }),
}));
vi.mock("../notifications/notification-context", () => ({ useNotifications: () => state.notifications }));
vi.mock("./description-enrichment", () => ({ enrichDescription: state.enrich }));
vi.mock("./description-fetch", () => ({ hasFetchPermission: state.permission }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root;
let api: ReturnType<typeof useDescriptionFetching>;
function Probe({ ready = true, home = true }) {
  api = useDescriptionFetching(ready, home);
  return null;
}
async function render(ready = true, home = true) {
  await act(async () => {
    root.render(<StrictMode><Probe ready={ready} home={home} /></StrictMode>);
    await vi.advanceTimersByTimeAsync(1);
  });
  await act(async () => vi.advanceTimersByTimeAsync(1));
}
beforeEach(() => {
  vi.useFakeTimers();
  state.grant = { handle: {} as FileSystemDirectoryHandle, id: "fixture", permission: "granted" };
  state.preferences = { fetchDescriptionOnSave: true, fetchDescriptionOnNewTab: true };
  state.enrich.mockReset().mockResolvedValue(true);
  state.permission.mockReset().mockResolvedValue(true);
  Object.values(state.notifications).forEach((notify) => notify.mockReset());
  root = createRoot(document.createElement("div"));
});
afterEach(async () => {
  await act(async () => root.unmount());
  vi.useRealTimers();
});

it("runs one startup pass under StrictMode, not on rerender or route changes", async () => {
  await render();
  expect(state.enrich).toHaveBeenCalledOnce();
  await render();
  await render(true, false);
  await render();
  expect(state.enrich).toHaveBeenCalledOnce();
});

it("waits for workspace metadata readiness and respects disabled automation", async () => {
  await render(false);
  expect(state.enrich).not.toHaveBeenCalled();
  state.preferences.fetchDescriptionOnNewTab = false;
  await render();
  expect(state.enrich).not.toHaveBeenCalled();
  state.preferences.fetchDescriptionOnSave = false;
  await render();
  api.afterCreate("a");
  expect(state.enrich).not.toHaveBeenCalled();
});

it("does not start a queue without permission or a connected workspace", async () => {
  state.permission.mockResolvedValue(false);
  await render();
  expect(state.enrich).not.toHaveBeenCalled();
  state.grant = { handle: null, id: null, permission: "denied" };
  await render(false);
  await act(async () => api.fetch("a"));
  expect(state.notifications.error).toHaveBeenCalledWith("Connect a workspace to fetch bookmark descriptions.");
});

it("fetches after creation independently and reports failure without throwing to the creator", async () => {
  await render(true, false);
  state.enrich.mockRejectedValueOnce(new Error("Synthetic website failure"));
  await act(async () => api.afterCreate("new"));
  expect(state.enrich).toHaveBeenCalledWith(expect.objectContaining({ bookmarkId: "new", manual: false }));
  expect(state.notifications.error).toHaveBeenCalledWith("Synthetic website failure");
});

it("manual fetching ignores automation switches and reports direct completion", async () => {
  state.preferences = { fetchDescriptionOnSave: false, fetchDescriptionOnNewTab: false };
  await render();
  await act(async () => api.fetch("a"));
  expect(state.enrich).toHaveBeenCalledWith(expect.objectContaining({ bookmarkId: "a", manual: true }));
  expect(state.notifications.success).toHaveBeenCalledWith("Description fetched.");
  expect(api.fetchingId).toBeNull();
});
