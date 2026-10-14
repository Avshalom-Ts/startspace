// Safe Markdown rendering for workspace notes. Raw HTML and remote embeds are
// removed before a document is attached; no note code or remote images execute.
import {
  createElement,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Copy } from "lucide-react";
import { marked } from "marked";
import { imageMimeType, readWorkspaceImage } from "./notes-workspace";
import { isFetchableUrl } from "../links/description-fetch";

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

export interface ResolvedNoteLink {
  path: string;
  heading: string | null;
}

export interface MarkdownHeading {
  depth: number;
  text: string;
}

/** Normalizes heading text for matching a Markdown fragment without generated HTML IDs. */
export function normalizeHeading(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase();
}

/** Resolves an encoded workspace-relative Markdown link and its optional heading fragment. */
export function resolveMarkdownNoteLink(
  folder: string,
  source: string,
): ResolvedNoteLink | null {
  if (/^(?:[a-z][a-z\d+.-]*:|\/|\\)/i.test(source) || source.includes("\\"))
    return null;
  const hashIndex = source.indexOf("#");
  const rawPath = hashIndex < 0 ? source : source.slice(0, hashIndex);
  const rawHeading = hashIndex < 0 ? "" : source.slice(hashIndex + 1);
  if (!rawPath || rawPath.includes("?")) return null;
  try {
    const path = decodeURIComponent(rawPath);
    const heading = rawHeading ? decodeURIComponent(rawHeading) : null;
    if (!path.endsWith(".md") || /[\0?#]/.test(path) || /\0/.test(heading ?? ""))
      return null;
    const resolved = resolveNoteLink(folder, path);
    return resolved ? { path: resolved, heading } : null;
  } catch {
    return null;
  }
}

/** Allows only public HTTP(S) image URLs, preventing notes from requesting local network addresses. */
export function resolveRemoteImageUrl(source: string): string | null {
  return isFetchableUrl(source) ? source : null;
}

/** Detects public remote Markdown image references without rendering or requesting them. */
export function hasRemoteMarkdownImage(content: string): boolean {
  const visit = (tokens: unknown[]): boolean =>
    tokens.some((token) => {
      if (!token || typeof token !== "object") return false;
      const entry = token as { type?: unknown; href?: unknown; tokens?: unknown };
      if (
        entry.type === "image" &&
        typeof entry.href === "string" &&
        resolveRemoteImageUrl(entry.href)
      )
        return true;
      return Array.isArray(entry.tokens) && visit(entry.tokens);
    });
  return visit(marked.lexer(content) as unknown[]);
}

/** Extracts Markdown headings in document order for the Notes information table of contents. */
export function extractMarkdownHeadings(content: string): MarkdownHeading[] {
  const headings: MarkdownHeading[] = [];
  const visit = (tokens: unknown[]): void => {
    for (const token of tokens) {
      if (!token || typeof token !== "object") continue;
      const entry = token as {
        type?: unknown;
        depth?: unknown;
        text?: unknown;
        tokens?: unknown;
      };
      if (
        entry.type === "heading" &&
        typeof entry.depth === "number" &&
        typeof entry.text === "string"
      )
        headings.push({ depth: entry.depth, text: entry.text });
      if (Array.isArray(entry.tokens)) visit(entry.tokens);
    }
  };
  visit(marked.lexer(content) as unknown[]);
  return headings;
}

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

/** Displays a user-approved remote image without sending an extension referrer. */
function RemoteImage({
  source,
  alt,
  className,
}: {
  source: string;
  alt: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  return failed ? (
    <span className="text-muted" role="img" aria-label={alt || "Image unavailable"}>
      [Image: {alt || "unavailable"}]
    </span>
  ) : (
    <img
      src={source}
      alt={alt}
      className={className}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
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
  allowRemoteImages = false,
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
      } else if (
        allowRemoteImages &&
        resolveRemoteImageUrl(element.getAttribute("src") ?? "")
      ) {
        const alt = element.getAttribute("alt") ?? "";
        const source = resolveRemoteImageUrl(element.getAttribute("src") ?? "")!;
        for (const attr of Array.from(element.attributes))
          element.removeAttribute(attr.name);
        element.setAttribute("data-remote-image-url", source);
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
    if (/^H[1-6]$/.test(element.tagName))
      element.setAttribute(
        "data-note-heading",
        normalizeHeading(element.textContent ?? ""),
      );
    if (element.tagName === "A" && href) {
      if (/^https?:\/\//i.test(href)) {
        element.setAttribute("href", href);
        element.setAttribute("target", "_blank");
        element.setAttribute("rel", "noopener noreferrer");
      } else if (folder !== undefined && resolveMarkdownNoteLink(folder, href)) {
        const noteLink = resolveMarkdownNoteLink(folder, href)!;
        element.setAttribute("data-note-path", noteLink.path);
        if (noteLink.heading)
          element.setAttribute("data-note-heading-target", noteLink.heading);
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
  allowRemoteImages: boolean,
): ReactNode[] {
  const template = document.createElement("template");
  template.innerHTML = renderSafeMarkdown(
    content,
    direction,
    folder,
    allowRemoteImages,
  );
  const convert = (node: ChildNode, key: number): ReactNode => {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent;
    if (!(node instanceof Element)) return null;
    if (node.tagName === "IMG" && node.hasAttribute("data-image-path"))
      return createElement(LocalImage, {
        key,
        workspace,
        path: node.getAttribute("data-image-path") ?? "",
        alt: node.getAttribute("alt") ?? "",
        className: "notes-inline-image",
      });
    if (node.tagName === "IMG" && node.hasAttribute("data-remote-image-url"))
      return createElement(RemoteImage, {
        key,
        source: node.getAttribute("data-remote-image-url") ?? "",
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
  allowRemoteImages = false,
  headingTarget,
  onHeadingRevealed,
}: {
  content: string;
  folder: string;
  direction: NoteDirection;
  workspace?: FileSystemDirectoryHandle | null;
  onOpenNote: (id: string, heading?: string) => void;
  onCopyResult?: (success: boolean) => void;
  allowRemoteImages?: boolean;
  headingTarget?: string | null;
  onHeadingRevealed?: () => void;
}) {
  const articleRef = useRef<HTMLElement>(null);
  const nodes = useMemo(
    () =>
      renderPreviewNodes(
        content,
        direction,
        folder,
        workspace ?? null,
        allowRemoteImages,
      ),
    [content, direction, folder, workspace, allowRemoteImages],
  );
  useEffect(() => {
    if (!headingTarget) return;
    const heading = normalizeHeading(headingTarget);
    const target = Array.from(
      articleRef.current?.querySelectorAll<HTMLElement>("[data-note-heading]") ?? [],
    ).find((element) => element.dataset.noteHeading === heading);
    if (target) {
      target.scrollIntoView({ block: "start" });
      onHeadingRevealed?.();
    }
  }, [headingTarget, nodes, onHeadingRevealed]);
  return (
    <article
      ref={articleRef}
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
        const path = anchor.getAttribute("data-note-path");
        const heading = anchor.getAttribute("data-note-heading-target");
        if (path) {
          if (heading) onOpenNote(path, heading);
          else onOpenNote(path);
        }
      }}
    >
      {nodes}
    </article>
  );
}
