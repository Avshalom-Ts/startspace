// Searchable multi-select for task note/bookmark relationships; changes stay with the caller.
import { useEffect, useId, useRef, useState } from "react";
import { Check, Search, X } from "lucide-react";

/** Shows all available targets on focus, filters as you type, and preserves multiple links. */
export default function LinkPicker({ title, items, selected, onToggle }: {
  title: string;
  items: { id: string; label: string; detail?: string }[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const normalized = query.trim().toLocaleLowerCase();
  const matches = items.filter((item) =>
    `${item.label}\n${item.detail ?? ""}`.toLocaleLowerCase().includes(normalized),
  );
  const activeIndex = active < matches.length ? active : -1;
  useEffect(() => {
    if (open && activeIndex >= 0) {
      document.getElementById(`${id}-option-${activeIndex}`)?.scrollIntoView({ block: "nearest" });
    }
  }, [open, activeIndex, id]);

  /** Toggles one link while retaining input focus for further selections. */
  const choose = (itemId: string) => {
    onToggle(itemId);
    inputRef.current?.focus();
  };

  return (
    <div onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
        setOpen(false);
        setQuery("");
        setActive(-1);
      }
    }}>
      <label htmlFor={id} className="mb-2 block text-xs font-medium uppercase tracking-wide text-muted">
        {title}
      </label>
      <div className="relative">
        <Search size={15} aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
        <input
          ref={inputRef}
          id={id}
          dir="auto"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={`${id}-options`}
          aria-activedescendant={open && activeIndex >= 0 ? `${id}-option-${activeIndex}` : undefined}
          autoComplete="off"
          placeholder={title === "Link notes" ? "Search notes…" : "Search bookmarks…"}
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(-1);
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              setOpen(true);
              const next = matches.length
                ? activeIndex < 0
                  ? event.key === "ArrowDown" ? 0 : matches.length - 1
                  : (activeIndex + (event.key === "ArrowDown" ? 1 : -1) + matches.length) % matches.length
                : -1;
              setActive(next);
            } else if (event.key === "Enter") {
              event.preventDefault();
              if (open && activeIndex >= 0) choose(matches[activeIndex]!.id);
              else setOpen(true);
            } else if (event.key === "Escape" && open) {
              event.preventDefault();
              event.stopPropagation();
              setOpen(false);
              setQuery("");
              setActive(-1);
            }
          }}
          className="h-9 w-full rounded-md border border-border bg-page pl-8 pr-3 text-start text-sm text-fg placeholder-muted focus:border-accent focus:outline-none"
        />
      {open && (
        <div className="app-scrollbar absolute inset-x-0 top-full z-20 mt-1 max-h-40 overflow-y-auto rounded-md border border-border bg-page p-1 shadow-lg">
          <div id={`${id}-options`} role="listbox" aria-label={title} aria-multiselectable="true">
            {matches.map((item, index) => (
              <button
                type="button"
                role="option"
                id={`${id}-option-${index}`}
                key={item.id}
                aria-selected={selected.includes(item.id)}
                tabIndex={-1}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(item.id)}
                className={`cursor-pointer disabled:cursor-not-allowed flex w-full items-center gap-2 rounded px-2 py-2 text-sm text-fg hover:bg-surface ${activeIndex === index ? "bg-accent/10" : ""}`}
              >
                <Check size={15} aria-hidden="true" className={`shrink-0 ${selected.includes(item.id) ? "text-accent" : "invisible"}`} />
                <span className="min-w-0 flex-1">
                  <span dir="auto" className="block truncate text-start">{item.label}</span>
                  {item.detail && <span dir="auto" className="block truncate text-start text-xs text-muted">{item.detail}</span>}
                </span>
              </button>
            ))}
          </div>
          {matches.length === 0 && <p role="status" className="px-2 py-3 text-xs text-muted">{items.length ? "No matches" : "None available"}</p>}
        </div>
      )}
      </div>
      {selected.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5" aria-label={`Selected ${title.toLowerCase().replace("link ", "")}`}>
          {selected.map((itemId) => {
            const item = items.find((entry) => entry.id === itemId);
            const label = item?.label ?? "Unavailable item";
            return (
              <button key={itemId} type="button" onClick={() => onToggle(itemId)}
                aria-label={`Unlink ${label}`} title={`Unlink ${label}`}
                className="cursor-pointer disabled:cursor-not-allowed inline-flex max-w-full items-center gap-1 rounded border border-border bg-page px-2 py-1 text-xs text-fg hover:border-accent">
                <span dir="auto" className="truncate">{label}</span>
                <X size={12} aria-hidden="true" className="shrink-0" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
