# ADR 0030: Persistent decision messages

Status: Accepted
Date: 2026-10-14
Related: [ADR 0017](0017-notes-save-conflicts.md),
[ADR 0010](0010-notes-context-and-feedback.md).

## Context

Operation feedback such as a completed save is brief and should not interrupt
work. A changed-on-disk note is different: replacing a person's current draft
requires an intentional choice. Using a short-lived notification for that
choice risks hiding the available resolution, while repeating it from reactive
editor state would distract during typing.

## Decision

Keep transient notifications in the existing top-right stack and give ordinary
success, information, warning, and error messages finite timeouts. Add one
global top-center decision message for cases that require a human choice.

A decision message exposes an accessible alert-dialog role, title,
description, explicit actions, and a dismiss control. It is intentionally
non-modal so the editor remains usable. The provider deduplicates the currently
shown decision by a caller-supplied stable ID.

For a note with a dirty draft that changed on disk, present **Keep mine** and
**Use disk version**. Keeping the draft dismisses the prompt without changing
it; using the disk version replaces the draft and its save baseline only after
the person explicitly chooses that action.

## Consequences

Important choices remain discoverable until resolved without turning all errors
into persistent UI. The decision layer holds one prompt at a time; later use
cases need a product-defined priority rule if they can contend for it. A
dismissed conflict can still be resolved through the normal conflict-safe save
path, which does not overwrite the disk version.
