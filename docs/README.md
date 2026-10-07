# Documentation

Use this folder for documentation intended primarily for people working on or using this project.

## In this folder

- `getting-started.md` — setup and local development instructions.
- [Maintainer tasks](maintainer-tasks.md) — the active list of remaining work;
  completed tasks are removed.
- [Changelog](../CHANGELOG.md) — released and unreleased changes.
- [ci-cd.md](ci-cd.md) — GitHub Actions validation and optional automated releases.
- [publishing-to-chrome.md](publishing-to-chrome.md) — manual Chrome Store release checklist.
- `privacy-policy.md` — public-facing description of StartSpace data handling.
- `decisions/` — architecture decision records (ADRs).
	- `0004-homepage-search-and-engine-selection.md` — homepage search dropdown, keyboard navigation, exact-result routing, and predefined web engines.
	- `0007-github-actions-chrome-delivery.md` — CI and protected tag-driven Chrome delivery.

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

## Page design

Workspace storage and network descriptions are defined in
[ADR 0025](decisions/0025-workspace-owned-startspace-data.md) and
[ADR 0026](decisions/0026-link-description-fetching.md); they supersede the
conflicting older storage/manual-only description rules.

The approved page images live in `references/`. Their design decisions are recorded as ADRs: [0020 shared UI, search and data](decisions/0020-shared-ui-search-and-data.md), [0021 Home](decisions/0021-home-dashboard.md), [0019 Links](decisions/0019-links-layout.md), [0022 Notes](decisions/0022-notes-page-design.md), [0023 Tasks](decisions/0023-tasks-page-design.md) and [0024 Settings](decisions/0024-settings-page-design.md). Earlier ADRs take precedence where they conflict; each design ADR lists those conflicts. Detailed page implementation notes are in `pages-tasks/*-tasks.md`; the active
cross-project task list is [maintainer-tasks.md](maintainer-tasks.md).
