export default function CapabilityRow({
  label,
  status,
}: {
  label: string;
  status: string;
}) {
  const available = status === "Available";
  return (
    <div className="flex min-h-8 items-center gap-2 border-b border-border/70 last:border-0">
      <span
        aria-hidden="true"
        className={`h-2.5 w-2.5 shrink-0 rounded-full ${available ? "bg-green-500" : "bg-amber-500"}`}
      />
      <span className="min-w-0 flex-1 text-xs text-fg">{label}</span>
      <span
        className={`text-xs ${available ? "text-green-600 dark:text-green-400" : "text-muted"}`}
      >
        {status}
      </span>
    </div>
  );
}
