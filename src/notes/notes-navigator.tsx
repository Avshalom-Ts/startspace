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
  onRenameFolder: (id: string) => void;
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
  const treeRef = useRef<HTMLDivElement>(null);
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
                {item.count}
              </span>
            </button>
          );
        })}
      </div>
      <div
        ref={treeRef}
        role="tree"
        aria-label="Workspace folders"
        className="app-scrollbar min-h-0 flex-1 overflow-auto border-t border-border px-4 py-4"
      >
        <div className="flex items-center">
          <button
            role="treeitem"
            aria-level={1}
            data-folder-treeitem
            data-folder-id=""
            className={
              "notes-nav-row min-w-0 flex-1 " +
              (props.view === "folder" && !props.folder ? "notes-selected" : "")
            }
            onClick={() => props.onFolder("")}
            onKeyDown={(event) =>
              handleTreeKey(event, treeRef, "", true, true, tree)
            }
          >
            <Folder size={20} className="text-accent" aria-hidden="true" />
            <span className="truncate">{props.index.root.name}</span>
          </button>
          <FolderActions {...props} id="" name={props.index.root.name} />
        </div>
        <FolderBranch {...tree} parent="" treeRef={treeRef} level={1} />
      </div>
      <div className="border-t border-border p-4">
        <p className="text-xs text-muted">
          {props.demo
            ? "Demo data · not saved"
            : "Notes stay in your workspace."}
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
          <>
            <button
              className="block w-full rounded p-2 text-left text-sm hover:bg-fg/10"
              onClick={(event) => {
                event.currentTarget.closest("details")?.removeAttribute("open");
                props.onRenameFolder(props.id);
              }}
            >
              Rename folder
            </button>
            <button
              className="block w-full rounded p-2 text-left text-sm hover:bg-fg/10"
              onClick={(event) => {
                event.currentTarget.closest("details")?.removeAttribute("open");
                props.onDeleteFolder(props.id);
              }}
            >
              Delete folder
            </button>
          </>
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
function FolderBranch(
  props: TreeProps & { parent: string; treeRef: React.RefObject<HTMLDivElement | null>; level: number },
) {
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
          treeRef={props.treeRef}
          level={props.level + 1}
        />
      ))}
    </ul>
  );
}
/** Expands a folder independently of selecting it as the list's creation context. */
function FolderRow(
  props: TreeProps & {
    id: string;
    name: string;
    treeRef: React.RefObject<HTMLDivElement | null>;
    level: number;
  },
) {
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
          role="treeitem"
          aria-level={props.level}
          data-folder-treeitem
          data-folder-id={props.id}
          className="flex min-h-10 min-w-0 flex-1 items-center gap-2 text-left text-sm"
          onClick={() => props.onFolder(props.id)}
          onKeyDown={(event) =>
            handleTreeKey(
              event,
              props.treeRef,
              props.id,
              hasChildren,
              expanded,
              props,
            )
          }
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
      {expanded && hasChildren && (
        <FolderBranch {...props} parent={props.id} level={props.level} />
      )}
    </li>
  );
}

/** Handles standard treeview arrows without taking focus away from folder actions. */
function handleTreeKey(
  event: React.KeyboardEvent<HTMLButtonElement>,
  treeRef: React.RefObject<HTMLDivElement | null>,
  id: string,
  hasChildren: boolean,
  expanded: boolean,
  props: Pick<TreeProps, "setExpanded" | "onFolder">,
): void {
  const items = Array.from(
    treeRef.current?.querySelectorAll<HTMLButtonElement>(
      "button[data-folder-treeitem]",
    ) ?? [],
  );
  const current = items.indexOf(event.currentTarget);
  const focus = (index: number) => items[index]?.focus();
  const toggle = (open: boolean) =>
    props.setExpanded((current) => {
      const next = new Set(current);
      if (open) next.add(id);
      else next.delete(id);
      return next;
    });
  if (event.key === "ArrowDown") {
    event.preventDefault();
    focus(Math.min(current + 1, items.length - 1));
  } else if (event.key === "ArrowUp") {
    event.preventDefault();
    focus(Math.max(current - 1, 0));
  } else if (event.key === "Home") {
    event.preventDefault();
    focus(0);
  } else if (event.key === "End") {
    event.preventDefault();
    focus(items.length - 1);
  } else if (event.key === "ArrowRight" && hasChildren) {
    event.preventDefault();
    if (!expanded) {
      toggle(true);
      window.requestAnimationFrame(() => focus(current + 1));
    } else focus(current + 1);
  } else if (event.key === "ArrowLeft") {
    event.preventDefault();
    if (hasChildren && expanded) toggle(false);
    else {
      const parent = id.split("/").slice(0, -1).join("/");
      const parentIndex = items.findIndex(
        (item) => item.dataset.folderId === parent,
      );
      if (parentIndex >= 0) focus(parentIndex);
    }
  } else if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    props.onFolder(id);
  }
}
