// Tests that note reads cannot replace a newer selection, even when the path
// is reopened, and that a missing remembered note stays in the empty state.
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { NoteEntry } from "../types/notes";
import type { useWorkspace } from "../hooks/useWorkspace";
import { useNotes } from "./use-notes";
import { NoteWorkspaceError, readNote, scanWorkspace } from "./notes-workspace";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

vi.mock("./notes-workspace", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./notes-workspace")>()),
  readNote: vi.fn(),
  scanWorkspace: vi.fn(),
}));

const handle = { name: "Workspace" } as FileSystemDirectoryHandle;
const grant = {
  grant: { handle, id: "ws-test", name: "Workspace", permission: "granted" },
} as ReturnType<typeof useWorkspace>;
const note: NoteEntry = {
  id: "note.md",
  folder: "",
  title: "Note",
  content: "new",
  modifiedAt: "2026-01-01T00:00:00Z",
};

describe("note selection", () => {
  afterEach(() => vi.restoreAllMocks());

  it("does not let an older read of the same note replace the latest content", async () => {
    vi.mocked(scanWorkspace).mockResolvedValue({
      root: { id: "", name: "Workspace", noteCount: 1 },
      folders: [],
      notes: [note],
    });
    let finishOld!: (value: NoteEntry) => void;
    vi.mocked(readNote)
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finishOld = resolve;
          }),
      )
      .mockResolvedValueOnce(note);
    const container = document.createElement("div");
    const root = createRoot(container);
    let notes!: ReturnType<typeof useNotes>;
    function Harness() {
      notes = useNotes(grant);
      return <div>{notes.selectedNote?.content}</div>;
    }
    await act(async () => {
      root.render(<Harness />);
    });
    let old!: ReturnType<typeof notes.selectNote>;
    await act(async () => {
      old = notes.selectNote("note.md");
    });
    await act(async () => {
      await notes.selectNote("note.md");
    });
    await act(async () => {
      finishOld({ ...note, content: "old" });
      await old;
    });
    expect(container.textContent).toBe("new");
    act(() => root.unmount());
  });

  it("leaves no selection or error banner for a missing remembered file", async () => {
    vi.mocked(scanWorkspace).mockResolvedValue({
      root: { id: "", name: "Workspace", noteCount: 0 },
      folders: [],
      notes: [],
    });
    vi.mocked(readNote).mockRejectedValueOnce(
      new NoteWorkspaceError("not-found", "Note not found"),
    );
    const container = document.createElement("div");
    const root = createRoot(container);
    let notes!: ReturnType<typeof useNotes>;
    function Harness() {
      notes = useNotes(grant);
      return null;
    }
    await act(async () => {
      root.render(<Harness />);
    });
    await act(async () => {
      await notes.selectNote("missing.md", true);
    });
    expect(notes.selectedNoteId).toBeNull();
    expect(notes.selectedNote).toBeNull();
    act(() => root.unmount());
  });
});
