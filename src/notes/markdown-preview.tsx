// Safe Markdown rendering for workspace notes. Raw HTML and remote embeds are
// removed before a document is attached; no note code or remote images execute.
import { createElement, useMemo, type ReactNode } from "react";
import { Copy } from "lucide-react";
import { marked } from "marked";

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
): string {
  const template = document.createElement("template");
  template.innerHTML = marked.parse(content, { async: false }) as string;
  for (const element of Array.from(template.content.querySelectorAll("*"))) {
    if (element.tagName === "IMG") {
      element.replaceWith(
        document.createTextNode(
          "[Image: " +
            (element.getAttribute("alt") || "loading not enabled") +
            "]",
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
): ReactNode[] {
  const template = document.createElement("template");
  template.innerHTML = renderSafeMarkdown(content, direction);
  const convert = (node: ChildNode, key: number): ReactNode => {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent;
    if (!(node instanceof Element)) return null;
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
  onOpenNote,
  onCopyResult,
}: {
  content: string;
  folder: string;
  direction: NoteDirection;
  onOpenNote: (id: string) => void;
  onCopyResult?: (success: boolean) => void;
}) {
  const nodes = useMemo(
    () => renderPreviewNodes(content, direction),
    [content, direction],
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
