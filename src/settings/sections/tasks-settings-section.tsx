import { useTasks } from "../../tasks/use-tasks";
import SettingsCard from "../components/settings-card";
import { Check } from "lucide-react";

export default function TasksSettingsSection() {
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
      <p className="px-1 text-xs text-muted">
        Priority defaults and task labels are not available in the current task
        file format.
      </p>
    </div>
  );
}
