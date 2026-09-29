// Native modal wrapper: traps focus through showModal and restores it on close.
import { useEffect, useRef, type ReactNode } from "react";
/** Opens an accessible dialog; Escape delegates to the same cancel action. */
export function NotesDialog({ title, children, onCancel }: { title: string; children: ReactNode; onCancel: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const previous = document.activeElement as HTMLElement | null; ref.current?.showModal(); return () => { ref.current?.close(); previous?.focus(); }; }, []);
  return <dialog ref={ref} onCancel={event => { event.preventDefault(); onCancel(); }} aria-label={title} className="m-auto w-[min(92vw,30rem)] rounded-xl border border-border bg-surface p-6 text-fg shadow-xl backdrop:bg-black/60"><h2 className="mb-5 text-xl font-semibold">{title}</h2>{children}</dialog>;
}
