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
        webSearchEngine: {
          name: "Google",
          urlTemplate: "https://www.google.com/search?q={query}",
        },
        currentWorkspace: { id: "ws-fixture", name: "Fixture" },
      },
      bookmarkMetadata: {},
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
  it("accepts a complete version-one backup", () => {
    expect(parseBackupJson(JSON.stringify(backupFixture()))).toEqual(
      backupFixture(),
    );
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
    fixture.version = 2;
    expect(() => parseBackupJson(JSON.stringify(fixture))).toThrow(
      "version 2 backup is not supported",
    );
  });

  it("rejects malformed bookmark metadata before restoring files", () => {
    const fixture = backupFixture();
    fixture.extension.bookmarkMetadata = {
      synthetic: { favorites: true } as never,
    };
    expect(() => parseBackupJson(JSON.stringify(fixture))).toThrow(
      "invalid bookmark metadata",
    );
  });
});
