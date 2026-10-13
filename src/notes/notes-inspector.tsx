// Note information, portable tags and current task/bookmark relationships.
import { useEffect, useState } from "react";
import { Check, Link, ListTodo, Plus, X } from "lucide-react";
import type { NoteEntry } from "../types/notes";
import type { Task } from "../tasks/tasks-model";
import type { BookmarkNode } from "../hooks/useBookmarks";

type Props = {
  note: NoteEntry | null;
  demo: boolean;
  tags: string[];
  metadataEnabled: boolean;
  onAddTag: (tag: string) => Promise<boolean>;
  onRemoveTag: (tag: string) => void;
  links: BookmarkNode[];
  availableBookmarks: BookmarkNode[];
  tasks: Task[];
  availableTasks: Task[];
  taskError: string | null;
  bookmarkError: string | null;
  bookmarkMetadataEnabled: boolean;
  busy: boolean;
  onLinkTask: (id: string) => void;
  onSetBookmarkLink: (id: string, linked: boolean) => void;
  legacyBookmarkLinksAvailable: boolean;
  onMigrateLegacyBookmarkLinks: () => void;
  onClose: () => void;
};
/** Shows honest file properties and live relation counts, plus an existing-task picker. */
export function NotesInspector({
  note,
  demo,
  tags,
  metadataEnabled,
  onAddTag,
  onRemoveTag,
  links,
  availableBookmarks,
  tasks,
  availableTasks,
  taskError,
  bookmarkError,
  bookmarkMetadataEnabled,
  busy,
  onLinkTask,
  onSetBookmarkLink,
  legacyBookmarkLinksAvailable,
  onMigrateLegacyBookmarkLinks,
  onClose,
}: Props) {
  const [tab, setTab] = useState<"info" | "links" | "tasks">("info");
  const [picker, setPicker] = useState(false);
  const [bookmarkPicker, setBookmarkPicker] = useState(false);
  const [bookmarkSearch, setBookmarkSearch] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tagError, setTagError] = useState("");
  useEffect(() => {
    setTagInput("");
    setTagError("");
    setBookmarkPicker(false);
    setBookmarkSearch("");
  }, [note?.id]);
  const linkableBookmarks = availableBookmarks.filter(
    (bookmark) => !links.some((linked) => linked.id === bookmark.id),
  );
  const matchingBookmarks = linkableBookmarks.filter((bookmark) => {
    const query = bookmarkSearch.trim().toLowerCase();
    return !query || `${bookmark.title}\n${bookmark.url ?? ""}`.toLowerCase().includes(query);
  });
  return (
    <aside
      aria-label="Note information"
      className="flex h-full min-h-0 flex-col"
    >
      <div className="flex border-b border-border px-3">
        {(["info", "links", "tasks"] as const).map((name) => (
          <button
            key={name}
            className={
              "min-h-14 flex-1 border-b-2 text-sm capitalize " +
              (name === tab
                ? "border-accent text-accent"
                : "border-transparent text-muted")
            }
            aria-pressed={name === tab}
            onClick={() => setTab(name)}
          >
            {name}
            {name !== "info" &&
              " (" + (name === "links" ? links.length : tasks.length) + ")"}
          </button>
        ))}
        <button
          className="notes-icon-button min-[1600px]:hidden"
          aria-label="Close information"
          title="Close information"
          onClick={onClose}
        >
          <X size={20} aria-hidden="true" />
        </button>
      </div>
      {!note ? (
        <p className="p-5 text-sm text-muted">
          Select a note to see its information.
        </p>
      ) : (
        <div className="app-scrollbar flex-1 space-y-6 overflow-auto p-5 text-sm">
          {tab === "info" && (
            <>
              <section>
                <h3 className="mb-3 font-semibold">Tags</h3>
                {tags.length ? (
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="notes-tag inline-flex items-center gap-1"
                      >
                        {tag}
                        {!demo && (
                          <button
                            type="button"
                            disabled={!metadataEnabled}
                            aria-label={`Remove tag ${tag}`}
                            title={`Remove tag ${tag}`}
                            onClick={() => onRemoveTag(tag)}
                          >
                            <X size={14} aria-hidden="true" />
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted">No tags.</p>
                )}
                {!demo && (
                  <form
                    className="mt-3 flex gap-2"
                    onSubmit={(event) => {
                      event.preventDefault();
                      const tag = tagInput.trim();
                      if (!tag || tag.length > 64 || tags.includes(tag)) {
                        setTagError("Enter a new tag (1-64 characters).");
                        return;
                      }
                      void onAddTag(tag).then((ok) => {
                        if (ok) {
                          setTagInput("");
                          setTagError("");
                        }
                      });
                    }}
                  >
                    <input
                      className="notes-input min-w-0 flex-1"
                      aria-label="New note tag"
                      placeholder="Tag"
                      maxLength={64}
                      disabled={!metadataEnabled}
                      value={tagInput}
                      onChange={(event) => {
                        setTagInput(event.target.value);
                        setTagError("");
                      }}
                    />
                    <button
                      type="submit"
                      className="notes-icon-button"
                      aria-label="Add tag"
                      title="Add tag"
                      disabled={!metadataEnabled || !tagInput.trim()}
                    >
                      <Plus size={18} aria-hidden="true" />
                    </button>
                  </form>
                )}
                {tagError && (
                  <p role="alert" className="mt-2 text-red-400">
                    {tagError}
                  </p>
                )}
              </section>
              <dl className="space-y-4 border-y border-border py-5">
                <div>
                  <dt className="text-muted">Modified</dt>
                  <dd className="mt-1">
                    {new Date(note.modifiedAt).toLocaleString()}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">Content size (UTF-8)</dt>
                  <dd>
                    {new TextEncoder()
                      .encode(note.content)
                      .byteLength.toLocaleString()}{" "}
                    bytes
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">File</dt>
                  <dd className="mt-1 break-all">{note.id}</dd>
                </div>
              </dl>
              <h3 className="font-semibold">Related</h3>
            </>
          )}
          {(tab === "info" || tab === "links") && (
            <section>
              <h3 className="mb-3 flex items-center gap-2 font-medium">
                <Link size={20} aria-hidden="true" /> Links ({links.length})
              </h3>
              {bookmarkError && !demo && (
                <p className="mb-3 text-muted">
                  Bookmarks unavailable. Reopen this page in the extension to
                  load them.
                </p>
              )}
              {!links.length && (
                <p className="text-muted">No related bookmarks.</p>
              )}
              {links.map((link) => (
                <div
                  key={link.id}
                  className="mb-2 flex items-center gap-2 rounded-md border border-border p-3"
                >
                  <a
                    href={/^https?:\/\//i.test(link.url ?? "") ? link.url : undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-w-0 flex-1 hover:border-accent"
                  >
                    <span>{link.title}</span>
                    <span className="mt-1 block truncate text-xs text-muted">{link.url}</span>
                  </a>
                  {!demo && (
                    <button
                      type="button"
                      className="notes-icon-button"
                      aria-label={`Remove relation to ${link.title}`}
                      title="Remove relation"
                      disabled={!bookmarkMetadataEnabled || busy}
                      onClick={() => onSetBookmarkLink(link.id, false)}
                    >
                      <X size={16} aria-hidden="true" />
                    </button>
                  )}
                </div>
              ))}
              {!demo && (
                <>
                  <div className="relative mt-3">
                    <button
                      type="button"
                      aria-expanded={bookmarkPicker}
                      aria-controls="note-bookmark-picker"
                      disabled={!bookmarkMetadataEnabled || !!bookmarkError || busy}
                      className="notes-button"
                      onClick={() => {
                        setBookmarkPicker(!bookmarkPicker);
                        if (bookmarkPicker) setBookmarkSearch("");
                      }}
                    >
                      <Plus size={16} aria-hidden="true" /> Link existing bookmark
                    </button>
                    {bookmarkPicker && (
                      <div
                        id="note-bookmark-picker"
                        role="dialog"
                        aria-label="Choose a bookmark to link"
                        className="absolute left-0 z-20 mt-2 w-full min-w-64 rounded-md border border-border bg-surface p-2 shadow-lg"
                      >
                        <input
                          autoFocus
                          type="search"
                          className="notes-input w-full"
                          aria-label="Search bookmarks to link"
                          placeholder="Search bookmarks"
                          value={bookmarkSearch}
                          onChange={(event) => setBookmarkSearch(event.target.value)}
                        />
                        <div
                          role="listbox"
                          aria-label="Available bookmarks"
                          className="app-scrollbar mt-2 max-h-56 space-y-1 overflow-y-auto"
                        >
                          {matchingBookmarks.map((bookmark) => (
                            <button
                              key={bookmark.id}
                              type="button"
                              role="option"
                              aria-selected={false}
                              disabled={busy}
                              className="flex w-full flex-col rounded border border-border p-2 text-left hover:border-accent"
                              onClick={() => {
                                onSetBookmarkLink(bookmark.id, true);
                                setBookmarkPicker(false);
                                setBookmarkSearch("");
                              }}
                            >
                              <span>{bookmark.title || bookmark.url}</span>
                              <span className="truncate text-xs text-muted">{bookmark.url}</span>
                            </button>
                          ))}
                        </div>
                        {!linkableBookmarks.length ? (
                          <p className="p-2 text-muted">Every current bookmark is already linked.</p>
                        ) : !matchingBookmarks.length ? (
                          <p className="p-2 text-muted">No bookmarks match that search.</p>
                        ) : null}
                      </div>
                    )}
                  </div>
                  {legacyBookmarkLinksAvailable && (
                    <button
                      type="button"
                      disabled={!bookmarkMetadataEnabled || busy}
                      className="notes-button mt-3"
                      onClick={onMigrateLegacyBookmarkLinks}
                    >
                      Import saved bookmark links
                    </button>
                  )}
                </>
              )}
            </section>
          )}
          {(tab === "info" || tab === "tasks") && (
            <section>
              <h3 className="mb-3 flex items-center gap-2 font-medium">
                <ListTodo size={20} aria-hidden="true" /> Tasks ({tasks.length})
              </h3>
              {taskError && (
                <p role="alert" className="mb-3 text-red-400">
                  Tasks could not be loaded. Refresh the workspace to retry.
                </p>
              )}
              {!tasks.length && <p className="text-muted">No related tasks.</p>}
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="mb-2 rounded-md border border-border p-3"
                >
                  <a
                    href={
                      demo
                        ? undefined
                        : "#tasks?task=" + encodeURIComponent(task.id)
                    }
                    className="hover:text-accent"
                  >
                    {task.title}
                  </a>
                  <p className="mt-1 text-xs text-muted">
                    {task.status}
                    {demo ? " · demo" : ""}
                  </p>
                </div>
              ))}
              {!demo && (
                <button
                  disabled={!!taskError || busy}
                  className="notes-button mt-3"
                  onClick={() => setPicker(!picker)}
                >
                  Link existing task
                </button>
              )}
              {picker && !demo && (
                <div className="mt-3 space-y-2">
                  <p className="text-xs text-muted">
                    Select a task to link or unlink.
                  </p>
                  {availableTasks.length ? (
                    availableTasks.map((task) => (
                      <button
                        key={task.id}
                        disabled={busy}
                        onClick={() => onLinkTask(task.id)}
                        className="flex w-full gap-2 rounded border border-border p-2 text-left"
                      >
                        {tasks.some((item) => item.id === task.id) ? (
                          <Check size={16} aria-hidden="true" />
                        ) : (
                          <Plus size={16} aria-hidden="true" />
                        )}
                        {task.title}
                      </button>
                    ))
                  ) : (
                    <p className="text-muted">
                      Create a task on the Tasks page first.
                    </p>
                  )}
                </div>
              )}
            </section>
          )}
        </div>
      )}
    </aside>
  );
}
