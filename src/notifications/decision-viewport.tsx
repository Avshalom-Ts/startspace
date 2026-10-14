// Renders one persistent global decision message above the application shell.
// Decision messages require an explicit action or dismissal; transient feedback
// remains owned by notification-viewport.tsx.
import { AlertTriangle, X } from "lucide-react";
import type { DecisionMessage } from "./notification-context";

/** Displays an accessible, non-modal top-center decision prompt. */
export function DecisionViewport({
  decision,
  onDismiss,
}: {
  decision: DecisionMessage | null;
  onDismiss: () => void;
}) {
  if (!decision) return null;
  return (
    <section
      role="alertdialog"
      aria-labelledby="decision-message-title"
      aria-describedby="decision-message-description"
      className="fixed left-1/2 top-4 z-[70] w-[min(34rem,calc(100vw-2rem))] -translate-x-1/2 rounded-lg border border-amber-500/70 bg-page p-4 text-fg shadow-xl"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle
          size={22}
          aria-hidden="true"
          className="mt-0.5 shrink-0 text-amber-500"
        />
        <div className="min-w-0 flex-1">
          <h2 id="decision-message-title" className="font-semibold">
            {decision.title}
          </h2>
          <p id="decision-message-description" className="mt-1 text-sm text-muted">
            {decision.message}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {decision.actions.map((action, index) => (
              <button
                key={action.label}
                type="button"
                autoFocus={index === 0}
                className={index === 0 ? "notes-primary" : "notes-button"}
                onClick={() => {
                  action.onClick();
                  onDismiss();
                }}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
        <button
          type="button"
          className="notes-icon-button shrink-0"
          aria-label="Dismiss decision message"
          title="Dismiss"
          onClick={onDismiss}
        >
          <X size={20} aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
