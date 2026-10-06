export default function SwitchRow({
  label,
  detail,
  checked,
  onChange,
  disabled = false,
}: {
  label: string;
  detail?: string;
  checked: boolean;
  onChange?: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex min-h-10 items-center gap-3 border-b border-border/70 py-2 last:border-0">
      <div className="min-w-0 flex-1">
        <p className="text-sm text-fg">{label}</p>
        {detail && <p className="text-xs text-muted">{detail}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-label={label}
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange?.(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${checked ? "bg-accent" : "bg-muted/40"}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-page shadow transition-[left,right] ${checked ? "right-0.5" : "left-0.5"}`}
        />
      </button>
    </div>
  );
}
