// backup-format.ts
//
// Defines and validates StartSpace's portable, versioned JSON backup format.
// The module is browser-API-free so migrations and malformed-input handling can
// be tested without reading a real workspace or extension storage.

import type { Config } from "../hooks/useConfig";
import type { BookmarkMetadata } from "../hooks/useFavorites";

export const BACKUP_KIND = "startspace-backup";
export const BACKUP_VERSION = 1;

export interface BackupFile {
  path: string;
  encoding: "base64";
  content: string;
}

export interface StartSpaceBackup {
  kind: typeof BACKUP_KIND;
  version: typeof BACKUP_VERSION;
  createdAt: string;
  appVersion: string;
  extension: {
    config: Config;
    bookmarkMetadata: Record<string, BookmarkMetadata>;
    theme: "light" | "dark" | null;
  };
  workspace: {
    name: string;
    files: BackupFile[];
  };
}

export class BackupValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BackupValidationError";
  }
}

/** Returns whether a value is a plain record suitable for schema validation. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

/** Validates a relative workspace path and rejects traversal or empty segments. */
function isSafePath(path: string): boolean {
  return (
    path.length > 0 &&
    !path.startsWith("/") &&
    !path.includes("\\") &&
    path.split("/").every((part) => part && part !== "." && part !== "..")
  );
}

/** Validates and normalizes extension configuration from a backup. */
function parseConfig(value: unknown): Config {
  if (!isRecord(value) || value.version !== 1) {
    throw new BackupValidationError("The backup contains invalid settings.");
  }
  const engine = value.webSearchEngine;
  const workspace = value.currentWorkspace;
  if (
    !isRecord(engine) ||
    typeof engine.name !== "string" ||
    typeof engine.urlTemplate !== "string" ||
    !engine.urlTemplate.includes("{query}") ||
    (workspace !== null &&
      (!isRecord(workspace) ||
        typeof workspace.id !== "string" ||
        typeof workspace.name !== "string"))
  ) {
    throw new BackupValidationError("The backup contains invalid settings.");
  }
  return value as unknown as Config;
}

/** Validates bookmark-linked metadata without requiring referenced items to exist. */
function parseBookmarkMetadata(
  value: unknown,
): Record<string, BookmarkMetadata> {
  if (!isRecord(value)) {
    throw new BackupValidationError(
      "The backup contains invalid bookmark metadata.",
    );
  }
  for (const entry of Object.values(value)) {
    if (
      !isRecord(entry) ||
      typeof entry.favorites !== "boolean" ||
      !Array.isArray(entry.tags) ||
      !entry.tags.every((item) => typeof item === "string") ||
      typeof entry.dateAdded !== "string" ||
      !Array.isArray(entry.relatedNotes) ||
      !entry.relatedNotes.every((item) => typeof item === "string") ||
      !Array.isArray(entry.relatedTasks) ||
      !entry.relatedTasks.every((item) => typeof item === "string")
    ) {
      throw new BackupValidationError(
        "The backup contains invalid bookmark metadata.",
      );
    }
  }
  return value as Record<string, BookmarkMetadata>;
}

/** Parses a JSON backup, applies supported migrations, and rejects unsafe data. */
export function parseBackupJson(json: string): StartSpaceBackup {
  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch {
    throw new BackupValidationError("Choose a valid StartSpace JSON backup.");
  }
  if (!isRecord(value) || value.kind !== BACKUP_KIND) {
    throw new BackupValidationError("This file is not a StartSpace backup.");
  }
  if (value.version !== BACKUP_VERSION) {
    const description =
      typeof value.version === "number" ? `version ${value.version}` : "unknown version";
    throw new BackupValidationError(
      `This ${description} backup is not supported by this version of StartSpace.`,
    );
  }
  if (
    typeof value.createdAt !== "string" ||
    typeof value.appVersion !== "string" ||
    !isRecord(value.extension) ||
    !isRecord(value.workspace) ||
    typeof value.workspace.name !== "string" ||
    !Array.isArray(value.workspace.files)
  ) {
    throw new BackupValidationError("The backup is incomplete or malformed.");
  }

  const files = value.workspace.files.map((file, index): BackupFile => {
    if (
      !isRecord(file) ||
      typeof file.path !== "string" ||
      !isSafePath(file.path) ||
      file.encoding !== "base64" ||
      typeof file.content !== "string" ||
      !/^[A-Za-z0-9+/]*={0,2}$/.test(file.content)
    ) {
      throw new BackupValidationError(
        `The backup contains an invalid workspace file at position ${index + 1}.`,
      );
    }
    return file as unknown as BackupFile;
  });
  if (new Set(files.map((file) => file.path)).size !== files.length) {
    throw new BackupValidationError("The backup contains duplicate workspace paths.");
  }

  const extension = value.extension;
  const theme = extension.theme;
  if (theme !== null && theme !== "light" && theme !== "dark") {
    throw new BackupValidationError("The backup contains an invalid theme.");
  }

  return {
    kind: BACKUP_KIND,
    version: BACKUP_VERSION,
    createdAt: value.createdAt,
    appVersion: value.appVersion,
    extension: {
      config: parseConfig(extension.config),
      bookmarkMetadata: parseBookmarkMetadata(extension.bookmarkMetadata),
      theme,
    },
    workspace: { name: value.workspace.name, files },
  };
}
