// backup-service.ts
//
// Creates and restores portable StartSpace backups using extension storage and
// the File System Access API. Workspace contents stay local and are only read or
// written after an explicit Settings action by the user.

import {
  BACKUP_KIND,
  BACKUP_VERSION,
  parseBackupJson,
  type BackupFile,
  type StartSpaceBackup,
} from "./backup-format";
import type { Config } from "../hooks/useConfig";
import type { BookmarkMetadata } from "../hooks/useFavorites";

const CONFIG_KEY = "startspace.config";
const METADATA_KEY = "startspace.bookmarkMetadata";
const THEME_KEY = "startspace.theme";

interface ExtensionStorage {
  get(
    keys: string[],
    callback: (result: Record<string, unknown>) => void,
  ): void;
  set(items: Record<string, unknown>, callback?: () => void): void;
}

export interface RestoreSummary {
  filesRestored: number;
  bookmarkMetadataEntries: number;
}

/** Encodes arbitrary file bytes without corrupting binary workspace files. */
function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}

/** Decodes a backup file payload into bytes suitable for createWritable(). */
function base64ToBytes(content: string): Uint8Array<ArrayBuffer> {
  const binary = atob(content);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

/** Recursively reads every file in a workspace into a portable backup list. */
async function readDirectoryFiles(
  directory: FileSystemDirectoryHandle,
  prefix = "",
): Promise<BackupFile[]> {
  const files: BackupFile[] = [];
  for await (const entry of directory.values()) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.kind === "directory") {
      files.push(...(await readDirectoryFiles(entry, path)));
    } else {
      const bytes = new Uint8Array(await (await entry.getFile()).arrayBuffer());
      files.push({ path, encoding: "base64", content: bytesToBase64(bytes) });
    }
  }
  return files.sort((left, right) => left.path.localeCompare(right.path));
}

/** Returns chrome.storage.local or throws an actionable availability error. */
function extensionStorage(): ExtensionStorage {
  const storage = (
    globalThis as { chrome?: { storage?: { local?: ExtensionStorage } } }
  ).chrome?.storage?.local;
  if (!storage) {
    throw new Error("Extension storage is unavailable in this browser.");
  }
  return storage;
}

/** Reads StartSpace-owned extension data without exporting browser bookmarks. */
function readExtensionData(): Promise<Record<string, unknown>> {
  const storage = extensionStorage();
  return new Promise((resolve) => {
    storage.get([CONFIG_KEY, METADATA_KEY], resolve);
  });
}

/** Replaces StartSpace-owned extension settings and metadata during restore. */
function writeExtensionData(
  backup: StartSpaceBackup,
  destinationConfig: Config,
): Promise<void> {
  const storage = extensionStorage();
  return new Promise((resolve) => {
    storage.set(
      {
        [CONFIG_KEY]: {
          ...backup.extension.config,
          currentWorkspace: destinationConfig.currentWorkspace ?? {
            id: `ws-${backup.workspace.name}`,
            name: backup.workspace.name,
          },
        },
        [METADATA_KEY]: backup.extension.bookmarkMetadata,
      },
      resolve,
    );
  });
}

/** Creates a version-one backup from the selected workspace and local settings. */
export async function createBackup(
  workspace: FileSystemDirectoryHandle,
  fallbackConfig: Config,
): Promise<StartSpaceBackup> {
  const stored = await readExtensionData();
  const config = (stored[CONFIG_KEY] as Config | undefined) ?? fallbackConfig;
  const bookmarkMetadata =
    (stored[METADATA_KEY] as Record<string, BookmarkMetadata> | undefined) ?? {};
  const theme = localStorage.getItem(THEME_KEY);
  return {
    kind: BACKUP_KIND,
    version: BACKUP_VERSION,
    createdAt: new Date().toISOString(),
    appVersion: __APP_VERSION__,
    extension: {
      config,
      bookmarkMetadata,
      theme: theme === "light" || theme === "dark" ? theme : null,
    },
    workspace: {
      name: workspace.name,
      files: await readDirectoryFiles(workspace),
    },
  };
}

/** Downloads a backup as JSON from the current extension page. */
export function downloadBackup(backup: StartSpaceBackup): void {
  const date = backup.createdAt.slice(0, 10);
  const blob = new Blob([`${JSON.stringify(backup, null, 2)}\n`], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `startspace-backup-${date}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

/** Creates any parent directories required for a safe relative backup path. */
async function parentDirectory(
  workspace: FileSystemDirectoryHandle,
  path: string,
): Promise<{ directory: FileSystemDirectoryHandle; name: string }> {
  const parts = path.split("/");
  const name = parts.pop()!;
  let directory = workspace;
  for (const part of parts) {
    directory = await directory.getDirectoryHandle(part, { create: true });
  }
  return { directory, name };
}

/** Restores validated files by overwriting matching paths without deleting extras. */
async function restoreWorkspace(
  workspace: FileSystemDirectoryHandle,
  files: BackupFile[],
): Promise<void> {
  for (const file of files) {
    const { directory, name } = await parentDirectory(workspace, file.path);
    const handle = await directory.getFileHandle(name, { create: true });
    const writable = await handle.createWritable();
    try {
      await writable.write(base64ToBytes(file.content));
      await writable.close();
    } catch (error) {
      await writable.abort();
      throw error;
    }
  }
}

/** Validates and restores a backup into the selected workspace and local storage. */
export async function restoreBackup(
  json: string,
  workspace: FileSystemDirectoryHandle,
  destinationConfig: Config,
): Promise<RestoreSummary> {
  const backup = parseBackupJson(json);
  await restoreWorkspace(workspace, backup.workspace.files);
  await writeExtensionData(backup, destinationConfig);
  if (backup.extension.theme) {
    localStorage.setItem(THEME_KEY, backup.extension.theme);
    document.documentElement.dataset.theme = backup.extension.theme;
  }
  window.dispatchEvent(new Event("startspace:config-changed"));
  window.dispatchEvent(new Event("startspace:workspace-changed"));
  return {
    filesRestored: backup.workspace.files.length,
    bookmarkMetadataEntries: Object.keys(backup.extension.bookmarkMetadata).length,
  };
}
