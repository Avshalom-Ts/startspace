# Maintainer tasks

This is the single active list of work to do. Add new tasks here. When a task
is complete, remove it from this file instead of marking it done. Detailed
acceptance criteria and context for the page tasks are in the linked
implementation notes.

## Release

- Complete the manual Chrome Web Store account and listing setup, privacy
  disclosures, screenshots, and first submission. The automated delivery
  workflow and first-publish runbook are already in place.

## Notes

- **NOTES-06 (P2):** Add a bookmark relationship picker using current browser
  IDs, and deliberately migrate extension-local relation metadata to the
  workspace. See [Notes implementation tasks](pages-tasks/notes-layout-tasks.md).
- **NOTES-07 (P2):** Add explicit consent for remote images and support relative
  note links with URL encoding and anchors. Simple relative `.md` links and
  local image previews already work. See [Notes implementation tasks](pages-tasks/notes-layout-tasks.md).
- **NOTES-08 (P2):** Add full keyboard tree navigation, resizable panes, modal
  inspector drawers, and remembered scroll. See [Notes implementation tasks](pages-tasks/notes-layout-tasks.md).
- **NOTES-09 (P2):** Add a global New dropdown for bookmarks, notes, and tasks;
  complete combobox ARIA for shared search. See [Notes implementation tasks](pages-tasks/notes-layout-tasks.md).
- **NOTES-10 (P2):** Restore directory import UI and test browser permission
  revocation/recovery, very large workspaces, and disk-encoding edge cases.
  See [Notes implementation tasks](pages-tasks/notes-layout-tasks.md).
- **NOTES-11 (P3):** Add real Trash with restore semantics, templates,
  backlinks, split preview, and autosave settings. See [Notes implementation tasks](pages-tasks/notes-layout-tasks.md).
- **NOTES-16 (P2):** Add a persistent, accessible top-center interactive
  message for user decisions, with explicit actions and dismiss; deduplicate
  updates while preserving transient notifications for ordinary feedback.
  See [Notes implementation tasks](pages-tasks/notes-layout-tasks.md).

## Links

- **LINKS-02 (P1):** Allow linking/unlinking existing tasks from the inspector
  by updating `tasks.json` with conflict checks.
- **LINKS-03 (P2):** Add browser-provided favicons using the `favicon`
  permission and `_favicon` API; update ADR 0002 and retain the local fallback.
- **LINKS-05 (P3):** Add folder-tree typeahead and focus restoration after
  dialogs close. Arrow-key navigation and drawer focus handling are already
  implemented.
- **LINKS-06 (P2):** Show each card's folder path in folder views for
  descendant links.
- **LINKS-10 (P3):** Consider a center More menu, bulk actions, drag ordering,
  custom folder colors, and cross-profile metadata remapping.
- **LINKS-11 (P3):** Add Trash with real recovery semantics.
- **LINKS-12 (P3):** Add Playwright coverage for the acceptance list in ADR
  0019, including native CRUD in both directions, select vs. open, copy,
  responsive inspector, and keyboard flow. Replace or remove the synthetic
  preview data once the fixtures cover the same states.

See [Links implementation tasks](pages-tasks/links-layout-tasks.md) for more
context and current UI behavior.

## Future product ideas

- Command Palette.
- Keyboard shortcuts.
- Custom dashboard/widgets.
- Advanced tagging/filtering.
- Themes.
- PWA/standalone version.
- Additional browser support, including Firefox packaging and signing.
