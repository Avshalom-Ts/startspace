// Settings for tasks, including independent Home and search item limits.
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
}: {
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
      />
    </div>
  );
}
