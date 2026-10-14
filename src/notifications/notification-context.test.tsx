// notification-context.test.tsx
//
// Covers the in-memory notification queue, accessibility roles, deduplication,
// automatic dismissal, and persistent decisions without browser API dependencies.

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  NotificationProvider,
  useNotifications,
} from "./notification-context";

const onDecisionAction = vi.fn();

function NotificationHarness() {
  const notifications = useNotifications();
  return (
    <div>
      <button onClick={() => notifications.success("Saved.")}>Success</button>
      <button onClick={() => notifications.error("Could not save.")}>Error</button>
      <button
        onClick={() =>
          notifications.decide({
            id: "disk-conflict",
            title: "Disk conflict",
            message: "Choose a version.",
            actions: [
              { label: "Keep mine", onClick: onDecisionAction },
              { label: "Use disk version", onClick: () => {} },
            ],
          })
        }
      >
        Decision
      </button>
    </div>
  );
}

describe("NotificationProvider", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.useFakeTimers();
    onDecisionAction.mockReset();
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

  it("automatically dismisses ordinary errors", () => {
    const buttons = container.querySelectorAll("button");
    act(() => buttons[1]?.click());
    act(() => vi.advanceTimersByTime(5999));

    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      "Could not save.",
    );

    act(() => vi.advanceTimersByTime(1));
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });

  it("keeps a decision visible until an action or dismissal and deduplicates its id", () => {
    const decision = container.querySelectorAll("button")[2];
    act(() => {
      decision?.click();
      decision?.click();
    });
    expect(container.querySelectorAll('[role="alertdialog"]')).toHaveLength(1);
    expect(container.textContent).toContain("Disk conflict");
    act(() =>
      container
        .querySelector<HTMLButtonElement>('button[aria-label="Dismiss decision message"]')
        ?.click(),
    );
    expect(container.querySelector('[role="alertdialog"]')).toBeNull();

    act(() => decision?.click());
    act(() =>
      Array.from(container.querySelectorAll("button")).find(
        (button) => button.textContent === "Keep mine",
      )?.click(),
    );
    expect(onDecisionAction).toHaveBeenCalledOnce();
    expect(container.querySelector('[role="alertdialog"]')).toBeNull();
  });
});
