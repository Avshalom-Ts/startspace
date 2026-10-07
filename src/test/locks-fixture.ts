import { vi } from "vitest";

export function installLocks() {
  const queues = new Map<string, Promise<unknown>>();
  vi.stubGlobal("navigator", {
    locks: {
      request: async (
        name: string,
        optionsOrCallback: { ifAvailable?: boolean } | ((lock: { name: string } | null) => Promise<unknown>),
        callback?: (lock: { name: string } | null) => Promise<unknown>,
      ) => {
        const operation = typeof optionsOrCallback === "function" ? optionsOrCallback : callback!;
        const previous = queues.get(name);
        if (typeof optionsOrCallback !== "function" && optionsOrCallback.ifAvailable && previous)
          return operation(null);
        const next = (previous ?? Promise.resolve()).catch(() => undefined)
          .then(() => operation({ name }));
        queues.set(name, next);
        try { return await next; }
        finally { if (queues.get(name) === next) queues.delete(name); }
      },
    },
  });
}
