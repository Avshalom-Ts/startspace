// links-inspector.tsx
//
// Selected-bookmark details: browser fields, local metadata and relations.
// Browser name/URL/folder are resolved from the live tree on every render.

import {
  useEffect,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import {
  ArrowLeft,
  CalendarClock,
  Clock,
  Copy,
  ExternalLink,
  FileText,
  Folder,
  ListTodo,
  Plus,
  Star,
  X,
} from "lucide-react";
import { normalizeTags } from "./links-view";
import type { BookmarkMetadata, BookmarkNode } from "../hooks/useBookmarks";
import { matchesNoteReference } from "../notes/note-identity";
import type { Task } from "../tasks/tasks-model";
import type { NoteEntry } from "../types/notes";
import { hostname, LinkIcon, MenuButton } from "./links-ui";

interface LinksInspectorProps {
  node: BookmarkNode | null;
  folderPath: string;
  meta?: BookmarkMetadata;
  notes: NoteEntry[];
  tasks: Task[];
  onClose: () => void;
  onToggleFavorite: (id: string, current: boolean) => void;
  onUpdateMetadata: (
    id: string,
    patch: Partial<BookmarkMetadata>,
  ) => Promise<void>;
  onOpen: (node: BookmarkNode, event?: MouseEvent) => void;
  onCopy: (url: string) => void;
  onEdit: (node: BookmarkNode) => void;
  onDelete: (node: BookmarkNode) => void;
  onTagClick: (tag: string) => void;
}

const dateFormat = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

/** Formats a timestamp for display, or null when unknown/invalid. */
function formatDate(value: number | string | undefined): string | null {
  if (value === undefined) return null;
  const time = typeof value === "number" ? value : Date.parse(value);
  return Number.isFinite(time) ? dateFormat.format(time) : null;
}

/** Renders the complementary inspector for the selected bookmark. */
export function LinksInspector(props: LinksInspectorProps) {
  const { node, meta } = props;
  if (!node?.url)
    return (
      <aside
        aria-label="Bookmark details"
        className="flex h-full items-center justify-center rounded-[10px] border border-border bg-surface p-6 text-sm text-muted"
      >
        Select a bookmark
      </aside>
    );
  return <InspectorBody key={node.id} {...props} node={node} meta={meta} />;
}

/** Inspector content for a resolved bookmark leaf. */
function InspectorBody({
  node,
  folderPath,
  meta,
  notes,
  tasks,
  onClose,
  onToggleFavorite,
  onUpdateMetadata,
  onOpen,
  onCopy,
  onEdit,
  onDelete,
  onTagClick,
}: LinksInspectorProps & { node: BookmarkNode }) {
  const favorite = meta?.favorites === true;
  const name = node.title || hostname(node.url) || "Untitled bookmark";
  const created = formatDate(node.dateAdded);
  const metadataUpdated = formatDate(meta?.updatedAt);
  const addedToStartSpace = meta ? formatDate(meta.dateAdded) : null;
  const lastOpened = formatDate(meta?.lastOpenedAt);
  const save = (patch: Partial<BookmarkMetadata>) =>
    void onUpdateMetadata(node.id, patch);

  return (
    <aside
      aria-label="Bookmark details"
      className="app-scrollbar flex h-full min-h-0 flex-col gap-4 overflow-y-auto rounded-[10px] border border-border bg-surface p-5"
    >
      <button
        type="button"
        className="notes-button self-start md:hidden"
        onClick={onClose}
      >
        <ArrowLeft size={16} aria-hidden="true" /> Back to links
      </button>
      <div className="flex items-start gap-3">
        <LinkIcon title={name} url={node.url} size={56} />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-semibold text-fg" title={name}>
            {name}
          </h2>
          <p className="truncate text-sm text-muted" title={node.url}>
            {node.url}
          </p>
        </div>
        <button
          type="button"
          aria-pressed={favorite}
          aria-label={favorite ? "Remove from favorites" : "Add to favorites"}
          title={favorite ? "Remove from favorites" : "Add to favorites"}
          onClick={() => onToggleFavorite(node.id, favorite)}
          className={`notes-icon-button ${favorite ? "text-accent!" : ""}`}
        >
          <Star
            size={20}
            fill={favorite ? "currentColor" : "none"}
            aria-hidden="true"
          />
        </button>
        <MenuButton
          label="Bookmark actions"
          items={[
            { label: "Edit or move", onSelect: () => onEdit(node) },
            { label: "Delete", onSelect: () => onDelete(node), danger: true },
          ]}
        />
        <button
          type="button"
          className="notes-icon-button hidden md:inline-flex"
          aria-label="Close details"
          title="Close details"
          onClick={onClose}
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>

      <TagEditor
        tags={meta?.tags ?? []}
        onChange={(tags) => save({ tags })}
        onTagClick={onTagClick}
      />
      <DescriptionEditor
        value={meta?.description ?? ""}
        onChange={(description) => save({ description })}
      />

      <div className="flex gap-2">
        <a
          href={node.url}
          onClick={(event) => onOpen(node, event)}
          className="notes-primary flex-1"
        >
          Open Link <ExternalLink size={16} aria-hidden="true" />
        </a>
        <button
          type="button"
          className="notes-button"
          aria-label="Copy URL"
          title="Copy URL"
          onClick={() => onCopy(node.url!)}
        >
          <Copy size={16} aria-hidden="true" />
        </button>
      </div>

      <dl className="space-y-2 text-sm">
        <InfoRow
          icon={Clock}
          label="Created"
          value={created ?? "Unavailable"}
        />
        {metadataUpdated && (
          <InfoRow
            icon={CalendarClock}
            label="Metadata updated"
            value={metadataUpdated}
          />
        )}
        {addedToStartSpace && (
          <InfoRow
            icon={Star}
            label="Added to StartSpace"
            value={addedToStartSpace}
          />
        )}
        {lastOpened && (
          <InfoRow
            icon={ExternalLink}
            label="Last opened here"
            value={lastOpened}
          />
        )}
        <div>
          <dt className="flex items-center gap-2 text-muted">
            <Folder size={15} aria-hidden="true" /> Bookmark folder
          </dt>
          <dd className="mt-1 wrap-break-word pl-6 text-fg">
            {folderPath || "—"}
          </dd>
        </div>
      </dl>

      <RelatedTabs
        node={node}
        meta={meta}
        notes={notes}
        tasks={tasks}
        onChangeNotes={(relatedNotes) => save({ relatedNotes })}
      />
    </aside>
  );
}

/** One label/value row in the information list. */
function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="flex items-center gap-2 text-muted">
        <Icon size={15} aria-hidden="true" /> {label}
      </dt>
      <dd className="text-right text-fg">{value}</dd>
    </div>
  );
}

