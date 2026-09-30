// Safe Markdown rendering for workspace notes. Raw HTML and remote embeds are
// removed before a document is attached; no note code or remote images execute.
import {
  createElement,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Copy } from "lucide-react";
import { marked } from "marked";
import { imageMimeType, readWorkspaceImage } from "./notes-workspace";

const allowed = new Set([
  "P",
  "BR",
  "HR",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "UL",
  "OL",
  "LI",
  "BLOCKQUOTE",
  "PRE",
  "CODE",
  "STRONG",
  "EM",
  "DEL",
  "A",
  "TABLE",
  "THEAD",
  "TBODY",
  "TR",
  "TH",
  "TD",
]);
export type NoteDirection = "auto" | "ltr" | "rtl";

/** Resolves an encoded Markdown image URL relative to its note, inside the workspace. */
export function resolveImagePath(
  folder: string,
  source: string,
): string | null {
  if (/^(?:[a-z][a-z\d+.-]*:|\/|\\)/i.test(source) || source.includes("\\"))
    return null;
  try {
    const path = decodeURIComponent(source.split(/[?#]/, 1)[0] ?? "");
    if (!path || /[?#\0]/.test(path)) return null;
    const resolved = resolveNoteLink(folder, path);
    return resolved &&
      imageMimeType(resolved) &&
      !resolved.split("/").some((part) => part.startsWith("."))
      ? resolved
      : null;
  } catch {
    return null;
  }
}

/** Loads an image only via the granted handle and revokes its object URL on replacement. */
export function LocalImage({
  workspace,
  path,
  alt,
  className,
}: {
  workspace: FileSystemDirectoryHandle | null;
  path: string;
  alt: string;
  className?: string;
}) {
  const [loaded, setLoaded] = useState<{
    workspace: FileSystemDirectoryHandle;
    path: string;
    url: string;
  } | null>(null);
  useEffect(() => {
    if (!workspace) return;
    let cancelled = false;
    let objectUrl: string | null = null;
    void readWorkspaceImage(workspace, path)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setLoaded({ workspace, path, url: objectUrl });
      })
      .catch(() => {
        if (!cancelled) setLoaded(null);
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [workspace, path]);
  const url =
    loaded?.workspace === workspace && loaded.path === path ? loaded.url : null;
  return url ? (
    <img src={url} alt={alt} className={className} />
  ) : (
    <span
      className="text-muted"
      role="img"
      aria-label={alt || "Image unavailable"}
    >
      [Image: {alt || "unavailable"}]
    </span>
  );
}
const directional = new Set([
  "P",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "UL",
  "OL",
  "LI",
  "BLOCKQUOTE",
  "TH",
  "TD",
]);
/** Renders Markdown through an inert template and allowlists elements/attributes. */
export function renderSafeMarkdown(
  content: string,
  direction?: NoteDirection,
  folder?: string,
): string {
  const template = document.createElement("template");
  template.innerHTML = marked.parse(content, { async: false }) as string;
  for (const element of Array.from(template.content.querySelectorAll("*"))) {
    if (element.tagName === "IMG") {
      const path =
        folder === undefined
          ? null
          : resolveImagePath(folder, element.getAttribute("src") ?? "");
      if (path) {
        const alt = element.getAttribute("alt") ?? "";
        for (const attr of Array.from(element.attributes))
          element.removeAttribute(attr.name);
        element.setAttribute("data-image-path", path);
        element.setAttribute("alt", alt);
      } else
        element.replaceWith(
          document.createTextNode(
            "[Image: " + (element.getAttribute("alt") || "unavailable") + "]",
          ),
        );
      continue;
    }
    if (!allowed.has(element.tagName)) {
      element.remove();
      continue;
    }
    const href = element.getAttribute("href");
    for (const attr of Array.from(element.attributes))
      element.removeAttribute(attr.name);
    if (element.tagName === "PRE") element.setAttribute("dir", "ltr");
    else if (direction && directional.has(element.tagName))
      element.setAttribute("dir", direction);
    if (element.tagName === "A" && href) {
      if (/^https?:\/\//i.test(href)) {
        element.setAttribute("href", href);
        element.setAttribute("target", "_blank");
        element.setAttribute("rel", "noopener noreferrer");
      } else if (
        !/[:\\]/.test(href) &&
        !href.startsWith("//") &&
        /\.md$/i.test(href)
      ) {
        element.setAttribute("data-note-path", href);
        element.setAttribute("href", "#");
      }
    }
  }
  return template.innerHTML;
}
/** Converts allowlisted Markdown into React nodes with a trusted copy control. */
function renderPreviewNodes(
  content: string,
  direction: NoteDirection,
  folder: string,
  workspace: FileSystemDirectoryHandle | null,
): ReactNode[] {
  const template = document.createElement("template");
  template.innerHTML = renderSafeMarkdown(content, direction, folder);
  const convert = (node: ChildNode, key: number): ReactNode => {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent;
    if (!(node instanceof Element)) return null;
    if (node.tagName === "IMG")
      return createElement(LocalImage, {
        key,
        workspace,
        path: node.getAttribute("data-image-path") ?? "",
        alt: node.getAttribute("alt") ?? "",
        className: "notes-inline-image",
      });
    const props: Record<string, string | number> = { key };
    for (const attribute of Array.from(node.attributes))
      props[attribute.name] = attribute.value;
    const children = Array.from(node.childNodes).map(convert);
    if (node.tagName === "PRE" && node.querySelector("code")) {
      return createElement(
        "pre",
        props,
        createElement(
          "button",
          {
            type: "button",
            className: "notes-copy-code",
            "data-copy-code": "",
            "aria-label": "Copy code",
            title: "Copy code",
          },
          createElement(Copy, { size: 16, "aria-hidden": true }),
        ),
        ...children,
      );
    }
    return createElement(node.tagName.toLowerCase(), props, ...children);
  };
  return Array.from(template.content.childNodes).map(convert);
}
/** Resolves a relative Markdown path while refusing to escape the workspace. */
export function resolveNoteLink(folder: string, href: string): string | null {
  const segments = folder.split("/").filter(Boolean);
  for (const part of href.split("/")) {
    if (part === "..") {
      if (!segments.length) return null;
      segments.pop();
    } else if (part && part !== ".") segments.push(part);
  }
  return segments.join("/");
}
/** Displays safe prose and handles workspace-relative note links locally. */
export function MarkdownPreview({
  content,
  folder,
  direction,
  workspace,
  onOpenNote,
  onCopyResult,
}: {
  content: string;
  folder: string;
  direction: NoteDirection;
  workspace?: FileSystemDirectoryHandle | null;
  onOpenNote: (id: string) => void;
  onCopyResult?: (success: boolean) => void;
}) {
  const nodes = useMemo(
    () => renderPreviewNodes(content, direction, folder, workspace ?? null),
    [content, direction, folder, workspace],
  );
  return (
    <article
      dir={direction}
      className="notes-prose max-w-none p-6"
      onClick={(event) => {
        const copyButton = (
          event.target as HTMLElement
        ).closest<HTMLButtonElement>("button[data-copy-code]");
        if (copyButton) {
          const code = copyButton.closest("pre")?.querySelector("code");
          if (code) {
            void (async () => {
              try {
                await navigator.clipboard.writeText(code.textContent ?? "");
                onCopyResult?.(true);
              } catch {
                onCopyResult?.(false);
              }
            })();
          }
          return;
        }
        const anchor = (event.target as HTMLElement).closest(
          "a[data-note-path]",
        );
        if (!anchor) return;
        event.preventDefault();
        const path = resolveNoteLink(
          folder,
          anchor.getAttribute("data-note-path") ?? "",
        );
        if (path) onOpenNote(path);
      }}
    >
      {nodes}
    </article>
  );
}
