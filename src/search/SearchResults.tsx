// SearchResults.tsx
//
// Renders the grouped output of the central search bar in product order:
// Bookmarks → Notes → Tasks → Web. Bookmark and web results open their URL;
// note and task results navigate to their page via the hash router. Purely
// presentational — matching and ranking live in search.ts, data gathering in
// use-search-data.ts.

import type { SearchResults as SearchResultsData } from "./search";
import { useEffect } from "react";

/** Props for the grouped search results panel. */
export interface SearchResultsProps {
  /** The orchestrated results to render. */
  results: SearchResultsData;
  /** The raw query, used to label the web fallback. */
  query: string;
  /** Index of the keyboard-highlighted result, or -1 when none is active. */
  activeResultIndex: number;
}

const GROUP_LABEL =
  "text-xs font-medium uppercase tracking-wide text-muted mb-1.5";
const ITEM =
  "flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg transition-colors hover:border-fg/40 hover:bg-page hover:text-accent";
const ACTIVE_ITEM = "border-fg/40 bg-page !text-accent";

/** One result group with a heading, e.g. "Bookmarks". */
function Group({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className={GROUP_LABEL}>{label}</h3>
      <div className="flex flex-col gap-1.5">{children}</div>
    </section>
  );
}

/**
 * The grouped search results panel shown under the homepage search bar while
 * a query is entered. Groups render in product order; the web fallback is
 * always offered last, even when local groups have matches.
 */
export function SearchResults({
  results,
  query,
  activeResultIndex,
}: SearchResultsProps) {
  const hasLocal =
    results.bookmarks.length > 0 ||
    results.notes.length > 0 ||
    results.tasks.length > 0;
  const noteOffset = results.bookmarks.length;
  const taskOffset = noteOffset + results.notes.length;
  const webOffset = taskOffset + results.tasks.length;

  useEffect(() => {
    document
      .getElementById(`search-result-${activeResultIndex}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [activeResultIndex]);

  const itemClass = (index: number) =>
    `${ITEM} ${activeResultIndex === index ? ACTIVE_ITEM : ""}`;

  return (
    <div
      className="app-scrollbar max-h-[min(32rem,calc(100vh-12rem))] w-full overflow-y-auto border border-border bg-page p-4 shadow-lg flex flex-col gap-5"
      role="region"
      aria-label="Search results"
    >
      {!hasLocal && (
        <p className="text-sm text-muted">
          No local matches in your bookmarks, notes, or tasks.
        </p>
      )}

      {results.bookmarks.length > 0 && (
        <Group label="Bookmarks">
          {results.bookmarks.map(({ bookmark, matchType }, index) => (
            <a
              key={bookmark.id}
              id={`search-result-${index}`}
              href={bookmark.url}
              className={itemClass(index)}
            >
              <span className="truncate">{bookmark.title || bookmark.url}</span>
              {matchType === "url" && (
                <span className="truncate text-xs text-muted">
                  {bookmark.url}
                </span>
              )}
            </a>
          ))}
        </Group>
      )}

      {results.notes.length > 0 && (
        <Group label="Notes">
          {results.notes.map(({ note, matchType }, index) => (
            <a
              key={note.id}
              id={`search-result-${noteOffset + index}`}
              href={`#notes?note=${encodeURIComponent(note.id)}`}
              className={itemClass(noteOffset + index)}
            >
              <span className="truncate">{note.title}</span>
              <span className="truncate text-xs text-muted">
                {note.id}
                {matchType === "content" ? " · content match" : ""}
              </span>
            </a>
          ))}
        </Group>
      )}

      {results.tasks.length > 0 && (
        <Group label="Tasks">
          {results.tasks.map((task, index) => (
            <a
              key={task.id}
              id={`search-result-${taskOffset + index}`}
              href={`#tasks?task=${encodeURIComponent(task.id)}`}
              className={itemClass(taskOffset + index)}
            >
              <span className="truncate">{task.title}</span>
              {task.description && (
                <span className="truncate text-xs text-muted">
                  {task.description}
                </span>
              )}
            </a>
          ))}
        </Group>
      )}

      {results.webUrl && (
        <Group label="Web">
          <a
            id={`search-result-${webOffset}`}
            href={results.webUrl}
            className={itemClass(webOffset)}
          >
            Search {results.engine.name} for “{query.trim()}”
          </a>
        </Group>
      )}
    </div>
  );
}
