// links-ui.tsx
//
// Small presentational pieces shared by the Links sidebar, grid and inspector.

import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { Ellipsis, Globe } from "lucide-react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Keeps Tab focus inside a drawer while it is modal, then restores focus.
 * `staticQuery` names the viewport where the drawer is an inline panel instead.
 */
export function useDrawerFocusTrap(
  ref: RefObject<HTMLElement | null>,
  active: boolean,
  staticQuery: string,
) {
  useEffect(() => {
    if (!active || window.matchMedia(staticQuery).matches) return;
    const previous = document.activeElement as HTMLElement | null;
    const focusables = () =>
      [...(ref.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])].filter(
        (element) => element.offsetParent !== null,
      );
    focusables()[0]?.focus();
    const trap = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || window.matchMedia(staticQuery).matches) return;
      const items = focusables();
      if (!items.length) return;
      const first = items[0]!;
      const last = items[items.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", trap);
    return () => {
      window.removeEventListener("keydown", trap);
      if (previous?.isConnected) previous.focus();
    };
  }, [ref, active, staticQuery]);
}

/** Local initial badge; no remote favicon service is contacted. */
export function LinkIcon({
  title,
  url,
  size = 48,
}: {
  title: string;
  url?: string;
  size?: number;
}) {
  const label = (title || hostname(url)).trim();
  const initial = label.charAt(0).toUpperCase();
  const hue =
    [...label].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 360;
  return (
    <span
      aria-hidden="true"
      className="inline-flex shrink-0 items-center justify-center rounded-lg font-semibold"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.42,
        backgroundColor: `oklch(0.32 0.06 ${hue})`,
        color: `oklch(0.9 0.08 ${hue})`,
      }}
    >
      {initial || <Globe size={size * 0.5} />}
    </span>
  );
}

export interface MenuItem {
  label: string;
  onSelect: () => void;
  danger?: boolean;
}

/** Icon button that opens a small keyboard-dismissable action menu. */
export function MenuButton({
  label,
  items,
  className = "",
}: {
  label: string;
  items: MenuItem[];
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (
        event instanceof KeyboardEvent
          ? event.key === "Escape"
          : !rootRef.current?.contains(event.target as Node)
      )
        setOpen(false);
    };
    window.addEventListener("mousedown", close);
    window.addEventListener("keydown", close);
    return () => {
      window.removeEventListener("mousedown", close);
      window.removeEventListener("keydown", close);
    };
  }, [open]);
  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        aria-label={label}
        title={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="notes-icon-button"
      >
        <Ellipsis size={18} aria-hidden="true" />
      </button>
      {open && (
        <ul
          role="menu"
          aria-label={label}
          className="absolute right-0 top-full z-30 mt-1 min-w-40 rounded-md border border-border bg-surface p-1 shadow-xl"
        >
          {items.map((item, index) => (
            <li key={item.label} role="none">
              <button
                type="button"
                role="menuitem"
                autoFocus={index === 0}
                onClick={() => {
                  setOpen(false);
                  item.onSelect();
                }}
                className={`w-full rounded px-3 py-2 text-left text-sm hover:bg-fg/5 ${item.danger ? "text-red-400" : "text-fg"}`}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Text tag chip; meaning is carried by the label, not color alone. */
export function TagChip({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick?: () => void;
}) {
  if (!onClick)
    return <span className="notes-tag whitespace-nowrap">{children}</span>;
  return (
    <button
      type="button"
      onClick={onClick}
      title={`Filter by ${String(children)}`}
      className="notes-tag pointer-events-auto whitespace-nowrap hover:bg-accent/25"
    >
      {children}
    </button>
  );
}

/** Returns a display-safe hostname for a bookmark URL. */
export function hostname(url: string | undefined): string {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}
