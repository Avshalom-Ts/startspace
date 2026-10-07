// Verifies the settings save confirmation lifetime using synthetic local state.
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { SettingsPage } from "./SettingsPage";

const { save, error } = vi.hoisted(() => ({
  save: vi.fn(),
  error: vi.fn(),
}));

vi.mock("../hooks/useConfig", () => ({
  DEFAULT_PREFERENCES: { showGreeting: true, openLinksInNewTab: false },
  useConfig: () => ({
    config: { version: 1, currentWorkspace: null },
    save,
  }),
}));
vi.mock("../hooks/useWorkspace", () => ({
  useWorkspace: () => ({
    grant: { handle: null, permission: "prompt", id: null, name: "" },
  }),
}));
vi.mock("../hooks/useTheme", () => ({
  useTheme: () => ({ theme: "dark", accent: "amber", mounted: true }),
}));
vi.mock("../notes/use-notes", () => ({ useNotes: () => ({}) }));
vi.mock("../tasks/use-tasks", () => ({ useTasks: () => ({}) }));
vi.mock("../notifications/notification-context", () => ({
  useNotifications: () => ({ error }),
}));
vi.mock("../search/browser-search", () => ({
  getBrowserSearchInfo: async () => ({ available: false }),
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let container: HTMLDivElement;

beforeEach(() => {
  vi.useFakeTimers();
  save.mockReset().mockResolvedValue(undefined);
  error.mockReset();
  localStorage.clear();
  container = document.createElement("div");
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  vi.useRealTimers();
  localStorage.clear();
});

async function click(selector: string) {
  const button = container.querySelector<HTMLButtonElement>(selector);
  expect(button).not.toBeNull();
  await act(async () => button!.click());
}

async function advance(milliseconds: number) {
  await act(async () => vi.advanceTimersByTime(milliseconds));
}

it("hides the confirmation exactly 3 seconds after a preference is saved", async () => {
  await act(async () => root.render(<SettingsPage />));
  await click('[aria-label="Show greeting on Home page"]');
  expect(save).toHaveBeenCalledOnce();
  expect(container.querySelector('[role="status"]')?.textContent).toBe("Saved");
  await advance(2999);
  expect(container.querySelector('[role="status"]')).not.toBeNull();
  await advance(1);
  expect(container.querySelector('[role="status"]')).toBeNull();
});

it("restarts the timer when the same confirmation is shown for another layout save", async () => {
  localStorage.setItem("startspace.settings.category", "links");
  await act(async () => root.render(<SettingsPage />));
  await click('[role="radiogroup"] button:last-child');
  await advance(2000);
  await click('[role="radiogroup"] button:first-child');
  await advance(1000);
  expect(container.querySelector('[role="status"]')?.textContent).toBe("Saved");
  await advance(1999);
  expect(container.querySelector('[role="status"]')).not.toBeNull();
  await advance(1);
  expect(container.querySelector('[role="status"]')).toBeNull();
});

it("does not show a success confirmation when saving fails", async () => {
  save.mockRejectedValueOnce(new Error("Synthetic save failure"));
  await act(async () => root.render(<SettingsPage />));
  await click('[aria-label="Show greeting on Home page"]');
  expect(container.querySelector('[role="status"]')).toBeNull();
  expect(error).toHaveBeenCalledWith("Setting could not be saved. Try again.");
});

it("clears the pending timer when the settings page unmounts", async () => {
  const setTimeoutSpy = vi.spyOn(window, "setTimeout");
  const clearTimeoutSpy = vi.spyOn(window, "clearTimeout");
  try {
    await act(async () => root.render(<SettingsPage />));
    await click('[aria-label="Show greeting on Home page"]');
    const timerIndex = setTimeoutSpy.mock.calls.findIndex(([, delay]) => delay === 3000);
    expect(timerIndex).toBeGreaterThanOrEqual(0);
    const timerId = setTimeoutSpy.mock.results[timerIndex]!.value;
    expect(clearTimeoutSpy).not.toHaveBeenCalledWith(timerId);
    await act(async () => root.unmount());
    expect(clearTimeoutSpy).toHaveBeenCalledWith(timerId);
  } finally {
    setTimeoutSpy.mockRestore();
    clearTimeoutSpy.mockRestore();
  }
});
