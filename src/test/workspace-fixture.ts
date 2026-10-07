export function workspaceFixture(initial: Record<string, string> = {}) {
  const files = new Map(Object.entries(initial));
  const failWrites = new Set<string>();
  const directories = new Set<string>([""]);
  let onRead: ((path: string) => void) | undefined;
  for (const path of files.keys()) {
    const parts = path.split("/");
    parts.pop();
    while (parts.length) {
      directories.add(parts.join("/"));
      parts.pop();
    }
  }
  const missing = () => new DOMException("Missing", "NotFoundError");
  const directory = (prefix: string): FileSystemDirectoryHandle => ({
    kind: "directory", name: prefix.split("/").pop() || "Fixture",
    isSameEntry: async (other: FileSystemHandle) => other === handle,
    getDirectoryHandle: async (name: string, options?: FileSystemGetDirectoryOptions) => {
      const path = prefix ? `${prefix}/${name}` : name;
      if (!directories.has(path)) {
        if (!options?.create) throw missing();
        directories.add(path);
      }
      return directory(path);
    },
    getFileHandle: async (name: string, options?: FileSystemGetFileOptions) => {
      const path = prefix ? `${prefix}/${name}` : name;
      if (!files.has(path)) {
        if (!options?.create) throw missing();
        files.set(path, "");
      }
      return {
        kind: "file", name,
        getFile: async () => {
          onRead?.(path);
          const text = files.get(path)!;
          return {
            text: async () => text,
            arrayBuffer: async () => new TextEncoder().encode(text).buffer,
          };
        },
        createWritable: async () => {
          let next = "";
          return {
            write: async (text: string | Uint8Array) => {
              if (failWrites.has(path)) throw new Error("Synthetic disk failure");
              next = typeof text === "string" ? text : new TextDecoder().decode(text);
            },
            close: async () => { files.set(path, next); },
            abort: async () => undefined,
          };
        },
      } as unknown as FileSystemFileHandle;
    },
    removeEntry: async (name: string) => { files.delete(prefix ? `${prefix}/${name}` : name); },
    values: async function* () {
      for (const path of directories) {
        if (path && (prefix ? path.startsWith(`${prefix}/`) : true)) {
          const relative = prefix ? path.slice(prefix.length + 1) : path;
          if (!relative.includes("/")) yield directory(path);
        }
      }
      for (const path of files.keys()) {
        const relative = prefix ? path.startsWith(`${prefix}/`) ? path.slice(prefix.length + 1) : null : path;
        if (relative && !relative.includes("/")) yield await directory(prefix).getFileHandle(relative);
      }
    },
  }) as unknown as FileSystemDirectoryHandle;
  const handle = directory("");
  return { handle, files, failWrites, onRead: (callback: (path: string) => void) => { onRead = callback; } };
}
