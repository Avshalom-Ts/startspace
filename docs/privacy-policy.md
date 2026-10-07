# StartSpace Privacy Policy

**Last updated:** 2026-10-07

StartSpace is a local-first browser extension. It has no StartSpace-operated
backend, account system, analytics service, advertising service, or cloud
database.

## Data StartSpace handles

StartSpace handles the following data only to provide its user-facing features:

- browser bookmarks, including titles, URLs, folder structure, and browser
  bookmark identifiers;
- Markdown notes, task data, folders, and backups in a workspace folder the
  user explicitly selects;
- local settings and bookmark-linked metadata, such as favorites and links
  between bookmarks, notes, and tasks;
- search text entered into StartSpace.

## Storage and sharing

Bookmarks remain in the browser's bookmark store. Saved notes and tasks remain
in the user-selected local workspace. While a note has unsaved edits, StartSpace
also keeps a device-local recovery copy of its draft and previous disk content
in extension IndexedDB, associated with that workspace. The recovery copy is
removed after a successful save or explicit discard; it is not part of exported
backups. Bookmark metadata and the task board are workspace files under
`.startspace`; device settings stay in local browser storage.
StartSpace does not transmit workspace files or metadata to its developer or to a
StartSpace server.

With optional HTTP(S) website permission and a connected workspace, StartSpace
fetches published descriptions directly from bookmarked websites. Those sites
receive the requested bookmark URL (including its query parameters) and your
network address. Requests omit credentials/cookies and referrer information.
No third-party metadata service is used; fetched pages are not executed.

Automatic fetching after creating a bookmark and one missing description per
New Tab are enabled by default, but do not run without website access. Both can
be disabled separately in Settings > Links. Manual Fetch description replaces
the editable description directly. Completed failed attempts leave editable
failure text; existing nonempty descriptions are never replaced automatically.

When the user chooses a web search result, StartSpace passes the submitted search text to the browser Search API, which uses the browser’s default provider. That
provider receives the query and handles it under its own privacy policy.

StartSpace does not sell user data, use it for advertising, or permit humans to
read it through a StartSpace service. Information received from Google APIs is
used in accordance with the Chrome Web Store User Data Policy, including its
Limited Use requirements.

## Permissions

- The `bookmarks` permission provides the bookmark management and search
  features requested by the user.
- The `storage` permission saves device-local settings and workspace references.
- Optional host access to HTTP(S) websites enables description fetching.
  Setup offers an explicit permission request; access can also be granted or
  revoked in Settings > Links. Declining or revoking access pauses fetching.
  Chrome may warn that this grants access to data on websites.
- The `favicon` permission lets Chrome's Favicon API provide browser-managed
  icons for HTTP(S) bookmarks. Chrome may show the warning “Read the icons of
  the websites you visit.” StartSpace uses the browser's extension favicon
  endpoint, does not request images directly from bookmark sites or a remote
  favicon service, and does not store favicon data.
- File System Access is requested through the browser's folder picker and is
  limited to folders the user chooses.

## User control and retention

Users can edit or delete bookmarks through StartSpace or the browser, edit or
delete workspace files directly, export or restore a local backup, choose a
different workspace, and uninstall the extension. Uninstalling removes
extension-managed local storage according to browser behavior; workspace files
remain under the user's control.
Workspace bookmark metadata remains in `.startspace` after uninstalling. Users
can edit or remove it using their filesystem tools. Browser Bookmark IDs are
profile-specific; copying metadata does not automatically match another profile.
On returning to an unsaved draft, users can recover or discard its device-local
copy. Deleting a workspace file directly does not discard an unsaved recovery copy.

## Changes

This policy will be updated when StartSpace's data practices change. Material
changes will be reflected in the extension and Chrome Web Store disclosures.

## Contact

Questions and privacy requests can be submitted through the StartSpace GitHub
repository's issue tracker or the support contact shown on its Chrome Web Store
listing.

- The `search` permission sends only user-submitted web searches through the browser’s default search provider. StartSpace does not set or store the browser’s provider.
