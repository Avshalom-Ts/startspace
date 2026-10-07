# ADR 0021: Home dashboard

Status: Accepted (design target)
Date: 2026-10-01
Related: [ADR 0020](0020-shared-ui-search-and-data.md), [ADR 0002](0002-manifest-permissions-storage.md), [ADR 0004](0004-homepage-search-and-engine-selection.md), [ADR 0016](0016-note-preferences.md). Visual: [Home-Page.png](../references/Home-Page.png).

## Context

The Home reference image is visual guidance for a scenic hero and dashboard, not a binding panel inventory. The product decision is the four-panel Home described below. Shared rules and precedence are in ADR 0020.

## Decision

### Composition

Keep the full-width hero and three dashboard columns; do not reduce Home to a search box and favorites. Hero (about 224 px below the 56 px navbar) uses a bundled/local background with cover positioning and a dark gradient; without the final asset use a warm dark gradient, never a remote image or a screenshot crop. Greeting centered at 28 px — morning 05:00–11:59, afternoon 12:00–17:59, evening otherwise, by local time, no account name — then “Your browser. Your workspace. Your data.” at 16 px. The only search on Home is centered in the hero (about 980 × 48 px) with All / Bookmarks / Notes / Tasks / Web scope chips (All default; not engine choices).

Below the hero: three equal columns, 16 px gutters, 20 px outer margins. Recent fills the left column; Favorites fills the middle column; Tasks and Notes split the right column into equal-height rows. On narrower screens, panels stack in Recent, Favorites, Tasks, Notes order. Panel headings have an icon, title and an accessible “View all …” chevron.

| Panel | Content and limits | Heading action |
| --- | --- | --- |
| Favorites | Up to seven bookmark tiles, four columns; tiles ≈125 × 96 px, 40 px icons | Links → Favorites |
| Recent | Five most recently opened notes: title, parent path, relative last-opened time; ≈50 px rows | Notes → Recent |
| Tasks | Five tasks: completion control, title, priority pill and due date if set; 36–40 px rows | Tasks → All Tasks |
| Notes | Up to seven top-level folders with disclosure and descendant note counts; 300 px max height | Notes → All Notes |
| AI / Tools | Later; omitted until implemented | — |

### Data and interactions

- Favorites: favorite flag in bookmark metadata, sorted by name then ID. Add or
  remove favorites from the Links page using a bookmark card's favorite toggle
  or the toggle in its details panel. Home only displays favorites and has no
  add button or picker. Tiles open the current browser URL; removing a favorite
  keeps the bookmark.
- Recent: locally recorded note opens (ADR 0016), not file modified times. Never show notes from a disconnected workspace.
- Tasks: incomplete before complete, dated before undated, earliest due, then updated descending, then ID. Completion moves to Done and records the prior status; failures roll back. Title opens the Tasks inspector.
- Notes: counts include descendant `.md` files; expanding shows subfolders and notes; note opens Notes; folder opens its list.
- AI / Tools (later): bookmarks tagged `tool`, Open navigates to the user URL (localhost allowed). No status probing, no process launching, no dummy cards.

### States

Panels load and fail independently with Retry. No workspace: one Choose workspace banner below search plus concise per-panel unavailable messages; never show unavailable data as empty. Empty states: “Add your first favorite” with favorites managed from Links, “Notes you open will appear here.”, “No tasks yet” + New task, New note / New folder. Failed completion keeps the task and shows an inline error. Broken IDs are excluded, never replaced by URL match.

### Responsive and accessibility

1024–1439 px: two columns ordered Recent, Favorites, Tasks, Notes. <1024 px: one column in the same order. Favorites four across at 768–1023 px and two below 768 px. Hero grows to fit wrapping chips. Semantic headings/lists; tiles are links with separate menu buttons; completion buttons expose checked state; disclosures expose expanded state; chips have selected state; changing scope never submits a web search.

### Scope

MVP: hero, greeting, search with chips, Favorites, Recent, Tasks, and Notes summary. Later: AI/Tools, favorite ordering, custom backgrounds, dashboard rearrangement, widgets. All data is real; never seed sample tasks or URLs.

## Conflicts with existing ADRs (existing ADR wins)

| Design point | Existing ADR | Outcome |
| --- | --- | --- |
| Favorites shown only when workspace metadata is available | ADR 0002 originally stored bookmark metadata in extension storage | Accepted by ADR 0025. Favorites now require a connected workspace. |
| Enter behavior in the hero search | ADR 0020 Enter rule | Follows ADR 0020. |

## Acceptance

Browser rename/delete updates launchers; Add favorite never duplicates a bookmark; Recent changes only on opening notes; task completion persists; folder counts match descendants; web runs only by explicit action; missing workspace shows honest partial availability; all panels work at 360 px and by keyboard.
