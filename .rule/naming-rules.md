# Naming Rules

## Defaults

- Use descriptive, consistent names that match the project's language conventions.
- Keep domain terms consistent across code, APIs, tests, and documentation.
- Avoid unnecessary abbreviations and synonyms.
- Document shared domain terms in `.doc/glossary.md` before broad use.

## Code and Files

- Name files and modules by what they do, not by their type alone. Prefer `bookmark-search.ts` over `utils2.ts`; prefer `note-editor` over `notes thing`.
- Keep a clear mapping between a feature area and its files: e.g., bookmark-related logic lives with other bookmark logic; note-related logic lives with other note logic.
- Use consistent casing per the project's language conventions (e.g., `kebab-case` for files where appropriate, language-idiomatic naming for code entities).
- Avoid single-letter names, generic names like `data`, `info`, `helper`, or `utils` without a clear, specific scope.

## TypeScript Conventions

- Use PascalCase for React components, types, and interfaces.
- Use camelCase for functions, variables, and methods.
- Use kebab-case for file names (e.g., `notes-editor.tsx`, `bookmark-search.ts`).
- Keep the file name aligned with its primary export where practical: `NotesEditor` in `notes-editor.tsx`, `useBookmarks` in `use-bookmarks.ts`.
- Avoid abbreviations unless they are project-established domain terms.
- Name types and interfaces by what they represent, not by the word "Type" or "Interface" alone (e.g., `BookmarkEntry`, `NoteMeta`, `WorkspaceConfig`).

## Extension and Manifest

- Name manifest keys, permissions, and entry points clearly and consistently with what they represent.
- Name permissions and API uses in code by the capability they represent, and keep the name aligned with the product reason for using them.
- Keep the relationship between a Bookmark ID and StartSpace metadata clear in naming — do not reuse "bookmark" to mean "StartSpace metadata about a bookmark"; use distinct terms (see glossary).

## Domain Terms

- Use the terms defined in `.doc/glossary.md`: StartSpace, workspace, Bookmark ID, favorites, Notes, Tasks, Kanban board, search order, central search bar, web search engine, File System Access API, Bookmark API, folder, metadata, tags, Settings, Links, etc.
- When a new domain term appears in code, documentation, UI, or tests, add it to the glossary before broad use.
- Do not invent synonyms for existing glossary terms across code and docs.

## Tests

- Name tests by the behavior they verify, not by the function name alone. Prefer "creating a folder in an empty workspace creates the directory" over "test new folder".
- Keep test names readable and consistent with the code they cover.

## Documentation

- Use the same terms in documentation that the code and UI use. When docs and code diverge, fix the divergence rather than adding a second name.
