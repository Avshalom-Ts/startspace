# ADR 0026: Direct website description fetching

Status: Accepted
Date: 2026-10-07
Related: [ADR 0019](0019-links-layout.md),
[ADR 0025](0025-workspace-owned-startspace-data.md),
[Privacy policy](../privacy-policy.md).

## Context

Descriptions were manual-only. The owner wants manual editing, immediate manual
fetching, enrichment after creating a bookmark, and one attempt per New Tab.
Failed sites must not be attempted again on each launch.

## Decision

- Keep descriptions editable. Manual **Fetch description** replaces the current
  description directly, without preview, append, or confirmation. Disable the
  action during an unsaved description edit.
- After a successful StartSpace bookmark creation, fetch if the description is
  empty and the on-save preference is enabled. Fetch failures do not undo or
  repeat creation.
- Each Home/New Tab document may attempt one eligible bookmark in browser-tree
  order when the on-New-Tab preference is enabled. Do not process a batch or
  repeat on focus, navigation, rerenders, or React effect replay.
- Both preferences default to enabled and can be disabled separately in
  Settings > Links. A connected workspace and website permission are required.
- Automatic work never replaces a nonempty description, regardless of its source.
  Whitespace-only text is empty.
- Completed unsuccessful attempts, including missing published descriptions,
  store `Description fetch failed: ...` in the field and show an error.
  Nonempty failure text blocks subsequent automatic attempts. Users can edit,
  clear, or manually retry it. There is no separate retry cursor/status store.
- Missing/revoked permission, workspace changes, cancelled requests, changed URLs
  and deleted bookmarks do not write failure text. Preserve edits made while a
  request is running instead of applying a stale result.
- Use a workspace-scoped browser lock across triggers. A startup pass exits if
  another attempt already owns the lock; manual and on-save requests may wait.
  No fetch worker continues after its page closes.

## Network and permissions

Declare optional host permissions for `http://*/*` and `https://*/*`. Explain and
request them through a user-initiated setup action, with grant/revoke controls in
Settings. Permission denial pauses fetching while keeping the rest of the app
usable. Requests execute in the extension page, not an arbitrary-URL content
script bridge.

Fetch the bookmark URL directly with credentials omitted and no referrer.
No proxy, account, backend, AI summary or authenticated scraping is used.
Reject redirects in this version to avoid fetching unchecked destinations.
Exclude non-HTTP(S), credential-bearing URLs, localhost/local hostnames, literal
private/reserved IPv4 addresses and IPv6 literals. Hostname checks do not provide
DNS-level private-network isolation.

Limit each request to 10 seconds and its streamed response to 1 MiB; require a
successful HTML response. Parse only extracted meta tags in an inert document,
not resource elements from the full page. Render/save plain text, never execute
scripts or attach remote HTML to the application.

Prefer nonempty `og:description`, then `meta[name=description]`, then
`twitter:description`. Normalize whitespace and limit fetched text to 2,000
characters. Do not change browser titles, URLs, tags, icons or relationships.

## Consequences

This supersedes ADR 0019's "no fetched site summary" rule. StartSpace remains
local-first, but description fetching is a network feature: contacted websites
receive the requested URL and network address, including on automatic attempts.
JavaScript-only, login-required, redirect-only or metadata-free sites may fail.
Failures remain editable description text and therefore participate in filters.
