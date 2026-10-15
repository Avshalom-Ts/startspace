// Native modal for creating a task with its title, description, and column.
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import type { Task, TaskColumn } from "./tasks-model";

export type TaskCreateInput = Pick<
  Task,
  "title" | "description" | "status"
>;

/** Collects a new task, trapping focus and retaining the draft on save failure. */
export function TaskCreateDialog({
  columns,
  initialStatus,
  onCreate,
  onClose,
  loading = false,
}: {
  loading?: boolean;
  columns: TaskColumn[];
  initialStatus: string;
  onCreate: (input: TaskCreateInput) => Promise<boolean>;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const submittingRef = useRef(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState(initialStatus);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const columnId = columns.some((column) => column.id === status)
    ? status
    : (columns[0]?.id ?? "");

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    dialog?.showModal();
    titleRef.current?.focus();
    return () => {
      dialog?.close();
      previous?.focus();
    };
  }, []);

  /** Validates and saves the entire draft, closing only after a successful write. */
  const submit = async () => {
    if (submittingRef.current || loading) return;
    if (!title.trim()) {
      setError("Enter a task title.");
      titleRef.current?.focus();
      return;
    }
    if (!columnId) {
      setError("Choose an existing task column.");
      return;
    }
    submittingRef.current = true;
    setSaving(true);
    setError("");
    try {
      if (
        await onCreate({ title: title.trim(), description, status: columnId })
      ) {
        onClose();
      }
    } catch {
      // The global notification area owns workspace-operation failures.
      setError(
        "Task could not be created. Your draft is still here; try again.",
      );
    } finally {
      submittingRef.current = false;
      setSaving(false);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="create-task-heading"
      onCancel={(event) => {
        event.preventDefault();
        if (!submittingRef.current) onClose();
      }}
      className="app-scrollbar m-auto max-h-[90dvh] w-[min(92vw,36rem)] overflow-y-auto rounded-xl border border-border bg-surface p-5 text-fg shadow-xl backdrop:bg-black/60"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 id="create-task-heading" className="text-lg font-semibold">
          Add task
        </h2>
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          aria-label="Close new task"
          title="Close new task"
          className="cursor-pointer disabled:cursor-not-allowed rounded p-1 text-muted hover:bg-page hover:text-fg disabled:opacity-50"
        >
          <X size={20} aria-hidden="true" />
        </button>
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <fieldset
          disabled={saving || loading}
          className="space-y-4 disabled:opacity-60"
        >
          <label className="block text-sm font-medium">
            Title
            <input
              ref={titleRef}
              required
              dir="auto"
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
                setError("");
              }}
              className="mt-1 w-full rounded-md border border-border bg-page px-3 py-2 text-start text-sm focus:border-accent focus:outline-none"
            />
          </label>
          <label className="block text-sm font-medium">
            Description
            <textarea
              dir="auto"
              value={description}
              rows={4}
              onChange={(event) => setDescription(event.target.value)}
              className="mt-1 w-full resize-y rounded-md border border-border bg-page px-3 py-2 text-start text-sm focus:border-accent focus:outline-none"
            />
          </label>
          <label className="block text-sm font-medium">
            Column
            <select
              value={columnId}
              onChange={(event) => setStatus(event.target.value)}
              className="cursor-pointer disabled:cursor-not-allowed mt-1 w-full rounded-md border border-border bg-page px-3 py-2 text-sm focus:border-accent focus:outline-none"
            >
              {columns.map((column) => (
                <option dir="auto" key={column.id} value={column.id}>
                  {column.title}
                </option>
              ))}
            </select>
          </label>
        </fieldset>
        {error && (
          <p role="alert" className="mt-3 text-sm text-red-500">
            {error}
          </p>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="cursor-pointer disabled:cursor-not-allowed rounded-md border border-border px-3 py-2 text-sm hover:bg-page disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || loading || !columnId}
            className="cursor-pointer disabled:cursor-not-allowed rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-foreground disabled:opacity-50"
          >
            {saving ? "Creating…" : "Create task"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
