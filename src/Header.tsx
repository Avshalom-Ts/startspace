// Shared full-width navigation and the global creation menu.
import { useEffect, useRef, useState } from "react";
import {
  FileText,
  GitBranch,
  House,
  Link,
  ListTodo,
  Menu,
  Moon,
  Plus,
  ChevronDown,
  Settings,
  Sun,
  type LucideIcon,
} from "lucide-react";
import { Logo } from "./components/Logo";
import GitHubLink from "./components/ui/github-link";

/** Renders desktop navigation and an accessible compact menu on small screens. */
export function Header({
  nav,
  page,
}: {
  nav: { label: string; href: string }[];
  page: string;
}) {
  const route = "#" + page;
  const [navigationMenu, setNavigationMenu] = useState(false);
  const [newMenu, setNewMenu] = useState(false);
  const newMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setNavigationMenu(false);
    setNewMenu(false);
  }, [page]);
  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!newMenuRef.current?.contains(event.target as Node)) setNewMenu(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setNewMenu(false);
    };
    window.addEventListener("mousedown", close);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("mousedown", close);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, []);
  const icons: Record<string, LucideIcon> = {
    Home: House,
    Links: Link,
    Notes: FileText,
    Tasks: ListTodo,
    Settings,
  };
  const items = [{ label: "Home", href: "#home" }, ...nav];
  return (
    <header className="relative z-30 shrink-0 border-b border-border bg-page">
      <div className="container mx-auto flex h-14 items-center justify-between gap-4 px-4">
        <Logo />
        <nav
          aria-label="Main navigation"
          className="hidden items-center gap-7 md:flex"
        >
          {items.map((item) => {
            const NavIcon = icons[item.label] ?? GitBranch;
            return (
              <a
                key={item.label}
                href={item.href}
                aria-current={route === item.href ? "page" : undefined}
                className={
                  "flex h-14 items-center gap-2 border-b-2 text-sm font-medium " +
                  (route === item.href
                    ? "border-accent text-accent"
                    : "border-transparent hover:text-accent")
                }
              >
                <NavIcon size={20} aria-hidden="true" />
                {item.label}
              </a>
            );
          })}
        </nav>
        <div className="flex items-center gap-3">
          <ModeToggle />
          <GitHubLink />
          <div ref={newMenuRef} className="relative">
            <button
              type="button"
              className="notes-primary"
              aria-haspopup="menu"
              aria-expanded={newMenu}
              aria-controls="global-new-menu"
              onClick={() => setNewMenu((open) => !open)}
            >
              <Plus size={20} aria-hidden="true" />
              New
              <ChevronDown size={16} aria-hidden="true" />
            </button>
            {newMenu && (
              <div
                id="global-new-menu"
                role="menu"
                aria-label="Create new"
                className="absolute right-0 z-40 mt-2 w-44 rounded-md border border-border bg-surface p-1 shadow-xl"
              >
                {[
                  ["Bookmark", "#links?new=bookmark", Link],
                  ["Note", "#notes?new=note", FileText],
                  ["Task", "#tasks?new=task", ListTodo],
                ].map(([label, href, Icon]) => {
                  const NewIcon = Icon as LucideIcon;
                  return (
                    <a
                      key={label as string}
                      role="menuitem"
                      href={href as string}
                      className="flex min-h-9 items-center gap-2 rounded px-3 text-sm text-fg hover:bg-page"
                      onClick={() => setNewMenu(false)}
                    >
                      <NewIcon size={16} aria-hidden="true" />
                      {label as string}
                    </a>
                  );
                })}
              </div>
            )}
          </div>
          <button
            className="notes-icon-button md:hidden"
            aria-label="Toggle navigation"
            title="Toggle navigation"
            aria-expanded={navigationMenu}
            onClick={() => setNavigationMenu(!navigationMenu)}
          >
            <Menu size={20} aria-hidden="true" />
          </button>
        </div>
      </div>
      {navigationMenu && (
        <nav
          aria-label="Mobile navigation"
          className="grid grid-cols-3 gap-2 border-t border-border p-3 md:hidden"
        >
          {items.map((item) => (
            <a
              key={item.label}
              className="rounded p-3 text-sm hover:bg-surface"
              aria-current={route === item.href ? "page" : undefined}
              href={item.href}
            >
              {item.label}
            </a>
          ))}
        </nav>
      )}
    </header>
  );
}

function ModeToggle() {
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<"light" | "dark">("light");

  useEffect(() => {
    setMounted(true);
    const stored =
      (localStorage.getItem("startspace.theme") as "light" | "dark") ?? "light";
    setMode(stored);
    document.documentElement.setAttribute("data-theme", stored);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const current =
      document.documentElement.getAttribute("data-theme") === "dark"
        ? "dark"
        : "light";
    setMode(current);
  }, [mounted]);

  const toggle = () => {
    const next = mode === "light" ? "dark" : "light";
    setMode(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("startspace.theme", next);
  };

  return (
    // Button to toggle between light and dark mode
    <button
      className="inline-flex items-center justify-center rounded-md border border-border bg-surface px-2.5 py-1.5 text-muted hover:text-fg hover:border-fg/30 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
      onClick={toggle}
      aria-label={`Switch to ${mode === "light" ? "dark" : "light"} theme`}
      title={`Switch to ${mode === "light" ? "dark" : "light"} theme`}
    >
      {mounted ? (
        mode === "light" ? (
          <Sun size={16} aria-hidden="true" />
        ) : (
          <Moon size={16} aria-hidden="true" />
        )
      ) : (
        <span className="h-4 w-4" />
      )}
    </button>
  );
}
