import SettingsCard from "../components/settings-card";
import { Info, ExternalLink, Shield } from "lucide-react";
import GitHubLink from "../../components/ui/github-link";

function getInstalledVersion(): string {
  try {
    return typeof chrome === "undefined"
      ? "Development preview"
      : chrome.runtime.getManifest().version;
  } catch {
    return "Development preview";
  }
}

export default function AboutSettingsSection() {
  return (
    <div className="space-y-3">
      <SettingsCard
        title="StartSpace"
        subtitle="Your browser. Your workspace. Your data."
        icon={Info}
      >
        <div className="space-y-6">
          <p className="max-w-3xl text-sm leading-7 text-fg">
            StartSpace is an open-source, local-first browser homepage and
            workspace. Bring your bookmarks, Markdown notes, and tasks together
            in one place, right from your browser&apos;s New Tab page.
          </p>
          <ul className="grid gap-3 text-sm leading-relaxed text-muted sm:grid-cols-2">
            <li className="rounded-md border border-border/70 bg-page/40 p-3">
              <span className="mb-1 block font-medium text-fg">
                Unified search
              </span>
              Find bookmarks, notes, and tasks from a single search bar, or choose
              Web to search with your browser&apos;s default provider.
            </li>
            <li className="rounded-md border border-border/70 bg-page/40 p-3">
              <span className="mb-1 block font-medium text-fg">
                Browser bookmarks
              </span>
              Keep your favorites close at hand. Your browser remains the source
              of truth for bookmarks.
            </li>
            <li className="rounded-md border border-border/70 bg-page/40 p-3">
              <span className="mb-1 block font-medium text-fg">
                Markdown notes
              </span>
              Write notes as ordinary Markdown files in a folder you choose.
              Open and edit them with other tools, too.
            </li>
            <li className="rounded-md border border-border/70 bg-page/40 p-3">
              <span className="mb-1 block font-medium text-fg">
                Connected tasks
              </span>
              Organize tasks on a local Kanban board and link them to notes and
              bookmarks.
            </li>
          </ul>
          <section
            aria-labelledby="about-local-first"
            className="space-y-3 border-t border-border/70 pt-5"
          >
            <div className="flex items-center gap-2">
              <Shield
                size={17}
                aria-hidden="true"
                className="shrink-0 text-accent"
              />
              <h3 id="about-local-first" className="text-sm font-semibold text-fg">
                Local-first by design
              </h3>
            </div>
            <p className="text-xs font-medium text-muted">
              No account, backend, or cloud service
            </p>
            <p className="text-sm leading-relaxed text-muted">
              StartSpace runs on your computer. Notes and tasks live in your
              chosen workspace folder, along with bookmark metadata under
              .startspace; app settings stay in local browser storage. Local search does not send your workspace
              content to a server.
            </p>
            <p className="border-l-2 border-accent/40 pl-3 text-xs leading-relaxed text-muted">
              When you choose Web search, your query is sent to your
              browser&apos;s default search provider. Opening external links also
              leaves StartSpace. With optional website access, description fetching
              contacts bookmarked websites directly, including automatically
              after saving a bookmark and once per New Tab. Disable either
              automatic behavior in Settings &gt; Links.
            </p>
          </section>
          <section
            aria-labelledby="about-open-source"
            className="space-y-3 border-t border-border/70 pt-5"
          >
            <div className="flex items-center justify-between gap-3">
              <h3 id="about-open-source" className="text-sm font-semibold text-fg">
                Open source
              </h3>
              <GitHubLink />
            </div>
            <p className="text-sm leading-relaxed text-muted">
              StartSpace is open source under the MIT License. Bug reports,
              ideas, documentation improvements, and code contributions are
              welcome. Please do not include private notes, bookmarks, or
              workspace data in public reports.
            </p>
            <a
              href="https://github.com/Avshalom-Ts/startspace/issues"
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-9 items-center gap-2 rounded-md border border-border bg-page/40 px-3 py-2 text-sm text-accent transition-colors hover:border-accent/40 hover:bg-accent/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Report a bug or suggest a feature
              <ExternalLink size={13} aria-hidden="true" />
            </a>
          </section>
          <dl className="grid gap-4 border-t border-border/70 pt-4 text-sm sm:grid-cols-3">
            <div className="space-y-1">
              <dt className="text-muted">Version</dt>
              <dd className="text-fg">{getInstalledVersion()}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-muted">License</dt>
              <dd>
                <a
                  href="https://github.com/Avshalom-Ts/startspace/blob/main/LICENSE"
                  target="_blank"
                  rel="noreferrer"
                  className="text-accent hover:underline"
                >
                  MIT License
                </a>
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="text-muted">Source</dt>
              <dd>
                <a
                  href="https://github.com/Avshalom-Ts/startspace"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-accent hover:underline"
                >
                  GitHub <ExternalLink size={13} aria-hidden="true" />
                </a>
              </dd>
            </div>
          </dl>
        </div>
      </SettingsCard>
    </div>
  );
}
