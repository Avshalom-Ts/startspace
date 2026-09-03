# Plan: Chrome Web Store delivery

Status: done  
Date: 2026-09-03

## Goal

Add repeatable GitHub Actions validation and a documented, protected path from
a semantic version tag to Chrome Web Store review and publication.

## Scope

CI, version validation, ZIP packaging, Chrome Web Store API v2 upload/publish,
GitHub Releases, first-time publisher instructions, and privacy documentation.
Creating the publisher account and first listing remain manual because they
require the account owner.

## Assumptions

- `main` is the protected integration branch.
- Chrome is the initial store target.
- A protected GitHub environment provides the human release approval boundary.

## Open questions

- Move from a JSON service-account key to Workload Identity Federation after
  the first successful publication.
- Add Firefox packaging and signing when browser support enters scope.

## Steps

1. Validate pull requests and `main` with Bun, Vitest, and the production build.
2. Enforce matching semantic versions for tagged releases.
3. Build and archive one Chrome ZIP.
4. Authenticate a protected deployment and call Chrome Web Store API v2.
5. Attach the submitted package to a GitHub Release.
6. Document first publication, operations, privacy, and recovery steps.

## Validation

- Run unit tests and the production extension verifier locally.
- Exercise release-version success and mismatch paths.
- Parse workflow YAML and type-check repository scripts.

## Risks

- Chrome review can delay or reject a release.
- A service-account JSON key is long-lived and requires careful rotation.
- Dashboard or API behavior can change; check linked official sources before
  each infrequent release.

## Rollout

Configure `chrome-production`, perform the first dashboard upload, then test the
workflow with the next patch version.

## Rollback

Disable the release workflow or revoke/delete the Google service-account key.
Published Chrome versions are managed or rolled back from the Developer
Dashboard; CI remains independent.
