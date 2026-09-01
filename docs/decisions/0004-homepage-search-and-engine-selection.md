# ADR 0004: Homepage Search Interaction and Predefined Web Engines

**Status:** Accepted

**Date:** 2026-09-01

**Related:** ADR 0001 (Local-First, No-Backend Browser Extension), ADR 0002 (Extension Manifest, Permissions, and Storage Model), ADR 0003 (Local Markdown Notes Workspace and Recursive Explorer)

## Context

StartSpace has one homepage search entry point for browser bookmarks, workspace notes, workspace tasks, and an external web-search fallback. The result UI must be fast to scan without displacing the homepage layout, and it must let keyboard users choose a local result quickly.

The web fallback is user-triggered but leaves the extension page. Allowing arbitrary user-entered URL templates would make the configured destination difficult to reason about and could turn extension configuration into an open redirect surface. The product needs a small, understandable set of supported engines instead.

## Decision

### Search order and data sources

- The homepage searches in this display order: Bookmarks, Notes, Tasks, then Web.
- Bookmark data comes from the browser Bookmark API.
- Notes are searched by title and Markdown content from the current workspace scan.
- Tasks are searched from the current workspace task document.
- Local result groups are shown independently; the Web fallback is always offered for a non-empty query.
- Notes and Tasks data changes notify the central search data bridge to refresh its workspace cache.

### Dropdown interaction

- The homepage search input remains centered in the available main area.
- Non-empty queries open a bounded, scrollable dropdown directly beneath the input; results do not push other homepage content down.
- Arrow Down and Arrow Up cycle through every result, including the Web fallback, with wraparound.
- The active result is visibly highlighted and is scrolled into view inside the dropdown.
- Enter opens the active result. When no result is active, Enter opens the configured Web fallback.
- Selecting a note navigates to the Notes route with its relative Markdown path and opens that note. Selecting a task navigates to the Tasks route with its task ID and opens its task-details view.

### Web-engine catalog

- Users choose the web fallback from a predefined catalog in Settings.
- The initial catalog contains Google, Bing, DuckDuckGo, and Brave Search.
- A configured engine is stored in `chrome.storage.local` as the catalog engine name and its fixed URL template.
- The settings UI does not accept arbitrary engine names or URL templates.
- Existing or legacy configuration values that do not exactly match a catalog engine are normalized to the default engine, Google, when configuration loads.
- Web search happens only after a user enters a query and submits it or selects the Web result. StartSpace does not transmit local bookmark, note, or task content to any search engine.

## Consequences

### Positive

- The homepage keeps a stable centered layout while supporting large result sets.
- Keyboard navigation supports a complete search workflow without leaving the input.
- Search results route directly to the relevant local note or task rather than only to the enclosing page.
- The engine catalog provides transparent, predictable external destinations and removes arbitrary URL-template configuration from the user interface.
- Search data remains local until the user explicitly triggers the Web fallback.

### Trade-offs and constraints

- Adding another engine requires a source-code and release change to the predefined catalog.
- The external search request is subject to the selected engine's privacy policy once the user triggers it.
- Workspace data is refreshed following StartSpace-originated mutations; external changes are detected through existing workspace refresh behavior rather than filesystem events.

## Rejected alternatives

- **Arbitrary web-search URL templates:** rejected because they permit unreviewed redirect destinations and make the external destination less understandable.
- **A separate search-results page:** rejected because it breaks the homepage workflow and causes avoidable navigation.
- **Only mouse-selectable results:** rejected because the central search input requires keyboard-first navigation.
- **Opening generic Notes or Tasks pages for local results:** rejected because it adds a second navigation step and does not preserve the user’s search intent.

## Recording

This ADR records the homepage search behavior, exact-result routing, and predefined web-engine policy. Changes to result order, keyboard behavior, the engine catalog, or the external-search privacy boundary should update this ADR or create a superseding decision.
