import { useEffect, useRef, useState } from "react";
import {
  Check,
  Clock3,
  Download,
  ExternalLink,
  FileText,
  Folder,
  Info,
  Link2,
  Moon,
  Palette,
  Search,
  Settings2,
  SlidersHorizontal,
  Sun,
  Upload,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useConfig, DEFAULT_PREFERENCES } from "../hooks/useConfig";
import { useWorkspace } from "../hooks/useWorkspace";
import { useTheme, type AccentName } from "../hooks/useTheme";
import { useNotes } from "../notes/use-notes";
import { useTasks } from "../tasks/use-tasks";
import { useNotifications } from "../notifications/notification-context";
import {
  createBackup,
  downloadBackup,
  restoreBackup,
} from "../backup/backup-service";
import { BackupValidationError } from "../backup/backup-format";
import { BrowserSearchSettings } from "./browser-search-settings";
import { getBrowserSearchInfo } from "../search/browser-search";
import SwitchRow from "./components/switch-row";
import CapabilityRow from "./components/capability-row";
import SettingsCard from "./components/settings-card";

type Category =
  | "general"
  | "search"
  | "workspace"
  | "notes"
  | "links"
  | "tasks"
  | "import-export"
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
    id: "import-export",
    title: "Import / Export",
    description: "Backup and restore",
    icon: SlidersHorizontal,
  },
  {
    id: "about",
    title: "About",
    description: "Version and open source",
    icon: Info,
  },
];

const ACCENT_CHOICES: { id: AccentName; label: string; color: string }[] = [
  { id: "amber", label: "Amber", color: "#d97706" },
  { id: "blue", label: "Blue", color: "#2563eb" },
  { id: "green", label: "Green", color: "#16834a" },
  { id: "red", label: "Red", color: "#dc2626" },
  { id: "teal", label: "Teal", color: "#0e8490" },
];

function getInstalledVersion(): string {
  try {
    return typeof chrome === "undefined"
      ? "Development preview"
      : chrome.runtime.getManifest().version;
  } catch {
    return "Development preview";
  }
}

