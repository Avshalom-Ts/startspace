import { forwardRef } from 'react';

export const SearchBar = forwardRef<HTMLInputElement, { value: string; onChange: (value: string) => void }>(
  ({ value, onChange }, ref) => {
    return (
      <div className="w-full">
        <div className="relative">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            ref={ref}
            type="search"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Search bookmarks, notes, tasks, or the web…"
            className="w-full rounded-lg bg-surface border border-border pl-10 pr-4 py-3 text-fg placeholder-muted shadow-sm ring-offset-page focus-visible:outline-2 focus-visible:outline-fg focus-visible:ring-1 focus-visible:ring-fg/30 transition-colors"
          />
        </div>
        <p className="mt-2 text-xs text-muted">
          Search order: Bookmarks → Notes → Tasks → Web
        </p>
      </div>
    );
  }
);

SearchBar.displayName = 'SearchBar';

export function Favorites({ items = [], loading = false }: { items?: { id: string; title: string; url: string }[]; loading?: boolean }) {
  return (
    <section className="w-full mt-6">
      <h2 className="text-sm font-medium uppercase tracking-wide text-muted mb-3">Favorites</h2>
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted">
          <div className="w-4 h-4 border-2 border-border border-t-fg rounded-full animate-spin" />
          <span>Loading favorites…</span>
        </div>
      ) : items.length === 0 ? (
        <span className="text-sm text-muted">No favorites yet.</span>
      ) : (
        <div className="flex flex-wrap gap-2">
          {items.map((item) => (
            <a
              key={item.id}
              href={item.url}
              className="inline-flex items-center rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-fg transition-colors hover:border-fg/40 hover:bg-page hover:text-accent"
            >
              {item.title}
            </a>
          ))}
        </div>
      )}
      <p className="mt-4 text-xs text-muted">
        Favorites are backed by browser bookmarks linked by Bookmark ID.
      </p>
    </section>
  );
}

export function PageFooter() {
  return (
    <footer className="mt-auto border-t border-border py-4 text-center text-xs text-muted">
      StartSpace · Local-first browser homepage
    </footer>
  );
}
