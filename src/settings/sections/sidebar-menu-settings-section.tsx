import { Check, FileText, Info, Link2, Search, Settings2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type Category =
  | "general"
  | "search"
  | "workspace"
  | "notes"
  | "links"
  | "tasks"
  | "about";

export const CATEGORIES: {
  id: Category;
  title: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    id: "general",
    title: "General",
    description: "Appearance, startup, behavior",
    icon: Settings2,
  },
  {
    id: "search",
    title: "Search",
    description: "Local search, web search",
    icon: Search,
  },
  {
    id: "notes",
    title: "Notes",
    description: "Editor and Markdown",
    icon: FileText,
  },
  {
    id: "links",
    title: "Links",
    description: "Bookmarks and display",
    icon: Link2,
  },
  {
    id: "tasks",
    title: "Tasks",
    description: "Statuses and defaults",
    icon: Check,
  },
  {
    id: "about",
    title: "About",
    description: "Version and open source",
    icon: Info,
  },
];

export default function SidebarMenuSettingsSection({
  category,
  chooseCategory,
}: {
  category: Category;
  chooseCategory: (id: Category) => void;
}) {
  return (
    <>
      <aside className="hidden min-h-0 overflow-y-auto rounded-lg border border-border bg-surface/30 p-3 min-[1024px]:block">
        <h2 className="mb-3 px-2 text-base font-semibold text-fg">Settings</h2>
        <nav aria-label="Settings categories" className="space-y-1">
          {CATEGORIES.map(({ id, title, description, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => chooseCategory(id)}
              aria-current={category === id ? "page" : undefined}
              className={`flex min-h-12 w-full items-center gap-3 rounded-md border-l-2 px-2 text-left ${category === id ? "border-accent bg-accent/15 text-fg" : "border-transparent text-muted hover:bg-page hover:text-fg"}`}
            >
              <Icon size={18} aria-hidden="true" className="shrink-0" />
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{title}</span>
                <span className="block truncate text-xs text-muted">
                  {description}
                </span>
              </span>
            </button>
          ))}
        </nav>
      </aside>
    </>
  );
}
