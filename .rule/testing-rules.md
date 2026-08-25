# Testing Rules

- Test behavior rather than implementation details.
- Keep tests deterministic, isolated, and independent of execution order.
- Prefer fast unit tests, add integration tests where boundaries matter, and use end-to-end tests for critical journeys.
- New features should cover happy and failure paths; bug fixes should add a regression test when practical.
- Use minimal fixtures and never include real credentials in test data.

## Extension Context

- Unit test the logic that does not depend on browser APIs: search ordering and matching, note parsing/title/content extraction, task linking, folder handling logic, import/export serialization, and any pure functions.
- Where code depends on browser APIs (Bookmark API, File System Access API, extension storage), abstract the dependency behind a small interface so it can be tested without a real browser where practical.
- For browser-API-dependent code, decide a testing strategy when the tech stack is chosen: mock the API surface in unit tests, use a test browser environment for integration tests, or both. Document the chosen approach.
- Do not rely on real user bookmarks, real workspace contents, or real user data in tests. Use minimal, synthetic fixtures that represent the relevant shapes (a bookmark entry, a note file, a task entry, a workspace folder structure).

## Critical Journeys

- End-to-end or integration coverage is most valuable for critical journeys: workspace selection on first launch, creating a note, creating a folder, reading bookmarks, searching across bookmarks/notes/tasks/web fallback, linking a task to a note or bookmark, import/export/backup.
- Cover failure paths for these journeys too: unavailable API, revoked file access, missing workspace, malformed note, failed file write.

## Data and Privacy in Tests

- Never include real bookmarks, real notes, real workspace contents, secrets, or credentials in test data or fixtures.
- Do not send test data to any network or server in the course of running tests.
- Keep test fixtures minimal and representative, not comprehensive copies of real user data.

## Test Stack

- **Unit tests:** Vitest. Use it for pure logic: search ordering and matching, note title/content extraction, task linking, folder handling logic, import/export serialization, Markdown parsing/rendering helpers, and any function that does not require a real browser.
- **Browser and extension-page tests:** Playwright. Use it for extension pages (New Tab / Home page, Links, Notes, Tasks, Settings) and critical journeys that need a real browser context: workspace selection, note and folder creation, bookmark read, search across bookmarks/notes/tasks with the web fallback, and import/export/backup.
- Mock browser APIs (Bookmark API, File System Access API, extension storage) in Vitest unit tests behind small interfaces so the logic can be tested without a real browser.
- Use Playwright for real-browser coverage where mocking is not enough — especially for UI interactions and browser-API-driven flows.
- Keep test files close to the code they cover. Use a conventional location (e.g., `*.test.ts` alongside the source, or a `tests/` tree) and decide it once; apply it consistently.

## Critical Journeys

- End-to-end or integration coverage is most valuable for critical journeys: workspace selection on first launch, creating a note, creating a folder, reading bookmarks, searching across bookmarks/notes/tasks/web fallback, linking a task to a note or bookmark, import/export/backup.
- Cover failure paths for these journeys too: unavailable API, revoked file access, missing workspace, malformed note, failed file write.