/** Category-based settings workspace with a persistent status/action rail. */
export function SettingsPage() {
  const notifications = useNotifications();
  const workspace = useWorkspace();
  const notes = useNotes(workspace);
  const tasks = useTasks();
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
  const [linksLayout, setLinksLayout] = useState<"grid" | "list">(() =>
    localStorage.getItem("startspace.links.layout") === "list"
      ? "list"
      : "grid",
  );
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

  const selectLinksLayout = (value: "grid" | "list") => {
    setLinksLayout(value);
    localStorage.setItem("startspace.links.layout", value);
    window.dispatchEvent(
      new CustomEvent("startspace:links-layout-changed", { detail: value }),
    );
    showSaved();
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
            <div className="space-y-3">
              <SettingsCard
                title="Appearance"
                subtitle="Theme and accent color"
                icon={Palette}
              >
                <fieldset>
                  <legend className="mb-2 text-xs font-medium text-muted">
                    Theme
                  </legend>
                  <div className="grid grid-cols-2 gap-2">
                    {(["dark", "light"] as const).map((option) => (
                      <button
                        key={option}
                        type="button"
                        role="radio"
                        aria-checked={theme === option}
                        disabled={!mounted}
                        onClick={() => setTheme(option)}
                        className={`flex min-h-12 items-center gap-2 rounded-md border px-3 text-sm capitalize ${theme === option ? "border-accent bg-accent/10 text-fg" : "border-border text-muted hover:text-fg"}`}
                      >
                        {option === "dark" ? (
                          <Moon size={17} aria-hidden="true" />
                        ) : (
                          <Sun size={17} aria-hidden="true" />
                        )}
                        {option}
                      </button>
                    ))}
                  </div>
                </fieldset>
                <fieldset className="mt-4">
                  <legend className="mb-2 text-xs font-medium text-muted">
                    Accent color
                  </legend>
                  <div
                    role="radiogroup"
                    aria-label="Accent color"
                    className="flex flex-wrap gap-2"
                  >
                    {ACCENT_CHOICES.map((choice) => (
                      <button
                        key={choice.id}
                        type="button"
                        role="radio"
                        aria-checked={accent === choice.id}
                        aria-label={`${choice.label} accent`}
                        title={choice.label}
                        onClick={() => setAccent(choice.id)}
                        className={`flex h-9 w-9 items-center justify-center rounded-full border ${accent === choice.id ? "border-fg" : "border-transparent"}`}
                      >
                        <span
                          className="h-5 w-5 rounded-full"
                          style={{ backgroundColor: choice.color }}
                        />
                      </button>
                    ))}
                  </div>
                </fieldset>
              </SettingsCard>
              <SettingsCard
                title="Startup & Behavior"
                subtitle="What to show and how StartSpace behaves"
                icon={SlidersHorizontal}
              >
                <SwitchRow
                  label="Show greeting on Home page"
                  checked={preferences.showGreeting}
                  onChange={(value) =>
                    void updatePreference("showGreeting", value)
                  }
                />
                <SwitchRow
                  label="Open links in new tab"
                  detail="Applies to normal bookmark activation."
                  checked={preferences.openLinksInNewTab}
                  onChange={(value) =>
                    void updatePreference("openLinksInNewTab", value)
                  }
                />
                <SwitchRow
                  label="Confirm before deleting items"
                  detail="Always on for destructive actions."
                  checked
                  disabled
                />
              </SettingsCard>
              <SettingsCard
                title="Date & Time"
                subtitle="Uses your operating system's locale and timezone"
                icon={Clock3}
              >
                <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-[minmax(0,1fr)_auto]">
                  <dt className="text-muted">Locale</dt>
                  <dd className="text-fg">{navigator.language}</dd>
                  <dt className="text-muted">Timezone</dt>
                  <dd className="text-fg">{timeZone}</dd>
                  <dt className="text-muted">Local example</dt>
                  <dd className="text-fg">{currentTime.toLocaleString()}</dd>
                </dl>
              </SettingsCard>
            </div>
          )}

          {category === "search" && (
            <div className="space-y-3">
              <SettingsCard
                title="Local search"
                subtitle="Search order and scope"
                icon={Search}
              >
                <p className="text-sm text-fg">
                  Bookmarks → Notes → Tasks → Web
                </p>
                <p className="mt-2 text-sm text-muted">
                  Bookmarks, notes, and tasks are searched locally. Choosing Web
                  runs a search with your browser's current default provider.
                </p>
              </SettingsCard>
              <SettingsCard
                title="Web Search"
                subtitle="Browser-managed search provider"
                icon={ExternalLink}
              >
                <p className="text-sm font-medium text-fg">
                  Uses your browser&apos;s default search engine.
                </p>
                <BrowserSearchSettings />
                {!searchInfo?.available && (
                  <p className="mt-2 text-xs text-muted">
                    Local bookmark, note, and task search remains available when
                    browser search integration is unavailable.
                  </p>
                )}
              </SettingsCard>
            </div>
          )}

          {category === "workspace" && (
            <div className="space-y-3">
              <SettingsCard
                title="Workspace access"
                subtitle="Choose a local folder for Markdown notes and tasks"
                icon={Folder}
              >
                <p className="text-sm text-muted">
                  Your browser manages the extension installation. You choose
                  the folder containing your data. Changing location does not
                  move files.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void chooseWorkspace()}
                    className="min-h-9 rounded-md bg-accent px-3 text-sm font-medium text-accent-foreground"
                  >
                    {workspaceReady
                      ? "Change location"
                      : workspace.grant.handle
                        ? "Reconnect workspace"
                        : "Choose workspace"}
                  </button>
                  {workspaceReady && (
                    <button
                      type="button"
                      onClick={disconnectWorkspace}
                      className="min-h-9 rounded-md border border-border px-3 text-sm text-fg hover:bg-page"
                    >
                      Disconnect
                    </button>
                  )}
                </div>
                {workspace.error && (
                  <p className="mt-2 text-sm text-red-500" role="alert">
                    {workspace.error}
                  </p>
                )}
              </SettingsCard>
            </div>
          )}

          {category === "notes" && (
            <div className="space-y-3">
              <SettingsCard
                title="Notes behavior"
                subtitle="Ordinary Markdown files in your workspace"
                icon={FileText}
              >
                <ul className="space-y-2 text-sm text-muted">
                  <li>
                    Notes are stored as Markdown files in the selected
                    workspace.
                  </li>
                  <li>
                    Edits autosave after a short pause; conflicts preserve your
                    draft.
                  </li>
                  <li>Markdown preview avoids loading remote images.</li>
                </ul>
                <button
                  type="button"
                  onClick={() => void notes.refresh()}
                  disabled={!workspaceReady || notes.loading}
                  className="mt-3 inline-flex min-h-9 items-center gap-2 rounded-md border border-border px-3 text-sm text-fg hover:bg-page disabled:opacity-50"
                >
                  <span aria-hidden="true">↻</span> Refresh workspace
                </button>
              </SettingsCard>
            </div>
          )}

          {category === "links" && (
            <div className="space-y-3">
              <SettingsCard
                title="Bookmarks"
                subtitle="The browser remains the source of truth"
                icon={Link2}
              >
                <p className="text-sm text-muted">
                  Names, URLs, folders, and deletion are managed by your
                  browser. StartSpace stores favorites, tags, descriptions, and
                  recent-open timestamps locally.
                </p>
              </SettingsCard>
              <SettingsCard
                title="Default Links layout"
                subtitle="Choose how bookmarks open in StartSpace"
                icon={SlidersHorizontal}
              >
                <div
                  role="radiogroup"
                  aria-label="Default Links layout"
                  className="flex gap-2"
                >
                  {(["grid", "list"] as const).map((layout) => (
                    <button
                      key={layout}
                      type="button"
                      role="radio"
                      aria-checked={linksLayout === layout}
                      onClick={() => selectLinksLayout(layout)}
                      className={`min-h-9 rounded-md border px-4 text-sm capitalize ${linksLayout === layout ? "border-accent bg-accent/10 text-fg" : "border-border text-muted hover:text-fg"}`}
                    >
                      {layout}
                    </button>
                  ))}
                </div>
              </SettingsCard>
            </div>
          )}

          {category === "tasks" && (
            <div className="space-y-3">
              <SettingsCard
                title="Task statuses"
                subtitle="Statuses are stored with your local task board"
                icon={Check}
              >
                {tasks.loading ? (
                  <p className="text-sm text-muted">Loading task statuses…</p>
                ) : (
                  <ul className="space-y-1">
                    {tasks.columns.map((column) => (
                      <li
                        key={column.id}
                        className="flex min-h-8 items-center gap-2 border-b border-border/70 text-sm text-fg"
                      >
                        <span className="h-2.5 w-2.5 rounded-full bg-accent" />
                        {column.title}
                      </li>
                    ))}
                  </ul>
                )}
              </SettingsCard>
              <p className="px-1 text-xs text-muted">
                Priority defaults and task labels are not available in the
                current task file format.
              </p>
            </div>
          )}

          {category === "import-export" && (
            <SettingsCard
              title="Portable backup"
              subtitle="Export or restore workspace data"
              icon={Download}
            >
              <p className="text-sm text-muted">
                Create a portable JSON backup of your workspace files, settings,
                theme, and bookmark metadata. Restore validates the backup and
                merges its files without deleting unrelated workspace files.
              </p>
              <p className="mt-2 text-sm text-muted">
                Use the Data Management actions in the right rail to export or
                restore a backup.
              </p>
            </SettingsCard>
          )}

          {category === "about" && (
            <SettingsCard
              title="StartSpace"
              subtitle="Your browser. Your workspace. Your data."
              icon={Info}
            >
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                <dt className="text-muted">Version</dt>
                <dd className="text-fg">{getInstalledVersion()}</dd>
                <dt className="text-muted">License</dt>
                <dd>
                  <a
                    href="https://github.com/Avshalom-Ts/startspace/blob/main/LICENSE"
                    target="_blank"
                    rel="noreferrer"
                    className="text-accent hover:underline"
                  >
                    MIT License
                  </a>
                </dd>
                <dt className="text-muted">Source</dt>
                <dd>
                  <a
                    href="https://github.com/Avshalom-Ts/startspace"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-accent hover:underline"
                  >
                    GitHub <ExternalLink size={13} aria-hidden="true" />
                  </a>
                </dd>
              </dl>
            </SettingsCard>
          )}
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
