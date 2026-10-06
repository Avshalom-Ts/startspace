import { useEffect, useRef, useState } from "react";
import {
  Check,
  Download,
  FileText,
  Folder,
  Info,
  Link2,
  Search,
  Settings2,
  Upload,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
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
import CapabilityRow from "./components/capability-row";
import SettingsCard from "./components/settings-card";
import GeneralSettingsSection from "./sections/general-settings-section";
import WorkspaceSettingsSection from "./sections/workspace-settings-section";
import SearchSettingsSection from "./sections/search-settings-section";
import NotesSettingsSection from "./sections/notes-settings-section";
import LinksSettingsSection from "./sections/links-settings-section";
import TasksSettingsSection from "./sections/tasks-settings-section";
import AboutSettingsSection from "./sections/about-settings-section";

type Category =
  | "general"
  | "search"
  | "workspace"
  | "notes"
  | "links"
  | "tasks"
  | "about";

const CATEGORIES: {
  id: Category;
  title: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    id: "general",
    title: "General",
    description: "Appearance, startup, behavior",
    icon: Settings2,
  },
  {
    id: "search",
    title: "Search",
    description: "Local search, web search",
    icon: Search,
  },
  {
    id: "workspace",
    title: "Workspace",
    description: "Location and access",
    icon: Folder,
  },
  {
    id: "notes",
    title: "Notes",
    description: "Editor and Markdown",
    icon: FileText,
  },
  {
    id: "links",
    title: "Links",
    description: "Bookmarks and display",
    icon: Link2,
  },
  {
    id: "tasks",
    title: "Tasks",
    description: "Statuses and defaults",
    icon: Check,
  },
  {
    id: "about",
    title: "About",
    description: "Version and open source",
    icon: Info,
  },
];

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

  const copyWorkspaceName = async () => {
    const name = workspace.grant.handle
      ? workspace.grant.name
      : config?.currentWorkspace?.name;
    if (!name) return;
    try {
      await navigator.clipboard.writeText(name);
      notifications.success("Workspace name copied.");
    } catch {
      notifications.error("Workspace name could not be copied.");
    }
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
      {/* Sidebar menu */}
      <aside className="hidden min-h-0 overflow-y-auto rounded-lg border border-border bg-surface/30 p-3 min-[1024px]:block">
        <h2 className="mb-3 px-2 text-base font-semibold text-fg">Settings</h2>
        <nav aria-label="Settings categories" className="space-y-1">
          {CATEGORIES.map(({ id, title, description, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => chooseCategory(id)}
              aria-current={category === id ? "page" : undefined}
              className={`flex min-h-12 w-full items-center gap-3 rounded-md border-l-2 px-2 text-left ${category === id ? "border-accent bg-accent/15 text-fg" : "border-transparent text-muted hover:bg-page hover:text-fg"}`}
            >
              <Icon size={18} aria-hidden="true" className="shrink-0" />
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{title}</span>
                <span className="block truncate text-xs text-muted">
                  {description}
                </span>
              </span>
            </button>
          ))}
        </nav>
      </aside>

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

          {category === "workspace" && (
            <WorkspaceSettingsSection
              workspaceReady={workspaceReady}
              workspace={workspace}
              chooseWorkspace={chooseWorkspace}
              disconnectWorkspace={disconnectWorkspace}
            />
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

      <aside className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 min-[1024px]:col-start-2 min-[1600px]:col-start-3 min-[1600px]:row-start-1 min-[1600px]:flex min-[1600px]:min-h-0 min-[1600px]:flex-col min-[1600px]:overflow-y-auto">
        <SettingsCard
          title="Workspace"
          subtitle="Current workspace location"
          icon={Folder}
        >
          <p
            className="truncate text-sm text-fg"
            title={
              workspace.grant.handle
                ? workspace.grant.name
                : (config?.currentWorkspace?.name ?? "No workspace selected")
            }
          >
            {workspace.grant.handle
              ? workspace.grant.name
              : (config?.currentWorkspace?.name ?? "No workspace selected")}
          </p>
          <p className="mt-1 text-xs text-muted">
            {workspaceReady
              ? "Connected"
              : workspace.grant.handle || config?.currentWorkspace
                ? "Permission required"
                : "Not selected"}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void chooseWorkspace()}
              className="min-h-9 flex-1 rounded-md border border-border px-2 text-xs text-fg hover:bg-page"
            >
              {workspaceReady
                ? "Change location"
                : workspace.grant.handle || config?.currentWorkspace
                  ? "Reconnect"
                  : "Choose workspace"}
            </button>
            <button
              type="button"
              onClick={() => void copyWorkspaceName()}
              disabled={!workspace.grant.handle && !config?.currentWorkspace}
              title="Copy workspace name"
              aria-label="Copy workspace name"
              className="min-h-9 rounded-md border border-border px-2 text-xs text-muted hover:bg-page disabled:opacity-50"
            >
              Copy name
            </button>
          </div>
          {workspaceReady && (
            <button
              type="button"
              onClick={disconnectWorkspace}
              className="mt-2 text-xs text-muted underline hover:text-red-500"
            >
              Disconnect
            </button>
          )}
        </SettingsCard>

        <SettingsCard
          title="Data Management"
          subtitle="Backup and restore your StartSpace data"
          icon={Download}
        >
          {!workspaceReady && (
            <p className="mb-2 text-xs text-muted">
              Connect a workspace before exporting or restoring.
            </p>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => void exportBackup()}
              disabled={!workspaceReady || !config || backupBusy}
              className="inline-flex min-h-9 items-center justify-center gap-1 rounded-md border border-border px-2 text-xs text-fg hover:bg-page disabled:opacity-50"
            >
              <Download size={14} aria-hidden="true" /> Export
            </button>
            <button
              type="button"
              onClick={() => restoreInputRef.current?.click()}
              disabled={!workspaceReady || backupBusy}
              className="inline-flex min-h-9 items-center justify-center gap-1 rounded-md border border-border px-2 text-xs text-fg hover:bg-page disabled:opacity-50"
            >
              <Upload size={14} aria-hidden="true" /> Restore
            </button>
          </div>
          <input
            ref={restoreInputRef}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            disabled={!workspaceReady || backupBusy}
            onChange={(event) => {
              const input = event.currentTarget;
              void importBackup(input.files?.[0]).finally(() => {
                input.value = "";
              });
            }}
          />
        </SettingsCard>

        <SettingsCard
          title="Browser Integration"
          subtitle="Capabilities available to StartSpace"
          icon={Link2}
        >
          <CapabilityRow
            label="Bookmarks API"
            status={bookmarkApiAvailable ? "Available" : "Unavailable"}
          />
          <CapabilityRow
            label="Search API"
            status={
              searchInfo === null
                ? "Checking"
                : searchInfo.available
                  ? "Available"
                  : "Unavailable"
            }
          />
          <CapabilityRow label="File System Access" status={fileSystemStatus} />
        </SettingsCard>
      </aside>
    </section>
  );
}
