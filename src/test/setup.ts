// Vitest browser-environment setup shared by extension unit tests.
//
// Bun's JSDOM environment does not expose localStorage. Supply the browser
// Storage contract in the test realm so preference and backup tests use an
// isolated, clearable store.

/** Creates an isolated in-memory implementation of the browser Storage API. */
function createStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() { return values.size; },
    clear: () => values.clear(),
    getItem: (key) => values.get(String(key)) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => { values.delete(String(key)); },
    setItem: (key, value) => { values.set(String(key), String(value)); },
  };
}

if (!globalThis.localStorage) {
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: createStorage(),
  });
}