/** Lists tags with remove buttons and an inline Add tag field. */
function TagEditor({
  tags,
  onChange,
  onTagClick,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
  onTagClick: (tag: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [value, setValue] = useState("");
  const commit = () => {
    if (value.trim()) onChange(normalizeTags([...tags, value]));
    setValue("");
    setAdding(false);
  };
  return (
    <div
      className="flex flex-wrap items-center gap-1.5"
      aria-label="Tags"
      role="group"
    >
      {tags.map((tag) => (
        <span key={tag} className="notes-tag inline-flex items-center gap-1">
          <button
            type="button"
            title={`Filter by ${tag}`}
            onClick={() => onTagClick(tag)}
            className="hover:underline"
          >
            {tag}
          </button>
          <button
            type="button"
            aria-label={`Remove tag ${tag}`}
            title="Remove tag"
            onClick={() => onChange(tags.filter((item) => item !== tag))}
            className="rounded-full hover:text-fg"
          >
            <X size={12} aria-hidden="true" />
          </button>
        </span>
      ))}
      {adding ? (
        <input
          autoFocus
          value={value}
          aria-label="New tag"
          onChange={(event) => setValue(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") commit();
            if (event.key === "Escape") {
              setValue("");
              setAdding(false);
            }
          }}
          className="notes-input h-7 w-32 px-2 py-0 text-xs"
        />
      ) : (
        <button
          type="button"
          className="notes-button min-h-7 px-2 py-0.5 text-xs"
          onClick={() => setAdding(true)}
        >
          <Plus size={14} aria-hidden="true" /> Add tag
        </button>
      )}
    </div>
  );
}

/** User-written description, never fetched from the bookmarked site. */
function DescriptionEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  if (!editing)
    return value ? (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="whitespace-pre-wrap text-left text-sm text-fg hover:text-accent"
        title="Edit description"
      >
        {value}
      </button>
    ) : (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="text-left text-sm text-muted hover:text-fg"
      >
        Add a description…
      </button>
    );
  return (
    <div className="space-y-2">
      <textarea
        autoFocus
        aria-label="Description"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        rows={3}
        className="notes-input resize-y"
      />
      <div className="flex justify-end gap-2">
        <button
          type="button"
          className="notes-button"
          onClick={() => {
            setDraft(value);
            setEditing(false);
          }}
        >
          Cancel
        </button>
        <button
          type="button"
          className="notes-primary"
          onClick={() => {
            onChange(draft.trim());
            setEditing(false);
          }}
        >
          Save
        </button>
      </div>
    </div>
  );
}

/** Related Notes / Tasks tabs with arrow-key navigation. */
function RelatedTabs({
  node,
  meta,
  notes,
  tasks,
  onChangeNotes,
}: {
  node: BookmarkNode;
  meta?: BookmarkMetadata;
  notes: NoteEntry[];
  tasks: Task[];
  onChangeNotes: (references: string[]) => void;
}) {
  const [tab, setTab] = useState<"notes" | "tasks">("notes");
  const [picking, setPicking] = useState(false);
  const [relinking, setRelinking] = useState<string | null>(null);
  const [choice, setChoice] = useState("");
  const references = meta?.relatedNotes ?? [];
  const linkedNotes = references.map((reference) => ({
    reference,
    note:
      notes.find((note) =>
        matchesNoteReference(reference, note.id, note.stableId),
      ) ?? null,
  }));
  const linkable = notes.filter(
    (note) =>
      !references.some((reference) =>
        matchesNoteReference(reference, note.id, note.stableId),
      ),
  );
  const linkedTasks = tasks.filter((task) =>
    task.bookmarkIds.includes(node.id),
  );
  const onTabKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const next = tab === "notes" ? "tasks" : "notes";
    setTab(next);
    document.getElementById(`links-tab-${next}`)?.focus();
  };

  return (
    <section
      aria-labelledby="links-related-heading"
      className="border-t border-border pt-4"
    >
      <h3 id="links-related-heading" className="mb-2 font-semibold text-fg">
        Related
      </h3>
      <div
        role="tablist"
        aria-label="Related items"
        className="mb-3 flex gap-4 border-b border-border"
      >
        {(["notes", "tasks"] as const).map((key) => (
          <button
            key={key}
            id={`links-tab-${key}`}
            type="button"
            role="tab"
            aria-selected={tab === key}
            aria-controls={`links-panel-${key}`}
            tabIndex={tab === key ? 0 : -1}
            onKeyDown={onTabKey}
            onClick={() => setTab(key)}
            className={`-mb-px border-b-2 px-1 pb-2 text-sm ${tab === key ? "border-accent text-accent" : "border-transparent text-muted hover:text-fg"}`}
          >
            {key === "notes"
              ? `Notes (${linkedNotes.length})`
              : `Tasks (${linkedTasks.length})`}
          </button>
        ))}
      </div>

      {tab === "notes" ? (
        <div
          id="links-panel-notes"
          role="tabpanel"
          aria-labelledby="links-tab-notes"
          className="space-y-2"
        >
          {linkedNotes.length === 0 && (
            <p className="text-sm text-muted">No related notes.</p>
          )}
          {linkedNotes.map(({ reference, note }) => (
            <div
              key={reference}
              className="flex items-center gap-2 rounded-md border border-border p-2"
            >
              <FileText
                size={18}
                aria-hidden="true"
                className="shrink-0 text-muted"
              />
              {note ? (
                <a
                  href={`#notes?note=${encodeURIComponent(note.id)}`}
                  className="min-w-0 flex-1 hover:text-accent"
                >
                  <span className="block truncate text-sm text-fg">
                    {note.title}
                  </span>
                  <span className="block truncate text-xs text-muted">
                    {note.folder || "Workspace root"}
                  </span>
                </a>
              ) : (
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-fg">
                    {reference}
                  </span>
                  <span className="block text-xs text-red-400">
                    Missing note
                  </span>
                </span>
              )}
              {!note && notes.length > 0 && (
                <button
                  type="button"
                  className="notes-button min-h-7 px-2 py-0.5 text-xs"
                  aria-label={`Relink ${reference}`}
                  disabled={!linkable.length}
                  onClick={() => {
                    setRelinking(reference);
                    setPicking(true);
                  }}
                >
                  Relink
                </button>
              )}
              <button
                type="button"
                className="notes-icon-button"
                aria-label={`Remove relation to ${note?.title ?? reference}`}
                title="Remove relation"
                onClick={() =>
                  onChangeNotes(references.filter((item) => item !== reference))
                }
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>
          ))}
          {picking ? (
            <div className="flex gap-2">
              <select
                aria-label={
                  relinking ? `Note to relink ${relinking}` : "Note to link"
                }
                value={choice}
                onChange={(event) => setChoice(event.target.value)}
                className="notes-input min-w-0 flex-1"
              >
                <option value="">Choose a note…</option>
                {linkable.map((note) => (
                  <option key={note.id} value={note.stableId ?? note.id}>
                    {note.title} — {note.folder || "root"}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="notes-primary"
                disabled={!choice}
                onClick={() => {
                  onChangeNotes(
                    relinking
                      ? references.map((item) =>
                          item === relinking ? choice : item,
                        )
                      : [...references, choice],
                  );
                  setChoice("");
                  setPicking(false);
                  setRelinking(null);
                }}
              >
                {relinking ? "Relink" : "Link"}
              </button>
              <button
                type="button"
                className="notes-button"
                onClick={() => {
                  setPicking(false);
                  setRelinking(null);
                }}
              >
                Cancel
              </button>
            </div>
          ) : notes.length ? (
            <button
              type="button"
              className="notes-button w-full"
              onClick={() => setPicking(true)}
              disabled={!linkable.length}
            >
              <Plus size={16} aria-hidden="true" /> Link existing note
            </button>
          ) : (
            <p className="text-xs text-muted">
              Connect a workspace in{" "}
              <a className="underline" href="#notes">
                Notes
              </a>{" "}
              to link notes.
            </p>
          )}
        </div>
      ) : (
        <div
          id="links-panel-tasks"
          role="tabpanel"
          aria-labelledby="links-tab-tasks"
          className="space-y-2"
        >
          {linkedTasks.length === 0 && (
            <p className="text-sm text-muted">No related tasks.</p>
          )}
          {linkedTasks.map((task) => (
            <a
              key={task.id}
              href={`#tasks?task=${encodeURIComponent(task.id)}`}
              className="flex items-center gap-2 rounded-md border border-border p-2 hover:border-fg/30"
            >
              <ListTodo
                size={18}
                aria-hidden="true"
                className="shrink-0 text-muted"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-fg">
                  {task.title}
                </span>
                <span className="block text-xs text-muted">
                  Status: {task.status}
                </span>
              </span>
            </a>
          ))}
          <p className="text-xs text-muted">
            Link tasks to this bookmark from the{" "}
            <a className="underline" href="#tasks">
              Tasks
            </a>{" "}
            page.
          </p>
        </div>
      )}
    </section>
  );
}
