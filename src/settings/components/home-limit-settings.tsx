// Shared Home item-limit control, displayed in each feature's settings tab.
import { SlidersHorizontal } from "lucide-react";
import { homeLimit } from "../../hooks/useConfig";
import SettingsCard from "./settings-card";

/** Edits a feature's Home limit, saving valid whole numbers on blur or Enter. */
export default function HomeLimitSettings({ label, value, onChange, detail }: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  detail?: string;
}) {
  const limit = homeLimit(value);
  return (
    <SettingsCard
      title="Home page"
      subtitle="Maximum items to show. Default: 20. Set 0 to hide items."
      icon={SlidersHorizontal}
    >
      {detail && <p className="mb-3 text-sm text-muted">{detail}</p>}
      <label className="flex items-center justify-between gap-3 text-sm text-fg">
        {label}
        <input
          key={limit}
          type="number"
          min={0}
          step={1}
          defaultValue={limit}
          className="h-9 w-24 rounded-md border border-border bg-page px-3 text-fg"
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
      </label>
    </SettingsCard>
  );
}
