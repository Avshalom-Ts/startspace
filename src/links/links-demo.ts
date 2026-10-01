// Synthetic, explicitly opt-in Links design preview (#links?demo=1). Mirrors the
// reference composition; never persisted or mixed with real browser bookmarks.
import type { BookmarkMetadata, BookmarkNode } from "../hooks/useBookmarks";
import type { Task } from "../tasks/tasks-model";
import { demoIndex } from "../notes/notes-demo";

const created = Date.parse("2026-01-15T10:24:00Z");

/** Builds one demo link node. */
function link(
  id: string,
  parentId: string,
  title: string,
  url: string,
): BookmarkNode {
  return { id, parentId, title, url, dateAdded: created };
}

/** Builds one demo folder node. */
function folder(
  id: string,
  parentId: string,
  title: string,
  children: BookmarkNode[],
): BookmarkNode {
  return { id, parentId, title, children, dateAdded: created };
}

export const demoLinksTree: BookmarkNode[] = [
  folder("demo-root", "", "Bookmarks bar", [
    folder("demo-personal", "demo-root", "Personal", [
      folder("demo-homelab", "demo-personal", "Home Lab", [
        link(
          "demo-proxmox",
          "demo-homelab",
          "Proxmox",
          "https://www.proxmox.com",
        ),
        link(
          "demo-homeassistant",
          "demo-homelab",
          "Home Assistant",
          "https://www.home-assistant.io",
        ),
        link("demo-hermes", "demo-homelab", "Hermes", "http://localhost:11434"),
      ]),
      folder("demo-tools", "demo-personal", "Tools", [
        link(
          "demo-vscode",
          "demo-tools",
          "VS Code",
          "https://code.visualstudio.com",
        ),
        link("demo-lmstudio", "demo-tools", "LM Studio", "https://lmstudio.ai"),
      ]),
      folder("demo-shopping", "demo-personal", "Shopping", []),
    ]),
    folder("demo-work", "demo-root", "Work", [
      folder("demo-dev", "demo-work", "Development", [
        link("demo-github", "demo-dev", "GitHub", "https://github.com"),
      ]),
      folder("demo-devops", "demo-work", "DevOps", [
        link("demo-docker", "demo-devops", "Docker", "https://www.docker.com"),
        link("demo-grafana", "demo-devops", "Grafana", "https://grafana.com"),
      ]),
      folder("demo-security", "demo-work", "Security", [
        link(
          "demo-cloudflare",
          "demo-security",
          "Cloudflare",
          "https://www.cloudflare.com",
        ),
        link("demo-netbird", "demo-security", "NetBird", "https://netbird.io"),
      ]),
    ]),
    folder("demo-learning", "demo-root", "Learning", [
      folder("demo-linux", "demo-learning", "Linux", [
        link("demo-debian", "demo-linux", "Debian", "https://www.debian.org"),
      ]),
      folder("demo-kubernetes", "demo-learning", "Kubernetes", [
        link(
          "demo-k8s",
          "demo-kubernetes",
          "Kubernetes",
          "https://kubernetes.io",
        ),
      ]),
      link(
        "demo-youtube",
        "demo-learning",
        "YouTube",
        "https://www.youtube.com",
      ),
      link("demo-ollama", "demo-learning", "Ollama", "https://ollama.com"),
      link("demo-reddit", "demo-learning", "Reddit", "https://www.reddit.com"),
    ]),
  ]),
];

const [labGuide, networkPlanning] = demoIndex.notes;

/** Creates demo metadata with recent-open dates relative to `now`. */
export function createDemoLinksMetadata(
  now: number,
): Record<string, BookmarkMetadata> {
  const daysAgo = (days: number) =>
    new Date(now - days * 86_400_000).toISOString();
  const entry = (patch: Partial<BookmarkMetadata>): BookmarkMetadata => ({
    favorites: false,
    tags: [],
    dateAdded: "2026-01-15T10:24:00Z",
    relatedNotes: [],
    relatedTasks: [],
    ...patch,
  });
  return {
    "demo-proxmox": entry({
      favorites: true,
      tags: ["homelab", "infrastructure"],
      description: "Open source virtualization platform for the home lab.",
      relatedNotes: [
        labGuide!.id,
        networkPlanning!.id,
        "Archive/Removed note.md",
      ],
      lastOpenedAt: daysAgo(1),
      updatedAt: "2026-08-20T14:32:00Z",
    }),
    "demo-docker": entry({
      tags: ["devops", "containers"],
      lastOpenedAt: daysAgo(3),
    }),
    "demo-k8s": entry({ tags: ["devops", "kubernetes"] }),
    "demo-github": entry({
      favorites: true,
      tags: ["development", "git"],
      lastOpenedAt: daysAgo(0),
    }),
    "demo-youtube": entry({
      tags: ["media", "learning"],
      lastOpenedAt: daysAgo(40),
    }),
    "demo-reddit": entry({ tags: ["community", "news"] }),
    "demo-debian": entry({ tags: ["linux", "os"] }),
    "demo-grafana": entry({
      tags: ["monitoring", "analytics"],
      lastOpenedAt: daysAgo(6),
    }),
    "demo-homeassistant": entry({
      favorites: true,
      tags: ["smarthome", "iot"],
    }),
    "demo-netbird": entry({ tags: ["vpn", "networking"] }),
    "demo-cloudflare": entry({ tags: ["dns", "security"] }),
    "demo-vscode": entry({ tags: ["development", "editor"] }),
    "demo-ollama": entry({ favorites: true, tags: ["ai", "llm"] }),
    "demo-lmstudio": entry({ tags: ["ai", "llm"] }),
    "demo-hermes": entry({ favorites: true, tags: ["ai", "local"] }),
  };
}

export const demoLinksNotes = demoIndex.notes;

export const demoLinksTasks: Task[] = [
  {
    id: "demo-task-cluster",
    title: "Upgrade the lab cluster",
    description: "",
    status: "in-progress",
    createdAt: "2026-09-01T09:00:00Z",
    updatedAt: "2026-09-20T09:00:00Z",
    noteIds: [],
    bookmarkIds: ["demo-proxmox"],
  },
];
