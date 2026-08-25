# UI Rules

- Build the extension's pages with React. Use components as the unit of UI organization; keep components focused on one responsibility and composed from smaller pieces.
- Style with Tailwind CSS. Use utility classes as the primary styling mechanism; keep styling co-located with the component it belongs to.
- Follow the project's established component and accessibility patterns.
- Build responsive interfaces for the supported screen sizes.
- Keep feedback messages concise, specific, and actionable.

## Extension Pages

- The New Tab / Home page is the primary surface and the one the user sees most often. Keep it calm, legible, and fast: favorites, the central search bar, and primary navigation should be visually clear.
- Navigation (Home · Links · Notes · Tasks · Settings · GitHub) should feel like one workspace, not a set of unrelated pages. Share visual language, spacing, and interaction patterns across pages, powered by the same Tailwind theme.
- The central search bar is the main entry point; make its state, focus, and results easy to understand.
- Keep React components small and purposeful. A page should be a composition of components, not one large component.

## Accessibility

- Make interactive elements reachable and operable by keyboard. A homepage the user lives in should not require a mouse for common actions.
- Provide accessible labels for icons and controls where text is not visible.
- Keep focus order sensible and visible; do not hide focus indicators in ways that hurt keyboard users.
- Use accessible color contrast and do not rely on color alone to convey meaning.
- When using Tailwind, ensure color and contrast choices meet accessibility expectations; do not sacrifice contrast for aesthetics.

## Responsive and Browser UI

- The extension pages run inside the browser's tab chrome. Design for the realistic viewport sizes the New Tab page is shown in, and avoid assuming a full-window or arbitrary screen size.
- Do not fight the browser chrome unnecessarily; work with the space the browser gives the page.
- Handle layout gracefully as the viewport changes; avoid hard-coded sizes that break on smaller or larger new-tab areas.

## Feedback and Errors

- Keep feedback messages concise, specific, and actionable (see `.rule/error-handling-rules.md`).
- Surface workspace and file-operation results clearly: note created, folder created, note saved, import complete, export complete, backup complete, and the corresponding failure states.
- Do not expose internal details, stack traces, or sensitive data in UI feedback.

## Libraries and Stack

- React for UI, Tailwind CSS for styling, `marked` for Markdown rendering. Use these consistently; avoid introducing additional UI or styling libraries unless there is a clear need.
- Markdown rendering (via `marked`) should be used for rendering note content where the UI displays rendered Markdown. Keep the rendering concern separated from the data/reading concern.
- Document the chosen stack in this file now that it is selected: TypeScript, React, Tailwind CSS, Vite, WebExtensions / Manifest V3, `marked` for Markdown rendering, Vitest + Playwright for testing.
