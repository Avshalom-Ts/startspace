import React from "react";
import type { LucideIcon } from "lucide-react";

export default function SettingsCard({
  title,
  subtitle,
  icon: Icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-surface/40 p-4">
      <div className="mb-3 flex items-start gap-3">
        <Icon
          size={20}
          aria-hidden="true"
          className="mt-0.5 shrink-0 text-accent"
        />
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-fg">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}
