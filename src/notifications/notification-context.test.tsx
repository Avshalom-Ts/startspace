// notification-context.test.tsx
//
// Covers the in-memory notification queue, accessibility roles, deduplication,
// automatic dismissal, and persistent errors without browser API dependencies.

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  NotificationProvider,
  useNotifications,
} from "./notification-context";

function NotificationHarness() {
  const notifications = useNotifications();
  return (
    <div>
      <button onClick={() => notifications.success("Saved.")}>Success</button>
      <button onClick={() => notifications.error("Could not save.")}>Error</button>
    </div>
  );
}

describe("NotificationProvider", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.useFakeTimers();
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    act(() => {
      root.render(
        <NotificationProvider>
          <NotificationHarness />
        </NotificationProvider>,
      );
    });
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.useRealTimers();
  });

  it("announces, deduplicates, and automatically dismisses success messages", () => {
    const button = container.querySelector("button");
    act(() => {
      button?.click();
      button?.click();
    });

    expect(container.querySelectorAll('[role="status"]')).toHaveLength(1);
    expect(container.textContent).toContain("Saved.");

    act(() => vi.advanceTimersByTime(4000));
    expect(container.textContent).not.toContain("Saved.");
  });

  it("keeps errors until the user dismisses them", () => {
    const buttons = container.querySelectorAll("button");
    act(() => buttons[1]?.click());
    act(() => vi.advanceTimersByTime(30000));

    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      "Could not save.",
    );

    const dismiss = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Dismiss error notification"]',
    );
    act(() => dismiss?.click());
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });
});
