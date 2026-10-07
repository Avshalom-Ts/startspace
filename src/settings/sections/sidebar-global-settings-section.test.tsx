import { act, createRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import SidebarGlobalSettingsSection from "./sidebar-global-settings-section";

const notifications = vi.hoisted(() => ({ error: vi.fn() }));
vi.mock("../../notifications/notification-context", () => ({
  useNotifications: () => notifications,
}));
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root;
let container: HTMLDivElement;
let granted = false;
let ready = true;
const contains = vi.fn();
const listeners = new Set<() => void>();

beforeEach(() => {
  granted = false;
  ready = true;
  listeners.clear();
  notifications.error.mockReset();
  contains.mockReset().mockImplementation(async () => granted);
  const event = {
    addListener: (listener: () => void) => listeners.add(listener),
    removeListener: (listener: () => void) => listeners.delete(listener),
  };
  vi.stubGlobal("chrome", { permissions: { contains, onAdded: event, onRemoved: event } });
  container = document.createElement("div");
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  vi.unstubAllGlobals();
});

async function render() {
  await act(async () => root.render(<SidebarGlobalSettingsSection
    workspace={{ grant: { handle: null, name: "" } }}
    config={{ currentWorkspace: null }} workspaceReady={ready}
    chooseWorkspace={vi.fn()} disconnectWorkspace={vi.fn()}
    exportBackup={vi.fn()} restoreInputRef={createRef<HTMLInputElement>()}
    importBackup={vi.fn()} backupBusy={false} bookmarkApiAvailable
    searchInfo={{ available: true }} fileSystemStatus="Available"
  />));
}
function capabilityStatus() {
  const label = [...container.querySelectorAll("span")].find(
    (element) => element.textContent === "Fetch bookmarks description",
  );
  expect(label).toBeDefined();
  return label!.parentElement!.lastElementChild!.textContent;
}

it("shows a permission-aware row in Browser Integration, not controls in Workspace", async () => {
  await render();
  expect(capabilityStatus()).toBe("Permission required");
  expect(container.textContent).not.toContain("Allow HTTP(S) website access");
  const label = [...container.querySelectorAll("span")].find(
    (element) => element.textContent === "Fetch bookmarks description",
  )!;
  expect(label.closest("section")?.textContent).toContain("Browser Integration");
  granted = true;
  await act(async () => listeners.forEach((listener) => listener()));
  expect(capabilityStatus()).toBe("Available");
  granted = false;
  await act(async () => listeners.forEach((listener) => listener()));
  expect(capabilityStatus()).toBe("Permission required");
});

it("requires a connected workspace even with website permission", async () => {
  granted = true;
  ready = false;
  await render();
  expect(capabilityStatus()).toBe("Permission required");
  ready = true;
  await render();
  expect(capabilityStatus()).toBe("Available");
});

it("shows unavailable outside the extension and explicitly reports permission-check failures", async () => {
  vi.stubGlobal("chrome", undefined);
  await render();
  expect(capabilityStatus()).toBe("Unavailable");
});

it("reports permission-check failures without displaying Available", async () => {
  contains.mockRejectedValue(new Error("Synthetic permission failure"));
  await render();
  expect(capabilityStatus()).toBe("Check failed");
  expect(notifications.error).toHaveBeenCalledWith("Synthetic permission failure");
});
