# Style Rules

- Style the extension with Tailwind CSS. Use utility classes as the primary styling mechanism and avoid stray raw CSS except where Tailwind does not cover a real need (e.g., a small bit of dynamic style injection).
- Define design tokens in `tailwind.config.ts`: colors, spacing, typography, border radius, shadows, and any other repeated values. Use the token set via Tailwind's theme extension so the whole UI shares one source of truth.
- Prefer shared design tokens for color, spacing, typography, and sizing. Define and use a small, consistent token set rather than scattered magic values.
- Keep styles scoped, readable, and close to the component or feature they support. Co-locate Tailwind classes with the React components they style; avoid monolithic global style sheets except for genuinely global concerns (e.g., base resets, custom Tailwind utilities).
- Avoid one-off values when a reusable token or Tailwind utility is appropriate. If you find yourself repeating the same color, spacing, or size, add it to the theme and use the token.
- Style the extension's pages (New Tab / Home page, Links, Notes, Tasks, Settings) to feel like a coherent workspace, not a set of unrelated pages. Navigation, search, and the homepage should share visual language and the same Tailwind theme.
- Keep the UI legible and restrained for a homepage that may be seen many times a day. Avoid visual noise; reserve prominence for what matters: favorites, search, and primary navigation.
- Respect the browser chrome and the user's chosen theme where reasonable; do not fight the browser's UI conventions unnecessarily.
- Document the chosen design tokens in `tailwind.config.ts` and keep the Tailwind configuration as the reference for the visual language. When adding a new token or changing an existing one, update the config rather than introducing a new magic value elsewhere.
