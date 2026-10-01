// links-dialogs.tsx
//
// Bookmark create/edit/move and delete dialogs for the Links page. Browser
// fields are written only through the callbacks supplied by the page.

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Circle, CircleCheck, X } from "lucide-react";
import { collectBookmarkNodeIds } from "../bookmarks/bookmark-tree";
import { isSafeLinkUrl } from "./links-view";
import type { BookmarkNode } from "../hooks/useBookmarks";

export type EditorState = {
  mode: "create-link" | "create-folder" | "edit";
  node?: BookmarkNode;
  parentId?: string;
};

export interface EditorValues {
  title: string;
  url?: string;
  parentId: string;
}

/** Modal form shared by create, rename, URL edit, and move operations. */
export function BookmarkEditor({
  editor,
  folderTree,
  busy,
  missing = false,
  onSave,
  onRequestDelete,
  onClose,
}: {
  editor: EditorState;
  folderTree: BookmarkNode[];
  busy: boolean;
  /** The edited node no longer exists in the browser. */
  missing?: boolean;
  onSave: (values: EditorValues) => Promise<void>;
  onRequestDelete?: () => void;
  onClose: () => void;
}) {
  const node = editor.node;
  const isLink = editor.mode === "create-link" || Boolean(node?.url);
  const [title, setTitle] = useState(node?.title ?? "");
  const [url, setUrl] = useState(node?.url ?? "");
  const [parentId, setParentId] = useState(
    node?.parentId ?? editor.parentId ?? "",
  );
  const [validation, setValidation] = useState<string | null>(null);
  const excludedIds = new Set(
    node && !node.url ? collectBookmarkNodeIds(node) : [],
  );
  const titleText =
    editor.mode === "create-link"
      ? "New bookmark"
      : editor.mode === "create-folder"
        ? "New folder"
        : `Edit ${isLink ? "bookmark" : "folder"}`;

  /** Validates and submits values to the browser-backed mutation callback. */
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (missing) return;
    if (!title.trim()) {
      setValidation("Enter a name.");
      return;
    }
    if (!parentId) {
      setValidation("Choose a destination folder.");
      return;
    }
    if (isLink && !isSafeLinkUrl(url.trim())) {
      setValidation(
        "Enter a valid http, https, ftp or file URL, including its protocol.",
      );
      return;
    }
    setValidation(null);
    try {
      await onSave({
        title: title.trim(),
        url: isLink ? url.trim() : undefined,
        parentId,
      });
    } catch {
      /* page reports the browser error and keeps the form open */
    }
  }

  return (
    <Modal title={titleText} onClose={onClose}>
      <form onSubmit={(event) => void submit(event)} className="space-y-4">
        <label className="block text-sm text-fg">
          Name
          <input
            autoFocus
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="notes-input mt-1"
          />
        </label>
        {isLink && (
          <label className="block text-sm text-fg">
            URL
            <input
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://example.com"
              className="notes-input mt-1"
            />
          </label>
        )}
        <fieldset>
          <legend className="text-sm text-fg">Folder</legend>
          <FolderTreePicker
            tree={folderTree}
            selectedId={parentId}
            excludedIds={excludedIds}
            onSelect={setParentId}
          />
        </fieldset>
        {missing && (
          <p role="alert" className="text-sm text-red-400">
            This {isLink ? "bookmark" : "folder"} was deleted outside
            StartSpace. Your edits are kept here but cannot be saved; copy them
            or cancel. StartSpace will not recreate it automatically.
          </p>
        )}
        {validation && (
          <p role="alert" className="text-sm text-red-400">
            {validation}
          </p>
        )}
        <div className="flex items-center justify-between gap-3">
          <div>
            {onRequestDelete && !missing && (
              <button
                type="button"
                onClick={onRequestDelete}
                className="text-sm text-red-400 hover:underline"
              >
                Delete
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="notes-button">
              Cancel
            </button>
            <button disabled={busy || missing} className="notes-primary">
              {busy ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

/** Displays the real bookmark hierarchy and selects one destination folder. */
function FolderTreePicker({
  tree,
  selectedId,
  excludedIds,
  onSelect,
}: {
  tree: BookmarkNode[];
  selectedId: string;
  excludedIds: Set<string>;
  onSelect: (id: string) => void;
}) {
  return (
    <div
      className="app-scrollbar mt-1 max-h-56 overflow-y-auto rounded-md border border-border bg-page p-2"
      role="tree"
      aria-label="Destination folder"
    >
      <FolderTreeLevel
        nodes={tree}
        selectedId={selectedId}
        excludedIds={excludedIds}
        onSelect={onSelect}
        root
      />
    </div>
  );
}

/** Recursively renders one nesting level of destination folders. */
function FolderTreeLevel({
  nodes,
  selectedId,
  excludedIds,
  onSelect,
  root = false,
}: {
  nodes: BookmarkNode[];
  selectedId: string;
  excludedIds: Set<string>;
  onSelect: (id: string) => void;
  root?: boolean;
}) {
  const folders = nodes.filter(
    (node) => !node.url && !excludedIds.has(node.id),
  );
  if (!folders.length)
    return root ? (
      <p className="px-2 py-1 text-sm text-muted">
        No destination folders available.
      </p>
    ) : null;
  return (
    <ul
      className={
        root ? "space-y-0.5" : "ml-3 space-y-0.5 border-l border-border pl-2"
      }
      role="group"
    >
      {folders.map((folder) => {
        const selected = folder.id === selectedId;
        return (
          <li key={folder.id} role="treeitem" aria-selected={selected}>
            <button
              type="button"
              onClick={() => onSelect(folder.id)}
              className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm ${selected ? "bg-accent text-accent-foreground" : "text-fg hover:bg-surface"}`}
            >
              {selected ? (
                <CircleCheck size={16} aria-hidden="true" />
              ) : (
                <Circle size={16} aria-hidden="true" />
              )}
              <span className="truncate">
                {folder.title || "Browser bookmarks"}
              </span>
            </button>
            <FolderTreeLevel
              nodes={folder.children ?? []}
              selectedId={selectedId}
              excludedIds={excludedIds}
              onSelect={onSelect}
            />
          </li>
        );
      })}
    </ul>
  );
}

/** Confirms destructive bookmark deletion or recursive folder deletion. */
export function DeleteDialog({
  node,
  busy,
  onConfirm,
  onClose,
}: {
  node: BookmarkNode;
  busy: boolean;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}) {
  const descendantCount = collectBookmarkNodeIds(node).length - 1;
  return (
    <Modal
      title={`Delete ${node.url ? "bookmark" : "folder"}?`}
      onClose={onClose}
    >
      <p className="text-sm text-muted">
        {node.url
          ? `“${node.title}” — this removes the bookmark from your browser.`
          : `“${node.title}” and its ${descendantCount} descendant${descendantCount === 1 ? "" : "s"} will be removed from your browser bookmarks.`}
      </p>
      <div className="mt-5 flex justify-end gap-2">
        <button autoFocus onClick={onClose} className="notes-button">
          Cancel
        </button>
        <button
          disabled={busy}
          onClick={() => void onConfirm().catch(() => undefined)}
          className="inline-flex min-h-9 items-center rounded-md bg-red-600 px-3 py-1.5 text-sm text-white disabled:opacity-50"
        >
          {busy ? "Deleting…" : "Delete"}
        </button>
      </div>
    </Modal>
  );
}

/** Accessible overlay shell for bookmark management dialogs. */
function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="bookmark-dialog-title"
        className="w-full max-w-md rounded-lg border border-border bg-surface p-5 shadow-xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2
            id="bookmark-dialog-title"
            className="text-lg font-medium text-fg"
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            title="Close dialog"
            className="notes-icon-button"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
