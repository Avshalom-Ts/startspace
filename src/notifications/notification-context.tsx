// notification-context.tsx
//
// Owns app-wide transient UI feedback. Notifications are held in memory only
// and rendered by NotificationViewport; no user data leaves the extension.

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { NotificationViewport } from "./notification-viewport";

export type NotificationKind = "success" | "error" | "info" | "warning";

export interface NotificationAction {
  label: string;
  onClick: () => void;
}

export interface Notification {
  id: number;
  kind: NotificationKind;
  message: string;
  duration: number | null;
  action?: NotificationAction;
}

interface NotificationOptions {
  duration?: number | null;
  action?: NotificationAction;
}

interface NotificationApi {
  notify: (
    kind: NotificationKind,
    message: string,
    options?: NotificationOptions,
  ) => void;
  success: (message: string, options?: NotificationOptions) => void;
  error: (message: string, options?: NotificationOptions) => void;
  info: (message: string, options?: NotificationOptions) => void;
  warning: (message: string, options?: NotificationOptions) => void;
  dismiss: (id: number) => void;
}

const NotificationContext = createContext<NotificationApi | null>(null);
let nextNotificationId = 1;

/** Provides a bounded, deduplicated notification queue to the extension UI. */
export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const dismiss = useCallback((id: number) => {
    setNotifications((current) => current.filter((item) => item.id !== id));
  }, []);

  const notify = useCallback(
    (
      kind: NotificationKind,
      message: string,
      options: NotificationOptions = {},
    ) => {
      const trimmed = message.trim();
      if (!trimmed) return;
      const notification: Notification = {
        id: nextNotificationId++,
        kind,
        message: trimmed,
        duration:
          options.duration === undefined
            ? kind === "error"
              ? null
              : kind === "warning"
                ? 6000
                : 4000
            : options.duration,
        action: options.action,
      };
      setNotifications((current) => [
        ...current.filter(
          (item) => item.kind !== kind || item.message !== trimmed,
        ),
        notification,
      ].slice(-4));
    },
    [],
  );

  const api = useMemo<NotificationApi>(
    () => ({
      notify,
      success: (message, options) => notify("success", message, options),
      error: (message, options) => notify("error", message, options),
      info: (message, options) => notify("info", message, options),
      warning: (message, options) => notify("warning", message, options),
      dismiss,
    }),
    [dismiss, notify],
  );

  return (
    <NotificationContext.Provider value={api}>
      {children}
      <NotificationViewport
        notifications={notifications}
        onDismiss={dismiss}
      />
    </NotificationContext.Provider>
  );
}

/** Returns the app notification API and requires a NotificationProvider. */
export function useNotifications(): NotificationApi {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used inside NotificationProvider.");
  }
  return context;
}
