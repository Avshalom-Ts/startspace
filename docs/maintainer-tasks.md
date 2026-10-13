# Maintainer tasks

This is the single active list of work to do. Add new tasks here. When a task
is complete, remove it from this file instead of marking it done. Detailed
acceptance criteria and context for the page tasks are in the linked
implementation notes.

## Notes

- **NOTES-06 (P2):** Let people choose which bookmarks belong to a note. Use
  the browser's current bookmark IDs, and move the saved note-to-bookmark links
  from extension-only storage into the user's workspace. See [Notes implementation tasks](pages-tasks/notes-layout-tasks.md).

  _Example: While reading a “Trip planning” note, someone can attach their
  saved airline and hotel bookmarks, then see and manage those links from the
  note._

- **NOTES-07 (P2):** Add a setting on the Notes page where people can choose
  whether notes may load images from the internet. Do not show this choice
  inside individual notes. Also make links between notes work when their paths
  contain special characters or point to a heading in a note. Simple `.md`
  links and local image previews already work. See [Notes implementation tasks](pages-tasks/notes-layout-tasks.md).

  _Example: In Notes settings, someone turns on “Load remote images.” Notes can
  then show images hosted online without displaying an in-note prompt; a link
  such as `Projects/Next steps.md#Launch plan` opens the right note at the
  right section._

- **NOTES-08 (P2):** Make the Notes page easier to use: support full keyboard
  navigation in the folder tree, allow resizing panels, show details in pop-up
  side panels, and remember where each page was scrolled to. See [Notes implementation tasks](pages-tasks/notes-layout-tasks.md).

  _Example: Someone can use the arrow keys to browse folders, drag a panel
  wider for long filenames, and return to a note exactly where they stopped
  reading._

- **NOTES-09 (P2):** Add one New menu for creating bookmarks, notes, and tasks.
  Make the shared search box fully accessible to screen-reader and keyboard
  users. See [Notes implementation tasks](pages-tasks/notes-layout-tasks.md).

  _Example: From the same New button, a person can choose “Note,” “Task,” or
  “Bookmark”; while searching, a screen reader announces the available results
  and which one is selected._

- **NOTES-10 (P2):** Bring back the folder-import screen. Test what happens
  when browser access is removed and restored, when workspaces are very large,
  and when files use unusual text encodings. See [Notes implementation tasks](pages-tasks/notes-layout-tasks.md).

  _Example: If browser permission to a notes folder expires, the app explains
  how to reconnect it without losing work; importing a folder with thousands
  of files still remains dependable._

- **NOTES-16 (P2):** Show important questions in a clear message at the top
  center of the app. The message must stay until the person chooses an action
  or dismisses it, work with assistive technology, and not repeat while they
  type. Keep ordinary success and error messages short-lived. See [Notes implementation tasks](pages-tasks/notes-layout-tasks.md).

  _Example: Before replacing a changed-on-disk note, the app keeps a visible
  “Keep mine” or “Use disk version” choice on screen, while a normal “Saved”
  message still disappears on its own._

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
