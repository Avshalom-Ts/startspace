# Documentation

Use this folder for documentation intended primarily for people working on or using this project.

## In this folder

- `getting-started.md` — setup and local development instructions.
- `decisions/` — architecture decision records (ADRs).
	- `0004-homepage-search-and-engine-selection.md` — homepage search dropdown, keyboard navigation, exact-result routing, and predefined web engines.

## Source of truth

Keep the product definition, architecture, and glossary current in `.doc/`:

- `.doc/product-definition.md`
- `.doc/architecture.md`
- `.doc/glossary.md`

This `docs/` folder is for reader-friendly guides, references, and operating documentation built on top of those sources of truth.

## Suggested additions

- `user-guide.md` — how to use StartSpace day to day.
- `api.md` — public API or integration documentation (when applicable).
- `runbook.md` — operational and support procedures (when applicable).
- `decisions/` — additional ADRs as decisions are made during implementation.

## Conventions

- Prefer plain language and concrete steps over abstract descriptions.
- Keep getting-started and user-guide material accurate against the actual implementation, not the product vision alone.
- Update `.doc/` templates when the product or architecture changes; mirror readable summaries in `docs/` where helpful.
