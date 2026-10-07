import { useState } from "react";
import { FETCH_ORIGINS, requestFetchPermission } from "../../links/description-fetch";
import { useWebsitePermission } from "../../links/use-website-permission";
import { useNotifications } from "../../notifications/notification-context";

export function WebsiteAccess() {
  const { granted, available, error } = useWebsitePermission();
  const [busy, setBusy] = useState(false);
  const notifications = useNotifications();

  const change = async () => {
    setBusy(true);
    try {
      if (granted) {
        if (!(await chrome.permissions.remove({ origins: FETCH_ORIGINS })))
          throw new Error("Website access could not be removed.");
      } else if (!(await requestFetchPermission())) {
        notifications.info("Website access was not granted. Description fetching remains paused.");
      }
      window.dispatchEvent(new Event("startspace:website-permission-changed"));
    } catch (error) {
      notifications.error(error instanceof Error ? error.message : "Website access could not be changed.");
    } finally { setBusy(false); }
  };
  return (
    <div className="space-y-2">
      <p className="text-sm text-muted">
        Description fetching contacts bookmarked websites directly. They receive
        the requested URL and your network address. No cookies or StartSpace
        server are used. Automatic fetching is on by default; disable it in
        Settings &gt; Links. Website access is optional.
      </p>
      <p className="text-sm">{!available ? "Website access is unavailable outside the extension"
        : error ? "Could not check website access"
        : granted === null ? "Checking website access..."
        : granted ? "Website access granted" : "Website access not granted; fetching is paused"}</p>
      <button type="button" className="notes-button" disabled={busy || !available || granted === null} onClick={() => void change()}>
        {busy ? "Updating access..." : granted ? "Revoke website access" : "Allow HTTP(S) website access"}
      </button>
    </div>
  );
}
