# Maintainer tasks

This is the single active list of work to do. Add new tasks here. When a task
is complete, remove it from this file instead of marking it done. Detailed
acceptance criteria and context for the page tasks are in the linked
implementation notes.

## Notes

- **NOTES-17 (P2):** Support opening multiple notes in tabs and viewing two
  notes side by side. Preserve each open note's draft, dirty-navigation guard,
  scroll position, and active inspector context; define clear close and
  responsive behavior before implementation.

  _Example: Someone keeps a project plan open beside a meeting note, compares
  sections while editing, and returns to both notes at the same positions.

- **NOTES-10 (P2):** Bring back the folder-import screen. Test what happens
  when browser access is removed and restored, when workspaces are very large,
  and when files use unusual text encodings. See [Notes implementation tasks](pages-tasks/notes-layout-tasks.md).

  _Example: If browser permission to a notes folder expires, the app explains
  how to reconnect it without losing work; importing a folder with thousands
  of files still remains dependable._

## Links

See [Links implementation tasks](pages-tasks/links-layout-tasks.md) for more
context and current UI behavior.

## Future product ideas

- **Command Palette:** Provide one searchable menu for common app actions.

  _Example: Pressing a shortcut and typing “new note” creates a note without
  navigating through menus._
- **Keyboard shortcuts:** Add quick key combinations for frequent actions.

  _Example: A person can press a shortcut to focus search, create a task, or
  open their saved links._
- **Custom dashboard/widgets:** Let people arrange useful information on their
  home page.

  _Example: Someone places a task list, their favorite bookmarks, and a daily
  note widget on the same dashboard._
- **Advanced tagging/filtering:** Make it easier to organize and find content
  using tags and richer filters.

  _Example: Filtering by `#work` and `#urgent` shows only the matching notes,
  tasks, or links._
- **Themes:** Offer visual styles that people can choose from.

  _Example: A person switches between a light, dark, or high-contrast look._
- **PWA/standalone version:** Make StartSpace usable as an installable app as
  well as a browser extension.

  _Example: Someone opens StartSpace in its own window from their desktop,
  without first opening a browser tab._
- **Additional browser support:** Package and sign StartSpace for more
  browsers, including Firefox.

  _Example: A Firefox user installs the same extension from an approved,
  signed package._
