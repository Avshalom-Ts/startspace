// backup-format.ts
//
// Defines and validates StartSpace's portable, versioned JSON backup format.
// The module is browser-API-free so migrations and malformed-input handling can
// be tested without reading a real workspace or extension storage.

import type { Config } from "../hooks/useConfig";
import { parseBookmarkDocument, parseBookmarkMetadata } from "../links/bookmark-metadata-model";
import { DEFAULT_PREFERENCES } from "../hooks/useConfig";

export const BACKUP_KIND = "startspace-backup";
export const BACKUP_VERSION = 2;

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
  const workspace = value.currentWorkspace;
  if (
    (workspace !== null &&
      (!isRecord(workspace) ||
        typeof workspace.id !== "string" ||
        typeof workspace.name !== "string"))
  ) {
    throw new BackupValidationError("The backup contains invalid settings.");
  }
  const preferences: Config["preferences"] = {};
  if (value.preferences !== undefined) {
    if (!isRecord(value.preferences)) throw new BackupValidationError("The backup contains invalid preferences.");
    for (const key of Object.keys(DEFAULT_PREFERENCES) as (keyof typeof DEFAULT_PREFERENCES)[]) {
      if (value.preferences[key] !== undefined) {
        if (typeof value.preferences[key] !== "boolean")
          throw new BackupValidationError("The backup contains invalid preferences.");
        preferences[key] = value.preferences[key];
      }
    }
  }
  return {
    version: 1, currentWorkspace: workspace as Config["currentWorkspace"],
    ...(Object.keys(preferences).length ? { preferences } : {}),
  };
}

export function decodeBackupText(file: BackupFile): string {
  return new TextDecoder("utf-8", { fatal: true }).decode(
    Uint8Array.from(atob(file.content), (character) => character.charCodeAt(0)),
  );
}

function encodeText(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
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
  if (value.version !== 1 && value.version !== BACKUP_VERSION) {
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
      file.content.length % 4 !== 0 ||
      !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(file.content)
    ) {
      throw new BackupValidationError(
        `The backup contains an invalid workspace file at position ${index + 1}.`,
      );
    }
    return { path: file.path, encoding: "base64", content: file.content };
  });
  if (new Set(files.map((file) => file.path)).size !== files.length) {
    throw new BackupValidationError("The backup contains duplicate workspace paths.");
  }

  const extension = value.extension;
  const theme = extension.theme;
  if (theme !== null && theme !== "light" && theme !== "dark") {
    throw new BackupValidationError("The backup contains an invalid theme.");
  }
  const metadataPath = ".startspace/bookmark-metadata.json";
  try {
    if (value.version === 1) {
      const bookmarks = parseBookmarkMetadata(extension.bookmarkMetadata);
      const legacyTasks = files.find((file) => file.path === "tasks.json");
      if (legacyTasks) {
        if (files.some((file) => file.path === ".startspace/tasks.json"))
          throw new Error("Both legacy and current task files are present.");
        legacyTasks.path = ".startspace/tasks.json";
      }
      if (Object.keys(bookmarks).length) {
        if (files.some((file) => file.path === metadataPath))
          throw new Error("Both legacy and current bookmark metadata are present.");
        files.push({
          path: metadataPath, encoding: "base64",
          content: encodeText(JSON.stringify({ version: 1, bookmarks })),
        });
      }
    } else if ("bookmarkMetadata" in extension) {
      throw new Error("Version-two backups must store bookmark metadata only in workspace files.");
    }
    const metadata = files.find((file) => file.path === metadataPath);
    if (metadata) parseBookmarkDocument(JSON.parse(decodeBackupText(metadata)) as unknown);
    const tasks = files.find((file) => file.path === ".startspace/tasks.json");
    if (tasks) {
      const parsed: unknown = JSON.parse(decodeBackupText(tasks));
      if (!isRecord(parsed) || !Array.isArray(parsed.tasks) ||
        (parsed.version !== undefined && parsed.version !== 1))
        throw new Error("Invalid task document.");
    }
  } catch (error) {
    throw new BackupValidationError(error instanceof Error ? error.message : "Invalid workspace metadata in backup.");
  }

  return {
    kind: BACKUP_KIND,
    version: BACKUP_VERSION,
    createdAt: value.createdAt,
    appVersion: value.appVersion,
    extension: {
      config: parseConfig(extension.config),
      theme,
    },
    workspace: { name: value.workspace.name, files },
  };
}
