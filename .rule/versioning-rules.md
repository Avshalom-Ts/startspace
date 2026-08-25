# Versioning Rules

- Keep branches and commits focused on one intent.
- Use lowercase branch names such as `feat/topic`, `fix/topic`, `chore/topic`, or `docs/topic`.
- Use concise imperative commit subjects.
- Never commit, merge, publish, or tag a release without explicit approval.
- Use Semantic Versioning (`MAJOR.MINOR.PATCH`) if the project ships versioned releases.

## Extension and Release Context

- StartSpace is a browser extension. If and when the project ships versioned releases to an end-user distribution channel (Chrome Web Store / Firefox Add-ons), use Semantic Versioning for the extension version and keep the version signal meaningful: backward-incompatible changes to workspace data, metadata, or config should be reflected thoughtfully in the version and documented.
- Changes that affect the workspace format (note layout, task storage, metadata shape, folder conventions) are more significant than pure UI tweaks. Treat them as such in planning and in the changelog/ADR where relevant.
- Keep the extension manifest version and any browser-api dependencies in mind when choosing versions; a change that relies on a newer manifest version or a browser API feature can constrain which browsers or versions can run the extension.
- Do not publish to a store or tag a release without explicit approval.
- Coordinate versioning with the distribution path: developer "load unpacked" builds and end-user store builds may carry different version signals; keep them understandable and consistent where they overlap.

## Documentation

- Record substantive version-affecting decisions (e.g., workspace format changes, metadata schema changes, browser support changes) as ADRs in `docs/decisions/` and reference them from the relevant plan or changelog entry.
