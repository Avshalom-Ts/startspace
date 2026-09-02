// notification-viewport.tsx
//
// Renders the accessible top-right notification stack. Timed messages pause
// while hovered or keyboard-focused; errors remain until dismissed by default.

import { useEffect, useState } from "react";
import type { Notification, NotificationKind } from "./notification-context";

const KIND_STYLES: Record<NotificationKind, string> = {
  success: "border-emerald-500/50",
  error: "border-red-500/60",
  info: "border-accent/50",
  warning: "border-amber-500/60",
};

const KIND_LABELS: Record<NotificationKind, string> = {
  success: "Success",
  error: "Error",
  info: "Information",
  warning: "Warning",
};

interface NotificationViewportProps {
  notifications: Notification[];
  onDismiss: (id: number) => void;
}

/** Positions the notification stack without blocking interaction beneath it. */
export function NotificationViewport({
  notifications,
  onDismiss,
}: NotificationViewportProps) {
  return (
    <div
      className="pointer-events-none fixed right-4 top-4 z-[60] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2"
      aria-label="Notifications"
    >
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onDismiss={onDismiss}
        />
      ))}
    </div>
  );
}

/** Renders and, when appropriate, automatically dismisses one notification. */
function NotificationItem({
  notification,
  onDismiss,
}: {
  notification: Notification;
  onDismiss: (id: number) => void;
}) {
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (notification.duration === null || paused) return undefined;
    const timer = window.setTimeout(
      () => onDismiss(notification.id),
      notification.duration,
    );
    return () => window.clearTimeout(timer);
  }, [notification, onDismiss, paused]);

  return (
    <div
      className={`pointer-events-auto rounded-lg border bg-page p-3 text-fg shadow-lg motion-safe:animate-[notification-in_160ms_ease-out] ${KIND_STYLES[notification.kind]}`}
      role={notification.kind === "error" ? "alert" : "status"}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false);
      }}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            {KIND_LABELS[notification.kind]}
          </p>
          <p className="mt-0.5 text-sm leading-5">{notification.message}</p>
          {notification.action && (
            <button
              type="button"
              className="mt-2 text-sm font-medium text-accent hover:underline focus-visible:outline-2 focus-visible:outline-accent"
              onClick={() => {
                notification.action?.onClick();
                onDismiss(notification.id);
              }}
            >
              {notification.action.label}
            </button>
          )}
        </div>
        <button
          type="button"
          className="rounded px-1 text-lg leading-5 text-muted hover:bg-surface hover:text-fg focus-visible:outline-2 focus-visible:outline-fg"
          aria-label={`Dismiss ${notification.kind} notification`}
          onClick={() => onDismiss(notification.id)}
        >
          ×
        </button>
      </div>
    </div>
  );
}
