# Error Handling Rules

Applies to StartSpace as a browser extension: user-facing errors appear in the extension UI (New Tab / Home page, Notes, Tasks, Settings, Links), and failures often come from browser APIs (Bookmark API, File System Access API) or from user actions on local data.

## Defaults

- Validate input early and return safe, actionable errors.
- Keep implementation details, stack traces, secrets, provider payloads, and internal identifiers out of user-facing responses.
- Log unexpected failures with enough context to investigate, while redacting sensitive data.
- Retry only transient failures, with bounded backoff and idempotent operations where possible.
- Add failure-path tests for critical workflows.

## User-Facing Errors

- Show clear, specific, actionable messages in the UI. Prefer "something the user can act on or understand" over raw exceptions.
- For workspace and file operations (notes, tasks, folders, import/export/backup), explain what failed in terms the user understands: e.g., a file could not be written, a folder could not be created, a note could not be read, the workspace access was revoked.
- For bookmark operations, explain failures in terms of the browser's bookmark store where relevant, without exposing internal Bookmark IDs or implementation details unnecessarily.
- Do not surface raw exceptions, stack traces, or internal keys to the user.

## Browser API Failures

- Treat the Bookmark API and File System Access API as fallible. Check for API availability and handle the case where a browser does not support a required API.
- When the File System Access API access is revoked, expired, or unavailable (e.g., the user removed access, the browser does not support the API, or a handle became invalid), surface a clear recovery path: re-select the workspace, retry the action, or explain that the operation is not supported in the current browser.
- When a bookmark read fails, do not treat it as a fatal product error — degrade gracefully (e.g., show a note that bookmarks could not be loaded) and log the failure for investigation.
- Do not assume any browser API is universally available across all target browsers. Check support and handle missing support explicitly.

## Logging and Diagnostics

- Log unexpected failures with enough context to investigate (action, relevant non-sensitive context, failure reason) while redacting sensitive data.
- Do not log workspace file contents, bookmark data, user content, secrets, or credentials.
- Keep logs local to the extension's capability and avoid sending diagnostic data anywhere.

## Retry and Transient Failures

- Retry only transient failures (e.g., temporary filesystem hiccups where the API supports it), with bounded backoff and idempotent operations where possible.
- Do not retry user-conflict or permission errors as if they were transient.
- Make retryable operations safe to repeat (e.g., creating a folder that already exists should be handled as a known case, not blindly retried into an error).

## Critical Workflows

- Add failure-path coverage for critical workflows: workspace selection, note read/write, folder creation, bookmark read, search fallback, import/export/backup.
- Bug fixes for user-facing failures should add a regression test when practical.
- Use minimal fixtures and never include real credentials or real user data in test data.
