# ADR 0013: Local image assets in Notes

Status: Accepted (2026-09-30)

## Decision

Index supported raster image files separately from Markdown notes, without reading their bytes during the workspace scan. In the selected folder's content list, show thumbnail rows; selecting an image opens a read-only image view in the document pane. Markdown preview resolves relative image paths from the note's folder, including nested assets, but never escapes the selected workspace. Both views read bytes only through the granted File System Access directory handle and render typed Blob object URLs that are revoked when the view changes or unmounts.

Only PNG, JPEG, GIF, WebP and AVIF extensions are supported. SVG, remote URLs, data URLs, absolute paths, escaping paths and unavailable files are not loaded. Remote image consent remains NOTES-07. Images do not become notes, search results, favorites or task/bookmark relationship targets; no persisted metadata or migration is required.

The image viewer has a three-dot menu for Rename, Move and Delete. Rename and Move copy binary bytes to a collision-free destination, verify the copy and only then remove the source; a failure preserves the source and identifies both paths for recovery. Renaming keeps the image format. Delete requires confirmation. These operations do not rewrite Markdown references; the dialogs warn that old paths may need updating.

## Consequences

Image-only folders are browsable even when their note count is zero. A thumbnail and an inline preview each load their own temporary URL. Missing files or revoked access show a placeholder without exposing file content or attempting a network request. Changing a file externally requires a workspace refresh to update the folder list.