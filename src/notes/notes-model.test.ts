// Pure behavior coverage for note selection/filtering and safe Markdown.
import { afterEach, describe, it, expect } from "vitest";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { vi } from "vitest";
import { visibleNotes, fileTitle } from "./notes-model";
import {
  MarkdownPreview,
  renderSafeMarkdown,
  resolveNoteLink,
} from "./markdown-preview";
import { demoIndex } from "./notes-demo";
afterEach(() => vi.unstubAllGlobals());
describe("Notes layout data", () => {
  it("filters direct folder contents and matches note bodies", () => {
    expect(
      visibleNotes(demoIndex.notes, "folder", "Work", "", [], [], "name"),
    ).toHaveLength(0);
    expect(
      visibleNotes(
        demoIndex.notes,
        "all",
        "",
        "recovery procedures",
        [],
        [],
        "name",
      ).map((note) => note.id),
    ).toEqual(["Work/Infrastructure/Lab/Network planning.md"]);
  });
  it("uses filenames without changing the legacy note identity", () => {
    expect(
      fileTitle({ ...demoIndex.notes[0]!, title: "Different heading" }),
    ).toBe("Lab setup guide");
  });
  it("orders only session-opened notes in the Recent view", () => {
    const ids = [demoIndex.notes[2]!.id, demoIndex.notes[0]!.id];
    expect(
      visibleNotes(demoIndex.notes, "recent", "", "", ids, [], "modified").map(
        (note) => note.id,
      ),
    ).toEqual(ids);
  });
});
describe("safe Markdown preview", () => {
  it("removes scripts, event handlers, executable links and remote images", () => {
    const html = renderSafeMarkdown(
      '<script>alert(1)</script>\n\n<a href="javascript:alert(1)" onclick="alert(1)">bad</a>\n\n![remote](https://example.com/a.png)\n\n<iframe src="https://example.com"></iframe>',
    );
    expect(html).not.toMatch(/<script|onclick|javascript:|<img|<iframe/i);
    expect(html).toContain("[Image:");
  });
  it("keeps ordinary Markdown and protects outbound links", () => {
    const html = renderSafeMarkdown(
      "# Hello\n\n**Bold** [site](https://example.com)",
    );
    expect(html).toContain("<h1>Hello</h1>");
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain("<strong>Bold</strong>");
  });
  it("detects prose per block, keeps code LTR and strips source direction", () => {
    const html = renderSafeMarkdown(
      '<p dir="rtl">English</p>\n\nשלום עולם\n\n```text\nconst name = "שלום";\n```',
      "auto",
    );
    expect(html).toContain('<p dir="auto">English</p>');
    expect(html).toContain('<p dir="auto">שלום עולם</p>');
    expect(html).toContain('<pre dir="ltr">');
    expect(html).not.toContain('<p dir="rtl">');
  });
  it("applies manual RTL to prose and retains LTR for code", () => {
    const html = renderToStaticMarkup(
      createElement(MarkdownPreview, {
        content:
          "# שלום\n\nEnglish text\n\n- פריט\n\n> ציטוט\n\n```js\nconst value = 1;\n```",
        folder: "",
        direction: "rtl",
        onOpenNote: () => {},
      }),
    );
    expect(html).toContain('<article dir="rtl"');
    expect(html).toContain('<h1 dir="rtl">שלום</h1>');
    expect(html).toContain('<p dir="rtl">English text</p>');
    expect(html).toContain('<ul dir="rtl">');
    expect(html).toContain('<blockquote dir="rtl">');
    expect(html).toContain('<pre dir="ltr">');
  });
  it("adds a trusted copy control only to code blocks", () => {
    const html = renderToStaticMarkup(
      createElement(MarkdownPreview, {
        content:
          '```js\nconst text = "hello";\n```\n\n<script>alert(1)</script>',
        folder: "",
        direction: "auto",
        onOpenNote: vi.fn(),
      }),
    );
    const template = document.createElement("template");
    template.innerHTML = html;
    expect(
      template.content.querySelectorAll("pre button[data-copy-code]"),
    ).toHaveLength(1);
    expect(
      template.content.querySelector("pre button")?.getAttribute("aria-label"),
    ).toBe("Copy code");
    expect(template.content.querySelector("pre code")?.textContent).toBe(
      'const text = "hello";\n',
    );
    expect(template.content.querySelector("script")).toBeNull();
  });
  it("copies only code text and reports clipboard failures", async () => {
    const writeText = vi
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("Denied"))
      .mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    const onCopyResult = vi.fn();
    const container = document.createElement("div");
    const root = createRoot(container);
    await act(async () => {
      root.render(
        createElement(MarkdownPreview, {
          content: "```js\nconst copied = true;\n```",
          folder: "",
          direction: "auto",
          onOpenNote: vi.fn(),
          onCopyResult,
        }),
      );
    });
    const button = container.querySelector<HTMLButtonElement>(
      "button[data-copy-code]",
    );
    expect(button?.querySelector("svg")).not.toBeNull();
    await act(async () => {
      button?.click();
    });
    expect(writeText).toHaveBeenCalledWith("const copied = true;\n");
    expect(onCopyResult).toHaveBeenCalledWith(true);
    await act(async () => {
      button?.click();
    });
    expect(onCopyResult).toHaveBeenLastCalledWith(false);
    await act(async () => {
      root.render(
        createElement(MarkdownPreview, {
          content: "```text\nnew code\n```",
          folder: "",
          direction: "auto",
          onOpenNote: vi.fn(),
          onCopyResult,
        }),
      );
    });
    const updatedButton = container.querySelector<HTMLButtonElement>(
      "button[data-copy-code]",
    );
    expect(updatedButton?.querySelector("svg")).not.toBeNull();
    await act(async () => {
      updatedButton?.click();
    });
    expect(writeText).toHaveBeenLastCalledWith("new code\n");
    act(() => root.unmount());
  });
  it("still opens workspace-relative note links", async () => {
    const onOpenNote = vi.fn();
    const container = document.createElement("div");
    const root = createRoot(container);
    await act(async () => {
      root.render(
        createElement(MarkdownPreview, {
          content: "[Next](../Next.md)",
          folder: "Work/Lab",
          direction: "auto",
          onOpenNote,
        }),
      );
    });
    act(() => {
      container
        .querySelector("a[data-note-path]")
        ?.dispatchEvent(
          new MouseEvent("click", { bubbles: true, cancelable: true }),
        );
    });
    expect(onOpenNote).toHaveBeenCalledWith("Work/Next.md");
    act(() => root.unmount());
  });
  it("resolves local note links without escaping the workspace", () => {
    expect(resolveNoteLink("Work/Lab", "../Notes.md")).toBe("Work/Notes.md");
    expect(resolveNoteLink("", "../outside.md")).toBeNull();
  });
});
