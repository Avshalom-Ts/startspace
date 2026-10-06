# Manual Chrome Web Store Releases

This is the current maintainer workflow: build locally and upload the ZIP in
the Chrome Developer Dashboard. Version 0.1.0 was uploaded manually. Store
submission, approval, and public availability are separate milestones.

For installing from a clone without publishing, see
[Getting Started](getting-started.md#developer-installation-build-from-source).
For the optional existing automation, see [CI/CD](ci-cd.md).

## Before You Start

- Use an authorized Chrome Developer Dashboard account with access to the item.
  A first-time publisher needs a registered developer account and a store item.
- Use the pinned Bun version and a known source commit with no unintended local
  changes. Preserve any work in progress; do not discard it for a release.
- Have the store listing, icons/screenshots, and accurate
  [privacy policy](privacy-policy.md) ready. Review permissions and data-use
  disclosures against the actual build.
- Use a test browser profile and test workspace for verification, never real
  user data in screenshots or packaged files.
- Obtain explicit approval before committing, tagging, uploading, or publishing.

**Important:** the existing GitHub workflow runs when a `v*.*.*` tag is pushed.
Manual upload does not require a tag push. Do not push a version tag as part
of this checklist unless you intentionally want the
[automated release workflow](ci-cd.md#chrome-release-workflow) to run.
This guide does not disable or modify that workflow.

## 1. Prepare the Version and Changelog

Choose a `MAJOR.MINOR.PATCH` version greater than the version already uploaded
to Chrome, including any pending submission. Do not reuse an uploaded version.

In [CHANGELOG.md](../CHANGELOG.md):

1. Review Unreleased against changes since the last actual release.
2. Move the applicable entries into `## [VERSION] - YYYY-MM-DD`, leaving an
   Unreleased section for subsequent work.
3. Explain compatibility changes, workspace migrations, and relevant ADRs.
4. Use the actual release date when known. If preparing before release,
   clearly mark the section as pending; do not describe an upload as public.
5. Update version/source and comparison links to the correct release boundary.

From the clone, install the locked dependencies and update both version files.
The following example uses `0.1.1`; substitute your chosen version:

```text
bun install --frozen-lockfile
bun run release:version 0.1.1
bun run test
bun run build
```

The version command updates only `package.json` and `public/manifest.json`.
It does not edit the changelog, commit, tag, upload, or publish.

Verify version consistency in PowerShell:

```powershell
$env:RELEASE_VERSION = "0.1.1"
try {
  bun run verify:release-version
} finally {
  Remove-Item Env:RELEASE_VERSION
}
```

Or in Bash:

```bash
RELEASE_VERSION=0.1.1 bun run verify:release-version
```

Stop if any install, test, build, or version check fails. The version check
does not validate changelog completeness; review the entries manually.

## 2. Verify the Built Extension

Load the generated `dist` directory following the
[Chrome/Edge instructions](getting-started.md#load-unpacked).
Check New Tab, browser-default web search, bookmarks, notes, tasks, workspace
reconnection, and backup/restore using synthetic data.

Inspect `dist/manifest.json`: its version must match the chosen release.
Confirm that the release contains only the intended generated extension files.
Never include credentials, a workspace, real bookmarks, or recovery drafts.

With approval, capture the changelog, both version files, and intended source
changes in version control. Record the exact source commit used for the build.
If source or versions change after verification, rebuild and verify again.

## 3. Create the Upload ZIP

Compress the **contents** of `dist`, not the `dist` directory itself.
`manifest.json`, `index.html`, and `background.js` must be at the archive root.

Run the appropriate command from the repository root after a successful build,
replacing `0.1.1` with the version being released.

**Windows (PowerShell):**

```powershell
Compress-Archive -Path .\dist\* -DestinationPath .\startspace-0.1.1.zip
```

**Linux (Bash, with `zip` installed):**

```bash
(cd dist && zip -qr ../startspace-0.1.1.zip .)
```

Use a new archive path; do not update an old ZIP that may retain obsolete files.
Open the archive and check its root and manifest version before uploading.
Keep generated ZIPs out of source control.

## 4. Upload and Submit Manually

1. Open the [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole)
   and select the existing StartSpace item. For the first release, create a new
   item by uploading the ZIP.
2. Upload the new package in the item's package controls.
3. Resolve validation errors and review warnings, especially permission changes.
4. Review the listing, screenshots, privacy disclosures, distribution settings,
   and any explanations required by the dashboard.
5. Use the matching changelog section for release communication where the
   dashboard supports it. Never paste the entire Unreleased section by mistake.
6. Submit for review using the dashboard's desired publication option. Monitor
   the dashboard for feedback; submission is not proof of publication.

Dashboard labels may change; follow the current package upload and review flow.
Do not retry an accepted upload with the same version. If a correction needs a
new package, increment the version, update the changelog, rebuild, and reverify.

## 5. Record the Outcome

- Record the version, source commit, and upload/review status in release records.
  Once published, finalize the actual release date in the changelog.
- Verify the public listing and installed version after approval/publication.
  Test the store build in a separate profile; do not confuse it with the
  unpacked development copy.
- Optionally create a GitHub Release manually with the same curated notes
  and ZIP, but understand that creating/pushing a matching version tag can
  trigger the existing automated publisher. Coordinate automation before doing
  so; a GitHub Release is not required for a manual Chrome upload.
- Retain the exact uploaded archive locally for traceability and remove
  temporary packaging files when no longer needed.

## Historical 0.1.0

The manual 0.1.0 source includes commit `c965794` (browser-default search),
which is after the existing `v0.1.0` Git tag. Use the
[changelog's confirmed source link](../CHANGELOG.md#010) for that boundary;
do not move the existing tag or infer the store publication date from it.
