// Checks versioned Notes metadata and rejects malformed workspace sidecars.
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import {
  changeNotePreferences,
  parseNoteMetadata,
  readNoteMetadata,
  updateNoteMetadata,
} from "./note-metadata";
import { useNotePreferences } from "./use-note-preferences";

const noteId = "note-00000000-0000-4000-8000-000000000001";

describe("note metadata", () => {
  it("preserves independent favorites, tags and last-opened time by stable ID", () => {
    const empty = { version: 1 as const, notes: {} };
    const changed = changeNotePreferences(empty, noteId, (current) => ({
      ...current,
      favorite: true,
      tags: ["Work"],
      lastOpenedAt: "2026-09-30T12:00:00.000Z",
    }));
    expect(changed.notes[noteId]).toEqual({
      favorite: true,
      tags: ["Work"],
      lastOpenedAt: "2026-09-30T12:00:00.000Z",
    });
    expect(empty.notes).toEqual({});
  });

  it("rejects unknown versions, malformed tags and invalid dates", () => {
    const valid = { favorite: false, tags: [], lastOpenedAt: null };
    expect(() => parseNoteMetadata({ version: 2, notes: {} })).toThrow();
    expect(() =>
      parseNoteMetadata({
        version: 1,
        notes: { [noteId]: { ...valid, tags: ["x", "x"] } },
      }),
    ).toThrow();
    expect(() =>
      parseNoteMetadata({
        version: 1,
        notes: { [noteId]: { ...valid, lastOpenedAt: "not a date" } },
      }),
    ).toThrow();
  });
});

/** In-memory File System Access handle with an optional edit between reads. */
function metadataWorkspace() {
  let raw: string | null = null;
  let reads = 0;
  let externalChange: string | null = null;
  const directory = {
    getFileHandle: async (_name: string, options?: { create?: boolean }) => {
      if (raw === null) {
        if (!options?.create)
          throw new DOMException("Missing", "NotFoundError");
        raw = "";
      }
      return {
        getFile: async () => ({
          text: async () => {
            reads++;
            if (reads === 2 && externalChange !== null) raw = externalChange;
            return raw;
          },
        }),
        createWritable: async () => {
          let next = "";
          return {
            write: async (text: string) => {
              next = text;
            },
            close: async () => {
              raw = next;
            },
            abort: async () => undefined,
          };
        },
      };
    },
    removeEntry: async () => {
      raw = null;
    },
  };
  return {
    handle: {
      getDirectoryHandle: async (
        _name: string,
        options?: { create?: boolean },
      ) => {
        if (raw === null && !options?.create)
          throw new DOMException("Missing", "NotFoundError");
        return directory;
      },
    } as unknown as FileSystemDirectoryHandle,
    replace: (text: string) => {
      raw = text;
      reads = 0;
    },
    editOnSecondRead: (text: string) => {
      externalChange = text;
      reads = 0;
    },
    contents: () => raw,
  };
}

describe("workspace note preferences", () => {
  it("persists favorites and tags across reads without touching Markdown", async () => {
    const fixture = metadataWorkspace();
    await updateNoteMetadata(
      fixture.handle,
      "workspace-id",
      noteId,
      (current) => ({ ...current, favorite: true, tags: ["Projects"] }),
    );
    expect(
      (await readNoteMetadata(fixture.handle)).notes[noteId]?.tags,
    ).toEqual(["Projects"]);
  });

  it("rejects invalid metadata and an intervening external edit", async () => {
    const fixture = metadataWorkspace();
    fixture.replace("not json");
    await expect(
      updateNoteMetadata(fixture.handle, "workspace-id", noteId, (current) => ({
        ...current,
        favorite: true,
      })),
    ).rejects.toThrow();
    expect(fixture.contents()).toBe("not json");
    const empty = JSON.stringify({ version: 1, notes: {} });
    fixture.replace(empty);
    const outside = JSON.stringify({
      version: 1,
      notes: { [noteId]: { favorite: true, tags: [], lastOpenedAt: null } },
    });
    fixture.editOnSecondRead(outside);
    await expect(
      updateNoteMetadata(fixture.handle, "workspace-id", noteId, (current) => ({
        ...current,
        tags: ["Local"],
      })),
    ).rejects.toThrow("changed outside");
    expect(fixture.contents()).toBe(outside);
  });
});

describe("note preferences refresh", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("refreshes another tab and rejects malformed external edits", async () => {
    const channels: Array<{ name: string; onmessage: (() => void) | null }> =
      [];
    class Channel {
      onmessage: (() => void) | null = null;
      constructor(readonly name: string) {
        channels.push(this);
      }
      postMessage() {
        channels
          .filter((channel) => channel !== this && channel.name === this.name)
          .forEach((channel) => channel.onmessage?.());
      }
      close() {
        channels.splice(channels.indexOf(this), 1);
      }
    }
    vi.stubGlobal("BroadcastChannel", Channel);
    const fixture = metadataWorkspace();
    const first = createRoot(document.createElement("div"));
    const second = createRoot(document.createElement("div"));
    let writer: ReturnType<typeof useNotePreferences>;
    let reader: ReturnType<typeof useNotePreferences>;
    function Probe({ tab }: { tab: "writer" | "reader" }) {
      const value = useNotePreferences(
        fixture.handle,
        "workspace-id",
        "granted",
        false,
      );
      if (tab === "writer") writer = value;
      else reader = value;
      return null;
    }
    try {
      await act(async () => {
        first.render(createElement(Probe, { tab: "writer" }));
        second.render(createElement(Probe, { tab: "reader" }));
      });
      await act(async () => {
        expect(
          await writer!.update(noteId, (current) => ({
            ...current,
            favorite: true,
          })),
        ).toBe(true);
      });
      expect(reader!.document?.notes[noteId]?.favorite).toBe(true);
      fixture.replace("broken json");
      await act(async () => window.dispatchEvent(new Event("focus")));
      expect(reader!.document).toBeNull();
      expect(reader!.error).toBeTruthy();
      expect(
        await reader!.update(noteId, (current) => ({
          ...current,
          favorite: false,
        })),
      ).toBe(false);
      expect(fixture.contents()).toBe("broken json");
    } finally {
      await act(async () => {
        first.unmount();
        second.unmount();
      });
    }
  });
});
