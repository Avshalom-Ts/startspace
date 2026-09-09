# ADR 0008: Use the browser's default search provider

Status: Accepted
Date: 2026-09-09
Supersedes: Engine selection and URL fallback in ADR 0004; search configuration guidance in ADR 0002.

The Chrome Web Store rejected 0.1.0 (Red Argon) for combining a New Tab override with an independent search experience.

Web actions now call Chrome's search.query or Firefox's search.search with CURRENT_TAB and no engine override. The search permission is required; no host permission or search-provider override is added. Typing searches only local data. Enter with no selected local result and clicking Web explicitly submit the query. Missing APIs and failures produce actionable feedback without falling back to a hardcoded provider.

Settings is read-only for search. Firefox search.get supplies the default engine name where available; Chromium exposes no equivalent, so it displays Browser default. Metadata refreshes on window focus. Browser-specific settings links use tabs.create and provide manual instructions for restricted destinations.

Configuration version 1 retains the workspace reference but no longer includes webSearchEngine. Legacy stored values are ignored on load; subsequent saves omit them. Backup parsing accepts older version-one backups and discards their engine preference; new exports omit it. Workspace files and backup envelope versions are unchanged.

The search adapter supports both browser and chrome namespaces by capability. The shipping build remains Chromium-first; Firefox packaging and File System Access support remain separate concerns.

Validation: API delegation, unavailable/error paths, metadata, settings routes, legacy backups, local search regression tests, and production build. Store acceptance still requires review.

References:
- https://developer.chrome.com/docs/extensions/reference/api/search
- https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/search
