import { useEffect, useState } from "react";
import { hasFetchPermission } from "./description-fetch";
import { useNotifications } from "../notifications/notification-context";

export function useWebsitePermission() {
  const [granted, setGranted] = useState<boolean | null>(null);
  const [error, setError] = useState(false);
  const notifications = useNotifications();
  const available = !!globalThis.chrome?.permissions;

  useEffect(() => {
    let active = true;
    const update = () => void hasFetchPermission().then((value) => {
      if (active) {
        setGranted(value);
        setError(false);
      }
    }).catch((cause: unknown) => {
      if (!active) return;
      setGranted(null);
      setError(true);
      notifications.error(
        cause instanceof Error ? cause.message : "Could not check website access.",
      );
    });
    update();
    globalThis.chrome?.permissions?.onAdded?.addListener(update);
    globalThis.chrome?.permissions?.onRemoved?.addListener(update);
    window.addEventListener("focus", update);
    window.addEventListener("startspace:website-permission-changed", update);
    return () => {
      active = false;
      globalThis.chrome?.permissions?.onAdded?.removeListener(update);
      globalThis.chrome?.permissions?.onRemoved?.removeListener(update);
      window.removeEventListener("focus", update);
      window.removeEventListener("startspace:website-permission-changed", update);
    };
  }, [notifications]);

  return { granted, available, error };
}
