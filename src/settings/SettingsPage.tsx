import { useEffect, useRef, useState } from "react";
import { useConfig, DEFAULT_PREFERENCES } from "../hooks/useConfig";
import { useWorkspace } from "../hooks/useWorkspace";
import { useTheme } from "../hooks/useTheme";
import { useNotes } from "../notes/use-notes";
import { useNotifications } from "../notifications/notification-context";
import {
  createBackup,
  downloadBackup,
  restoreBackup,
} from "../backup/backup-service";
import { BackupValidationError } from "../backup/backup-format";
import { getBrowserSearchInfo } from "../search/browser-search";
import GeneralSettingsSection from "./sections/general-settings-section";
import SearchSettingsSection from "./sections/search-settings-section";
import NotesSettingsSection from "./sections/notes-settings-section";
import LinksSettingsSection from "./sections/links-settings-section";
import TasksSettingsSection from "./sections/tasks-settings-section";
import AboutSettingsSection from "./sections/about-settings-section";
import type { Category } from "./sections/sidebar-menu-settings-section";
import SidebarMenuSettingsSection, {
  CATEGORIES,
} from "./sections/sidebar-menu-settings-section";
import SidebarGlobalSettingsSection from "./sections/sidebar-global-settings-section";

/** Category-based settings workspace with a persistent status/action rail. */
export function SettingsPage() {
  const notifications = useNotifications();
  const workspace = useWorkspace();
  const notes = useNotes(workspace);
  const { config, save } = useConfig();
  const { theme, accent, mounted, setTheme, setAccent } = useTheme();
  const [category, setCategory] = useState<Category>(() => {
    const stored = localStorage.getItem("startspace.settings.category");
    return CATEGORIES.some((item) => item.id === stored)
      ? (stored as Category)
      : "general";
  });
  const [saved, setSaved] = useState("");
  const savedTimeoutRef = useRef<number | undefined>(undefined);
  const [backupBusy, setBackupBusy] = useState(false);
  const [searchInfo, setSearchInfo] = useState<Awaited<
    ReturnType<typeof getBrowserSearchInfo>
  > | null>(null);

  const headingRef = useRef<HTMLHeadingElement>(null);
  const focusHeading = useRef(false);
  const restoreInputRef = useRef<HTMLInputElement>(null);
  const preferences = { ...DEFAULT_PREFERENCES, ...config?.preferences };
  const workspaceReady =
    !!workspace.grant.handle && workspace.grant.permission === "granted";

  useEffect(() => {
    return () => window.clearTimeout(savedTimeoutRef.current);
  }, []);

  useEffect(() => {
    localStorage.setItem("startspace.settings.category", category);
    if (focusHeading.current) {
      headingRef.current?.focus();
      focusHeading.current = false;
    }
  }, [category]);

  useEffect(() => {
    let active = true;
    const refresh = () =>
      void getBrowserSearchInfo().then((value) => {
        if (active) setSearchInfo(value);
      });
    refresh();
    window.addEventListener("focus", refresh);
    return () => {
      active = false;
      window.removeEventListener("focus", refresh);
    };
  }, []);

  useEffect(() => {
    if (
      !config ||
      !workspaceReady ||
      !workspace.grant.id ||
      config.currentWorkspace?.id === workspace.grant.id
    )
      return;
    void save({
      ...config,
      currentWorkspace: { id: workspace.grant.id, name: workspace.grant.name },
    });
  }, [config, save, workspace.grant.id, workspace.grant.name, workspaceReady]);

  const chooseCategory = (value: string) => {
    if (!CATEGORIES.some((item) => item.id === value)) return;
    focusHeading.current = true;
    setCategory(value as Category);
  };

  const showSaved = () => {
    window.clearTimeout(savedTimeoutRef.current);
    setSaved("Saved");
    savedTimeoutRef.current = window.setTimeout(() => {
      setSaved("");
      savedTimeoutRef.current = undefined;
    }, 3000);
  };

  const updatePreference = async (
    key: keyof typeof DEFAULT_PREFERENCES,
    value: boolean,
  ) => {
    if (!config) return;
    setSaved("");
    try {
      await save({ ...config, preferences: { ...preferences, [key]: value } });
      showSaved();
    } catch {
      notifications.error("Setting could not be saved. Try again.");
    }
  };

  const chooseWorkspace = async () => {
    const handle = await workspace.chooseWorkspace();
    if (!handle || !config || !workspace.grant.id) return;
    try {
      await save({
        ...config,
        currentWorkspace: { id: workspace.grant.id, name: handle.name },
      });
      notifications.success("Workspace connected.");
    } catch {
      notifications.error("Workspace settings could not be saved.");
    }
  };

  const disconnectWorkspace = () => {
    if (
      !config ||
      !window.confirm(
        "Disconnect this workspace? Your files will not be changed or deleted.",
      )
    )
      return;
    workspace.reset();
    void save({ ...config, currentWorkspace: null });
    notifications.success(
      "Workspace disconnected. Your files were left untouched.",
    );
  };

  const exportBackup = async () => {
    if (!workspace.grant.handle || !config) return;
    setBackupBusy(true);
    try {
      const backup = await createBackup(workspace.grant.handle, config);
      downloadBackup(backup);
      notifications.success(
        `Backup exported with ${backup.workspace.files.length} workspace file${backup.workspace.files.length === 1 ? "" : "s"}.`,
      );
    } catch {
      notifications.error(
        "Backup could not be created. Reconnect the workspace and try again.",
      );
    } finally {
      setBackupBusy(false);
    }
  };

  const importBackup = async (file: File | undefined) => {
    if (!file || !workspace.grant.handle || !config) return;
    setBackupBusy(true);
    try {
      const summary = await restoreBackup(
        await file.text(),
        workspace.grant.handle,
        config,
      );
      notifications.success(
        `Backup restored: ${summary.filesRestored} workspace file${summary.filesRestored === 1 ? "" : "s"} and ${summary.bookmarkMetadataEntries} bookmark metadata entr${summary.bookmarkMetadataEntries === 1 ? "y" : "ies"}.`,
      );
      window.dispatchEvent(new Event("startspace:workspace-changed"));
    } catch (error) {
      notifications.error(
        error instanceof BackupValidationError
          ? error.message
          : "Backup could not be restored. No unrelated workspace files were deleted.",
      );
    } finally {
      setBackupBusy(false);
    }
  };

  const bookmarkApiAvailable = !!(
    globalThis as { chrome?: { bookmarks?: unknown } }
  ).chrome?.bookmarks;
  const fileSystemApiAvailable =
    typeof window !== "undefined" && "showDirectoryPicker" in window;
  const fileSystemStatus = !fileSystemApiAvailable
    ? "Unavailable"
    : workspaceReady
      ? "Available"
      : workspace.grant.handle || config?.currentWorkspace
        ? "Permission required"
        : "Permission required";

  const currentTime = new Date();
  const timeZone =
    Intl.DateTimeFormat().resolvedOptions().timeZone || "Local time";

  return (
    <section className="grid min-h-0 flex-1 grid-cols-1 gap-3 min-[1024px]:grid-cols-[15rem_minmax(0,1fr)] min-[1600px]:grid-cols-[22rem_minmax(0,1fr)_30.625rem]">
      <SidebarMenuSettingsSection
        category={category}
        chooseCategory={chooseCategory}
      />
      {/* Mobile menu for selecting settings category */}
      <div className="flex min-h-0 min-w-0 flex-col gap-3">
        <label className="md:hidden">
          <span className="sr-only">Settings category</span>
          <select
            value={category}
            onChange={(event) => chooseCategory(event.target.value)}
            className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-fg min-[1024px]:hidden"
          >
            {CATEGORIES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
        </label>
        <main className="app-scrollbar min-h-0 min-w-0 flex-1 overflow-y-auto rounded-lg border border-border bg-surface/20 p-3 md:p-4">
          <div className="h-4 flex items-center justify-between mb-3">
            {saved && (
              <span
                className="ml-auto text-xs text-green-500"
                role="status"
                aria-live="polite"
              >
                {saved}
              </span>
            )}
          </div>

          {category === "general" && (
            <GeneralSettingsSection
              theme={theme}
              accent={accent}
              mounted={mounted}
              setTheme={setTheme}
              setAccent={setAccent}
              preferences={preferences}
              updatePreference={updatePreference}
              timeZone={timeZone}
              currentTime={currentTime}
            />
          )}

          {category === "search" && (
            <SearchSettingsSection searchInfo={searchInfo} />
          )}

          {category === "notes" && (
            <NotesSettingsSection
              notes={notes}
              workspaceReady={workspaceReady}
            />
          )}

          {category === "links" && (
            <LinksSettingsSection showSaved={showSaved} />
          )}

          {category === "tasks" && <TasksSettingsSection />}

          {category === "about" && <AboutSettingsSection />}
        </main>
      </div>

      <SidebarGlobalSettingsSection
        workspace={workspace}
        config={config}
        workspaceReady={workspaceReady}
        chooseWorkspace={chooseWorkspace}
        disconnectWorkspace={disconnectWorkspace}
        exportBackup={exportBackup}
        restoreInputRef={restoreInputRef}
        importBackup={importBackup}
        backupBusy={backupBusy}
        bookmarkApiAvailable={bookmarkApiAvailable}
        searchInfo={searchInfo}
        fileSystemStatus={fileSystemStatus}
      />
    </section>
  );
}
