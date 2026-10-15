// Settings for tasks, including independent Home and search item limits.
import SwitchRow from "../components/switch-row";
import HomeLimitSettings from "../components/home-limit-settings";
import { useTasks } from "../../tasks/use-tasks";
import SettingsCard from "../components/settings-card";
import { Check } from "lucide-react";

/** Renders task behavior and Home display settings. */
export default function TasksSettingsSection({
  searchLimit,
  onSearchLimitChange,
  homeLimit,
  onHomeLimitChange,
  hiddenColumnIds,
  onHiddenColumnIdsChange,
  workspaceReady,
}: {
  hiddenColumnIds: string[];
  onHiddenColumnIdsChange: (ids: string[]) => void;
  workspaceReady: boolean;
  searchLimit: number;
  onSearchLimitChange: (value: number) => void;
  homeLimit: number;
  onHomeLimitChange: (value: number) => void;
}) {
  const tasks = useTasks();

  return (
    <div className="space-y-3">
      <SettingsCard
        title="Task statuses"
        subtitle="Statuses are stored with your local task board"
        icon={Check}
      >
        {tasks.loading ? (
          <p className="text-sm text-muted">Loading task statusesâ€¦</p>
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
      <HomeLimitSettings
        feature="Tasks"
        homeLabel="Tasks on Home"
        homeLimit={homeLimit}
        onHomeLimitChange={onHomeLimitChange}
        searchLimit={searchLimit}
        onSearchLimitChange={onSearchLimitChange}
      >
        <fieldset className="pt-3">
          <legend className="pt-3 text-sm font-medium text-fg">Task columns on Home</legend>
          <p className="mb-2 text-xs text-muted">
            Choose which columns contribute tasks to Home. New columns are included by default.
          </p>
          {!workspaceReady ? (
            <p className="text-sm text-muted">Connect a workspace to choose its columns.</p>
          ) : tasks.loading ? (
            <p className="text-sm text-muted">Loading columns…</p>
          ) : tasks.error ? (
            <p role="alert" className="text-sm text-muted">Columns could not be loaded. Reconnect the workspace and try again.</p>
          ) : (
            tasks.columns.map((column) => (
              <SwitchRow
                key={column.id}
                label={column.title}
                detail="Show tasks from this column on Home."
                checked={!hiddenColumnIds.includes(column.id)}
                onChange={(show) => onHiddenColumnIdsChange(show
                  ? hiddenColumnIds.filter((id) => id !== column.id)
                  : [...new Set([...hiddenColumnIds, column.id])])}
              />
            ))
          )}
        </fieldset>
      </HomeLimitSettings>
    </div>
  );
}
