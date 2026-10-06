// Shared full-width navigation; Notes exposes its own creation action.
import { useEffect, useState } from "react";
import {
  FileText,
  GitBranch,
  House,
  Link,
  ListTodo,
  Menu,
  Moon,
  Plus,
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
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    setMenu(false);
  }, [page]);
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
          {route === "#notes" && (
            <button
              className="notes-primary"
              onClick={() =>
                window.dispatchEvent(new Event("startspace:new-note"))
              }
            >
              <Plus size={20} aria-hidden="true" />
              New note
            </button>
          )}
          <button
            className="notes-icon-button md:hidden"
            aria-label="Toggle navigation"
            title="Toggle navigation"
            aria-expanded={menu}
            onClick={() => setMenu(!menu)}
          >
            <Menu size={20} aria-hidden="true" />
          </button>
        </div>
      </div>
      {menu && (
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
