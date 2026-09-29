// Small bundled stroke icons shared by the Notes layout; no remote assets.
import type { SVGProps } from "react";
export type IconName =
  | "note"
  | "folder"
  | "star"
  | "clock"
  | "link"
  | "task"
  | "home"
  | "settings"
  | "plus"
  | "chevron"
  | "close"
  | "menu"
  | "search"
  | "refresh"
  | "info"
  | "more"
  | "eye"
  | "pen"
  | "code";
/** Renders a decorative icon; the containing control owns its accessible label. */
export function Icon({
  name,
  ...props
}: SVGProps<SVGSVGElement> & { name: IconName }) {
  const paths: Record<IconName, string> = {
    note: "M14 2H6a2 2 0 0 0-2 2v16h16V8z M14 2v6h6 M8 12h8 M8 16h6",
    folder: "M3 6h7l2 2h9v12H3z M3 6V4h6l2 2",
    star: "m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9z",
    clock: "M12 8v5l3 2 M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0",
    link: "m10 13 4-4 M8 16l-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0 M16 8l1-1a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0",
    task: "M9 3H4v18h16V9 M9 11l3 3L22 3",
    home: "m3 10 9-8 9 8 M5 9v12h5v-7h4v7h5V9",
    settings:
      "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1z",
    plus: "M12 4v16 M4 12h16",
    chevron: "m9 5 7 7-7 7",
    close: "m6 6 12 12 M6 18 18 6",
    menu: "M4 6h16 M4 12h16 M4 18h16",
    search: "M19 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0 M16 16l5 5",
    refresh:
      "M20 7v5h-5 M4 17v-5h5 M5 8a8 8 0 0 1 14-3l1 7 M4 12l1 7a8 8 0 0 0 14-3",
    info: "M12 11v6 M12 7v1 M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0",
    more: "M4 12h1 M11 12h1 M18 12h1",
    eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6",
    pen: "m16 4 4 4-12 12H4v-4z M14 6l4 4",
    code: "m8 6-6 6 6 6 M16 6l6 6-6 6",
  };
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d={paths[name]} />
    </svg>
  );
}
