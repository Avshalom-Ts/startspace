// Pure behavior coverage for note selection/filtering and safe Markdown.
import { describe, it, expect } from "vitest";
import { visibleNotes, fileTitle } from "./notes-model";
import { renderSafeMarkdown, resolveNoteLink } from "./markdown-preview";
import { demoIndex } from "./notes-demo";
describe("Notes layout data", () => {
  it("filters direct folder contents and matches note bodies", () => {
    expect(visibleNotes(demoIndex.notes, "folder", "Work", "", [], [], "name")).toHaveLength(0);
    expect(visibleNotes(demoIndex.notes, "all", "", "recovery procedures", [], [], "name").map(note => note.id)).toEqual(["Work/Infrastructure/Lab/Network planning.md"]);
  });
  it("uses filenames without changing the legacy note identity", () => {
    expect(fileTitle({ ...demoIndex.notes[0]!, title: "Different heading" })).toBe("Lab setup guide");
  });
  it("orders only session-opened notes in the Recent view", () => {
    const ids = [demoIndex.notes[2]!.id, demoIndex.notes[0]!.id];
    expect(visibleNotes(demoIndex.notes, "recent", "", "", ids, [], "modified").map(note => note.id)).toEqual(ids);
  });
});
describe("safe Markdown preview", () => {
  it("removes scripts, event handlers, executable links and remote images", () => {
    const html = renderSafeMarkdown('<script>alert(1)</script>\n\n<a href="javascript:alert(1)" onclick="alert(1)">bad</a>\n\n![remote](https://example.com/a.png)\n\n<iframe src="https://example.com"></iframe>');
    expect(html).not.toMatch(/<script|onclick|javascript:|<img|<iframe/i);
    expect(html).toContain("[Image:");
  });
  it("keeps ordinary Markdown and protects outbound links", () => {
    const html = renderSafeMarkdown("# Hello\n\n**Bold** [site](https://example.com)");
    expect(html).toContain("<h1>Hello</h1>");
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain("<strong>Bold</strong>");
  });
  it("resolves local note links without escaping the workspace", () => {
    expect(resolveNoteLink("Work/Lab", "../Notes.md")).toBe("Work/Notes.md");
    expect(resolveNoteLink("", "../outside.md")).toBeNull();
  });
});
