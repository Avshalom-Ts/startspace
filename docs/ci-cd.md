# CI/CD workflow

StartSpace uses GitHub Actions to validate every change and publish tagged releases.
The workflows separate untrusted build work from the job that can access Chrome publisher credentials.

## Continuous integration

`.github/workflows/ci.yml` runs for every pull request and push to `main`:

1. Check out the source.
2. Install the Bun version pinned in `package.json`.
3. Run `bun install --frozen-lockfile`.
4. Run all Vitest unit tests.
5. Type-check, build, and verify the Manifest V3 output with `bun run build`.
6. Upload `dist/` as a workflow artifact for 14 days.

The workflow has only `contents: read`.
Configure the repository's `main` branch protection to require the **Test and build extension** check before a pull request can merge.

## Chrome release workflow

`.github/workflows/release-chrome.yml` starts when a tag matching `v*.*.*` is
pushed. A script enforces the stricter `vMAJOR.MINOR.PATCH` form. It can also be
run manually from the Actions page using an existing tag.

The build job checks out the tag, verifies that the tag and both version files match, tests the source, builds it, and zips the contents of `dist/` so the manifest is at the archive root.
The ZIP is retained as an artifact for 90 days.

The publish job waits for the protected `chrome-production` environment.
Once approved, it obtains a short-lived API token from the stored service-account credential, uploads the ZIP, waits for Chrome validation, and submits it for review.
`DEFAULT_PUBLISH` means Chrome makes it public after approval.
The exact same ZIP is attached to a generated GitHub Release.

## Required GitHub configuration

Create an environment under **Repository Settings → Environments** named `chrome-production` and add a required reviewer.
Restrict deployment tags to protected tags if your GitHub plan exposes that option.

Add these environment variables:

| Name | Value |
| --- | --- |
| `CHROME_SERVICE_ACCOUNT_EMAIL` | Service-account email registered in the Chrome Developer Dashboard |
| `CHROME_PUBLISHER_ID` | Publisher ID from Chrome Developer Dashboard → Account |
| `CHROME_EXTENSION_ID` | Store item ID shown in its dashboard URL/details |

Add this environment secret:

| Name | Value |
| --- | --- |
| `CHROME_SERVICE_ACCOUNT_JSON` | Complete, preferably minified service-account JSON key |

Never add the JSON key to the repository, an issue, a log, or a workflow artifact.
The generated `gha-creds-*.json` pattern is ignored by Git.

## Making a release

Choose a semantic version greater than the version currently uploaded to Chrome.
For example, to release `0.1.0`:

```bash
bun run release:version 0.1.0
bun run test
bun run build
```

On Bash, run the explicit version check as:

```bash
export RELEASE_VERSION=0.1.0
echo $RELEASE_VERSION
```

On PowerShell, run the explicit version check as:

```powershell
$env:RELEASE_VERSION = "0.1.0"
bun run verify:release-version
Remove-Item Env:RELEASE_VERSION
```

```bash
bun run verify:release-version
```

Those commands would publish code to GitHub and trigger the Chrome release workflow:

- git add ... — only stages the two files locally.
- git commit ... — creates a local commit.
- git tag v0.1.0 — creates a local release tag.
- git push origin main — publishes commits to GitHub.
- git push origin v0.1.0 — publishes the tag and triggers release-chrome.yml.

```bash
git add package.json public/manifest.json
git commit -m "chore: release 0.1.0"
git tag v0.1.0
git push origin main
git push origin v0.1.0
```

The version command updates only local source files; it never commits, tags, or publishes.

Open **Actions → Release to Chrome Web Store**, review the build, and approve the `chrome-production` deployment.
Then monitor Chrome Developer Dashboard for review status and messages from Google.

Do not reuse or move a release tag.
If an upload has already succeeded, fix any later failure with a new patch version.

## Manual retry

Use **Run workflow** only for an existing tag whose package was not successfully uploaded.
Enter the full tag, such as `v0.1.0`. The workflow still checks out that tag and revalidates all versions.

## Troubleshooting

- **Versions do not match:** update both version files and create a new tag.
- **Missing environment variable:** add the named variable to `chrome-production`.
- **Authentication failure:** verify the JSON key, service-account email, Token Creator role, and Chrome Dashboard service-account registration.
- **Upload rejected:** confirm that the manifest version increased and that the ZIP has `manifest.json` at its root.
- **Publish blocked on warnings:** resolve the dashboard warning instead of disabling `blockOnWarnings`.
- **Already under review:** wait for or cancel the existing submission before submitting another version.

## Security maintenance

- Rotate the service-account key immediately if it may have leaked.
- Keep publisher access and required reviewers limited.
- Review dependency and GitHub Action updates before merging.
- Consider Google Workload Identity Federation to remove the long-lived key after the initial pipeline works.
- Never expose publisher credentials to pull-request jobs or unrelated self-hosted runners.
