// Shared Home page settings card for each feature's display and search limits.
import { useId } from "react";
import { SlidersHorizontal } from "lucide-react";
import { isHomeLimit } from "../../hooks/useConfig";
import SettingsCard from "./settings-card";

/** Renders a labeled count with supporting text; saves valid integers on blur or Enter. */
function LimitRow({ title, subtitle, value, defaultLimit, onChange }: {
  title: string;
  subtitle: string;
  value: number;
  defaultLimit: number;
  onChange: (value: number) => void;
}) {
  const id = useId();
  const limit = isHomeLimit(value) ? value : defaultLimit;
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <label id={`${id}-title`} htmlFor={id} className="block text-sm font-medium text-fg">
          {title}
        </label>
        <p id={`${id}-detail`} className="mt-1 text-xs text-muted">
          {subtitle} Default: {defaultLimit}. Set 0 to hide items.
        </p>
      </div>
      <input
        key={limit}
        id={id}
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-detail`}
        type="number"
        min={0}
        step={1}
        defaultValue={limit}
        className="h-9 w-24 shrink-0 rounded-md border border-border bg-page px-3 text-sm text-fg"
        onBlur={(event) => {
          const input = event.currentTarget;
          if (!input.value || !input.validity.valid || !Number.isSafeInteger(input.valueAsNumber)) {
            input.value = String(limit);
            return;
          }
          if (input.valueAsNumber !== limit) onChange(input.valueAsNumber);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
        }}
      />
    </div>
  );
}

/** Groups a feature's Home display and search settings into one consistent card. */
export default function HomeLimitSettings({
  feature,
  homeLabel,
  homeDetail = "Maximum items shown in this feature's Home page section.",
  homeLimit,
  onHomeLimitChange,
  searchLimit,
  onSearchLimitChange,
}: {
  feature: string;
  homeLabel: string;
  homeDetail?: string;
  homeLimit: number;
  onHomeLimitChange: (value: number) => void;
  searchLimit: number;
  onSearchLimitChange: (value: number) => void;
}) {
  return (
    <SettingsCard
      title="Home page"
      subtitle="Control how this feature appears on the Home page and in search."
      icon={SlidersHorizontal}
    >
      <div className="divide-y divide-border">
        <LimitRow
          title={`${feature} search results`}
          subtitle="Maximum matches in the search dropdown. All result shows every match for this feature."
          value={searchLimit}
          defaultLimit={6}
          onChange={onSearchLimitChange}
        />
        <LimitRow
          title={homeLabel}
          subtitle={homeDetail}
          value={homeLimit}
          defaultLimit={20}
          onChange={onHomeLimitChange}
        />
      </div>
    </SettingsCard>
  );
}
