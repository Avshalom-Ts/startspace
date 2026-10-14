# ADR 0028: Explicit remote Markdown images

Status: Accepted
Date: 2026-10-14
Related: [ADR 0013](0013-local-notes-images.md),
[ADR 0026](0026-link-description-fetching.md).

## Context

Markdown supports remote image URLs, but loading one contacts a third party and
can reveal the person's network address. StartSpace previously rendered every
remote Markdown image as a placeholder. Note-to-note links also did not decode
paths or retain Markdown heading fragments.

## Decision

- Add a single extension-local **Load remote images** switch in Settings > Notes.
  It defaults to off and applies to every Notes preview; no individual note asks
  for consent.
- When off, remote images remain accessible-text placeholders and make no
  network request. Workspace-relative images continue to use only the granted
  File System Access handle.
- When on, render only public HTTP(S) image URLs. Reject credential-bearing,
  localhost/local, IPv6 literal, and private/reserved IPv4 targets using the
  same public-URL guard used for description fetching. Send no referrer and do
  not fetch or proxy image data in StartSpace code.
- Permit HTTP(S) images in the extension-page CSP only because the setting gates
  the source assignment. Image load failure falls back to the existing text
  placeholder.
- Resolve relative Markdown note links after URL decoding and reject links that
  escape the workspace. Preserve decoded fragments and scroll the rendered
  destination note to the first normalized matching heading.

## Consequences

The Notes page remains local-only by default. Enabling remote images is a
privacy choice that can contact image hosts; those hosts may receive the
person's network address. Fragment matching is text-based and opens the first
matching heading when a note repeats a heading title.
