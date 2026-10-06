import SettingsCard from "../components/settings-card";
import { Moon, Sun, Palette, SlidersHorizontal, Clock3 } from "lucide-react";
import type { AccentName } from "../../hooks/useTheme";
import SwitchRow from "../components/switch-row";
import type { UserPreferences } from "../../hooks/useConfig";

const ACCENT_CHOICES: { id: AccentName; label: string; color: string }[] = [
  { id: "amber", label: "Amber", color: "#d97706" },
  { id: "blue", label: "Blue", color: "#2563eb" },
  { id: "green", label: "Green", color: "#16834a" },
  { id: "red", label: "Red", color: "#dc2626" },
  { id: "teal", label: "Teal", color: "#0e8490" },
];

export default function GeneralSettingsSection({
  theme,
  accent,
  mounted,
  setTheme,
  setAccent,
  preferences,
  updatePreference,
  timeZone,
  currentTime,
}: {
  theme: "dark" | "light";
  accent: AccentName;
  mounted: boolean;
  setTheme: (theme: "dark" | "light") => void;
  setAccent: (accent: AccentName) => void;
  preferences: UserPreferences;
  updatePreference: (
    key: keyof UserPreferences,
    value: boolean,
  ) => Promise<void>;
  timeZone: string;
  currentTime: Date;
}) {
  return (
    <div className="space-y-3">
      <SettingsCard
        title="Appearance"
        subtitle="Theme and accent color"
        icon={Palette}
      >
        <fieldset>
          <legend className="mb-2 text-xs font-medium text-muted">Theme</legend>
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
          onChange={(value) => void updatePreference("showGreeting", value)}
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
  );
}
