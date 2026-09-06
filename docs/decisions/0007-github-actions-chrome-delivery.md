# ADR 0007: GitHub Actions and Chrome Web Store delivery

**Status:** Accepted  
**Date:** 2026-09-03

## Context

StartSpace needs repeatable validation for every proposed change and a release path that does not depend on a developer assembling or uploading a different package by hand. Chrome Web Store updates must increment the manifest version, are subject to Google review, and require publisher credentials.

## Decision

Use GitHub Actions for continuous integration and Chrome delivery:

- `.github/workflows/ci.yml` runs locked installation, unit tests, TypeScript
  checking, the Vite production build, and extension artifact verification for
  pull requests and pushes to `main`. The generated `dist/` is retained as a
  short-lived workflow artifact.
- `.github/workflows/release-chrome.yml` runs only for strict
  `vMAJOR.MINOR.PATCH` tags or an explicit manual dispatch targeting an existing
  version tag. It checks that the tag, `package.json`, and manifest versions
  match; tests and builds once; creates the Chrome ZIP; and passes that artifact
  to the deployment job.
- The deployment job uses the protected `chrome-production` GitHub environment.
  Its service-account credential and Chrome publisher identifiers are not
  available to pull-request jobs.
- Chrome Web Store API v2 is used directly from a repository-owned script. The
  workflow requests `DEFAULT_PUBLISH`, which makes an approved version public
  automatically after Chrome review.
- A GitHub Release is created from the exact ZIP submitted to Chrome.

## Consequences

- Merges are validated but never published accidentally.
- A release is traceable to one immutable tag and downloadable ZIP.
- Publishing still depends on Chrome review and is not instantaneous.
- The initial service-account JSON key is a long-lived secret. It must live only
  in the protected GitHub environment and be rotated if exposed. Workload
  Identity Federation is the preferred later hardening step.
- Actions use maintained major-version references for readability. Dependabot or
  routine maintenance should keep them current; commit-SHA pinning can further
  harden the supply chain.

## Alternatives considered

- Publishing every `main` push would produce noisy review submissions and make
  versioning unreliable.
- A third-party Chrome publishing action would place a sensitive release
  boundary in an additional dependency.
- Manual packaging and upload would not prove that the reviewed source produced
  the submitted package.
