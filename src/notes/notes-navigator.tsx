// Filesystem folder navigation for Notes. Disclosure buttons and selectable folder
// buttons are separate, keyboard-native controls; no synthetic folder database.
import { useEffect, useRef, useState } from "react";
import {
  ChevronRight,
  Clock3,
  Ellipsis,
  FileText,
  Folder,
  Star,
  X,
} from "lucide-react";
import type { NotesIndex } from "../types/notes";
import type { NotesView } from "./notes-model";

type Props = {
  index: NotesIndex;
  view: NotesView;
  folder: string;
  activeFolder: string;
  workspace: FileSystemDirectoryHandle | null;
  recentCount: number;
  favoritesCount: number;
  demo: boolean;
  onView: (view: NotesView) => void;
  onFolder: (id: string) => void;
  onCreate: (kind: "note" | "folder", parent: string) => void;
  onDeleteFolder: (id: string) => void;
  onClose: () => void;
};
/** Returns the directory IDs needed to reveal a note's containing folder. */
function folderAncestors(folder: string): string[] {
  return folder
    .split("/")
    .filter(Boolean)
    .map((_, index, parts) => parts.slice(0, index + 1).join("/"));
}
/** Displays smart views and actual folder hierarchy with recursive note counts. */
export function NotesNavigator(props: Props) {
  const [expanded, setExpanded] = useState(
    () => new Set(folderAncestors(props.activeFolder)),
  );
  const workspaceRef = useRef(props.workspace);
  useEffect(() => {
    if (workspaceRef.current !== props.workspace) {
      workspaceRef.current = props.workspace;
      setExpanded(new Set());
    } else {
      setExpanded(
        (current) =>
          new Set([...current, ...folderAncestors(props.activeFolder)]),
      );
    }
  }, [props.activeFolder, props.workspace]);
  const tree = { ...props, expanded, setExpanded };
  return (
    <aside aria-label="Note folders" className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between px-5 py-4">
        <h2 className="text-lg font-semibold">Notes</h2>
        <div className="flex">
          <button
            className="notes-icon-button min-[1280px]:hidden"
            aria-label="Close folders"
            title="Close folders"
            onClick={props.onClose}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className="space-y-1 px-4 pb-5">
        {(
          [
            {
              id: "all",
              label: "All Notes",
              icon: FileText,
              count: props.index.notes.length,
            },
            {
              id: "favorites",
              label: "Favorites",
              icon: Star,
              count: props.favoritesCount,
            },
            {
              id: "recent",
              label: "Recent",
              icon: Clock3,
              count: props.recentCount,
            },
          ] as const
        ).map((item) => {
          const ViewIcon = item.icon;
          return (
            <button
              key={item.id}
              disabled={item.id === "favorites" && !props.demo}
              title={
                item.id === "favorites" && !props.demo
                  ? "Persistent note favorites are planned."
                  : undefined
              }
              className={
                "notes-nav-row " +
                (props.view === item.id ? "notes-selected" : "")
              }
              onClick={() => props.onView(item.id)}
            >
              <ViewIcon
                size={20}
                className="shrink-0 text-accent"
                aria-hidden="true"
              />
              <span className="flex-1 text-left">{item.label}</span>
              <span className="rounded bg-fg/5 px-1.5 text-xs text-muted">
                {item.id === "favorites" && !props.demo ? "Soon" : item.count}
              </span>
            </button>
          );
        })}
      </div>
      <div className="app-scrollbar min-h-0 flex-1 overflow-auto border-t border-border px-4 py-4">
        <div className="flex items-center">
          <button
            className={
              "notes-nav-row min-w-0 flex-1 " +
              (props.view === "folder" && !props.folder ? "notes-selected" : "")
            }
            onClick={() => props.onFolder("")}
          >
            <Folder size={20} className="text-accent" aria-hidden="true" />
            <span className="truncate">{props.index.root.name}</span>
          </button>
          <FolderActions {...props} id="" name={props.index.root.name} />
        </div>
        <FolderBranch {...tree} parent="" />
      </div>
      <div className="border-t border-border p-4">
        <p className="text-xs text-muted">
          {props.demo
            ? "Demo data · not saved"
            : "Recent shows notes opened this session."}
        </p>
      </div>
    </aside>
  );
}
/** Offers actions scoped to this directory, including the workspace root. */
function FolderActions(props: Props & { id: string; name: string }) {
  return (
    <details className="relative shrink-0">
      <summary
        className="notes-icon-button cursor-pointer list-none"
        aria-label={`Actions for ${props.name}`}
        title={`Actions for ${props.name}`}
      >
        <Ellipsis size={20} aria-hidden="true" />
      </summary>
      <div className="absolute right-0 z-30 mt-1 w-40 rounded border border-border bg-surface p-1 shadow-xl">
        {(["note", "folder"] as const).map((kind) => (
          <button
            key={kind}
            className="block w-full rounded p-2 text-left text-sm hover:bg-fg/10"
            onClick={(event) => {
              event.currentTarget.closest("details")?.removeAttribute("open");
              props.onCreate(kind, props.id);
            }}
          >
            New {kind}
          </button>
        ))}
        {props.id && (
          <button
            className="block w-full rounded p-2 text-left text-sm hover:bg-fg/10"
            onClick={(event) => {
              event.currentTarget.closest("details")?.removeAttribute("open");
              props.onDeleteFolder(props.id);
            }}
          >
            Delete folder
          </button>
        )}
      </div>
    </details>
  );
}
/** Recursively renders each real directory with native disclosure semantics. */
type TreeProps = Props & {
  expanded: Set<string>;
  setExpanded: React.Dispatch<React.SetStateAction<Set<string>>>;
};
function FolderBranch(props: TreeProps & { parent: string }) {
  const folders = props.index.folders.filter(
    (folder) => folder.id.split("/").slice(0, -1).join("/") === props.parent,
  );
  return (
    <ul className={props.parent ? "ml-3 border-l border-border pl-2" : ""}>
      {folders.map((folder) => (
        <FolderRow
          key={folder.id}
          {...props}
          id={folder.id}
          name={folder.name}
        />
      ))}
    </ul>
  );
}
/** Expands a folder independently of selecting it as the list's creation context. */
function FolderRow(props: TreeProps & { id: string; name: string }) {
  const expanded = props.expanded.has(props.id);
  const hasChildren = props.index.folders.some((folder) =>
    folder.id.startsWith(props.id + "/"),
  );
  const count = props.index.notes.filter((note) =>
    note.id.startsWith(props.id + "/"),
  ).length;
  return (
    <li>
      <div
        className={
          "flex items-center rounded-md " +
          (props.view === "folder" && props.folder === props.id
            ? "notes-selected"
            : "")
        }
      >
        <button
          disabled={!hasChildren}
          className="notes-icon-button w-7! shrink-0"
          aria-label={(expanded ? "Collapse " : "Expand ") + props.name}
          title={(expanded ? "Collapse " : "Expand ") + props.name}
          aria-expanded={hasChildren ? expanded : undefined}
          onClick={() =>
            props.setExpanded((current) => {
              const next = new Set(current);
              if (expanded) next.delete(props.id);
              else next.add(props.id);
              return next;
            })
          }
        >
          <ChevronRight
            size={13}
            aria-hidden="true"
            className={
              hasChildren ? (expanded ? "rotate-90" : "") : "opacity-0"
            }
          />
        </button>
        <button
          className="flex min-h-10 min-w-0 flex-1 items-center gap-2 text-left text-sm"
          onClick={() => props.onFolder(props.id)}
          title={props.id}
        >
          <Folder
            size={20}
            className="shrink-0 text-accent"
            aria-hidden="true"
          />
          <span className="min-w-0 flex-1 truncate">{props.name}</span>
          <span className="mr-2 rounded bg-fg/5 px-1 text-xs text-muted">
            {count}
          </span>
        </button>
        <FolderActions {...props} />
      </div>
      {expanded && hasChildren && <FolderBranch {...props} parent={props.id} />}
    </li>
  );
}
