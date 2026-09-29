// Safe Markdown rendering for workspace notes. Raw HTML and remote embeds are
// removed before a document is attached; no note code or remote images execute.
import { useMemo } from "react";
import { marked } from "marked";

const allowed = new Set(["P","BR","HR","H1","H2","H3","H4","H5","H6","UL","OL","LI","BLOCKQUOTE","PRE","CODE","STRONG","EM","DEL","A","TABLE","THEAD","TBODY","TR","TH","TD"]);
/** Renders Markdown through an inert template and allowlists elements/attributes. */
export function renderSafeMarkdown(content: string): string {
  const template = document.createElement("template");
  template.innerHTML = marked.parse(content, { async: false }) as string;
  for (const element of Array.from(template.content.querySelectorAll("*"))) {
    if (element.tagName === "IMG") {
      element.replaceWith(document.createTextNode("[Image: " + (element.getAttribute("alt") || "loading not enabled") + "]"));
      continue;
    }
    if (!allowed.has(element.tagName)) {
      element.remove();
      continue;
    }
    const href = element.getAttribute("href");
    for (const attr of Array.from(element.attributes)) element.removeAttribute(attr.name);
    if (element.tagName === "A" && href) {
      if (/^https?:\/\//i.test(href)) {
        element.setAttribute("href", href);
        element.setAttribute("target", "_blank");
        element.setAttribute("rel", "noopener noreferrer");
      } else if (!/[:\\]/.test(href) && !href.startsWith("//") && /\.md$/i.test(href)) {
        element.setAttribute("data-note-path", href);
        element.setAttribute("href", "#");
      }
    }
  }
  return template.innerHTML;
}
/** Resolves a relative Markdown path while refusing to escape the workspace. */
export function resolveNoteLink(folder: string, href: string): string | null {
  const segments = folder.split("/").filter(Boolean);
  for (const part of href.split("/")) {
    if (part === "..") { if (!segments.length) return null; segments.pop(); }
    else if (part && part !== ".") segments.push(part);
  }
  return segments.join("/");
}
/** Displays safe prose and handles workspace-relative note links locally. */
export function MarkdownPreview({ content, folder, onOpenNote }: { content: string; folder: string; onOpenNote: (id: string) => void }) {
  const html = useMemo(() => renderSafeMarkdown(content), [content]);
  return <article className="notes-prose max-w-none p-6" onClick={(event) => {
    const anchor = (event.target as HTMLElement).closest("a[data-note-path]");
    if (!anchor) return;
    event.preventDefault();
    const path = resolveNoteLink(folder, anchor.getAttribute("data-note-path") ?? "");
    if (path) onOpenNote(path);
  }} dangerouslySetInnerHTML={{ __html: html }} />;
}
