// backup-format.test.ts
//
// Covers portable backup schema validation and unsafe restore-path rejection.

import { describe, expect, it } from "vitest";
import {
  BACKUP_KIND,
  BACKUP_VERSION,
  BackupValidationError,
  parseBackupJson,
  type StartSpaceBackup,
} from "./backup-format";
import { parseNoteIdentities } from "../notes/note-identity";

/** Creates a minimal valid backup fixture containing only synthetic data. */
function backupFixture(): StartSpaceBackup {
  return {
    kind: BACKUP_KIND,
    version: BACKUP_VERSION,
    createdAt: "2026-09-02T10:00:00.000Z",
    appVersion: "0.1.0",
    extension: {
      config: {
        version: 1,
        currentWorkspace: { id: "ws-fixture", name: "Fixture" },
      },
      theme: "dark",
    },
    workspace: {
      name: "Fixture",
      files: [
        { path: "notes/example.md", encoding: "base64", content: "IyBUZXN0" },
      ],
    },
  };
}

describe("backup parsing", () => {
  it("accepts a complete version-two backup", () => {
    expect(parseBackupJson(JSON.stringify(backupFixture()))).toEqual(
      backupFixture(),
    );
  });

  it("retains portable note identities and stable bookmark links in a backup", () => {
    const fixture = backupFixture();
    const noteId = "note-00000000-0000-4000-8000-000000000001";
    fixture.workspace.files.push({
      path: ".startspace/note-identities.json",
      encoding: "base64",
      content: btoa(
        JSON.stringify({
          version: 1,
          notes: { [noteId]: "notes/example.md" },
          aliases: {},
        }),
      ),
    });
    const bookmarks = {
      synthetic: {
        favorites: false,
        tags: [],
        dateAdded: "",
        relatedNotes: [noteId],
        relatedTasks: [],
      },
    };
    fixture.workspace.files.push({
      path: ".startspace/bookmark-metadata.json", encoding: "base64",
      content: btoa(JSON.stringify({ version: 1, bookmarks })),
    });
    expect(parseBackupJson(JSON.stringify(fixture))).toEqual(fixture);
    expect(
      parseNoteIdentities(JSON.parse(atob(fixture.workspace.files[1]!.content)))
        .notes[noteId],
    ).toBe("notes/example.md");
  });

  it("rejects paths that could escape the selected workspace", () => {
    const fixture = backupFixture();
    fixture.workspace.files[0]!.path = "../outside.md";
    expect(() => parseBackupJson(JSON.stringify(fixture))).toThrow(
      BackupValidationError,
    );
  });

  it("rejects a backup created by an unsupported schema version", () => {
    const fixture = backupFixture() as unknown as Record<string, unknown>;
    fixture.version = 3;
    expect(() => parseBackupJson(JSON.stringify(fixture))).toThrow(
      "version 3 backup is not supported",
    );
  });

  it("rejects malformed bookmark metadata before restoring files", () => {
    const fixture = backupFixture();
    fixture.workspace.files.push({
      path: ".startspace/bookmark-metadata.json", encoding: "base64",
      content: btoa(JSON.stringify({ version: 1, bookmarks: { synthetic: { favorites: true } } })),
    });
    expect(() => parseBackupJson(JSON.stringify(fixture))).toThrow(
      "Invalid bookmark metadata",
    );
  });
});

it("discards legacy engine preferences when restoring a backup", () => {
  const backup = backupFixture();
  const legacy = {
    ...backup,
    extension: {
      ...backup.extension,
      config: {
        ...backup.extension.config,
        webSearchEngine: {
          name: "Old provider",
          urlTemplate: "https://example.com/{query}",
        },
      },
    },
  };
  expect(parseBackupJson(JSON.stringify(legacy)).extension.config).toEqual(
    backup.extension.config,
  );
});
