import { WorkspaceSetupPrompt } from "./WorkspaceSetup";
import { WEB_SEARCH_ENGINES, useConfig } from "../hooks/useConfig";
import { useWorkspace } from "../hooks/useWorkspace";
import { useEffect, useState } from "react";

// ---------------------------------------------------------------------------
// SettingsPage
// ---------------------------------------------------------------------------

/**
 * Configuration view for StartSpace. Currently exposes the workspace folder
 * setup so the user can pick or change the local folder notes/tasks live in.
 */
export function SettingsPage() {
  const { config, loading, save } = useConfig();
  const { grant } = useWorkspace();
  const workspaceReady =
    !loading && !!grant.handle && grant.permission === "granted";
  const [selectedTemplate, setSelectedTemplate] = useState(
    WEB_SEARCH_ENGINES[0]!.urlTemplate,
  );
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!config) return;
    setSelectedTemplate(config.webSearchEngine.urlTemplate);
  }, [config]);

  const saveEngine = async () => {
    const engine = WEB_SEARCH_ENGINES.find(
      (candidate) => candidate.urlTemplate === selectedTemplate,
    );
    if (!config || !engine) return;
    await save({
      ...config,
      webSearchEngine: engine,
    });
    setMessage("Web search engine saved.");
  };

  return (
    <section className="w-full flex flex-col justify-center items-center">
      <div>
        <h3 className="text-base font-medium text-fg mb-1">Workspace</h3>
        <p className="text-sm text-muted mb-4">
          Notes and tasks are stored as files in a folder you choose on your
          computer.
        </p>
        {!workspaceReady && (
          <div
            className="mb-4 rounded-md border border-accent/50 bg-page p-3 text-sm text-fg"
            role="alert"
          >
            Workspace folder is not selected. Notes and tasks are currently
            disabled until you choose one below.
          </div>
        )}
        <WorkspaceSetupPrompt />
      </div>

      <div className="mt-8 max-w-xl border-t border-border pt-6">
        <h3 className="mb-1 text-base font-medium text-fg">Web search</h3>
        <p className="mb-4 text-sm text-muted">
          Used when the homepage search falls through to the web.
        </p>
        <div className="grid gap-3">
          <label className="text-sm text-fg">
            Search engine
            <select
              value={selectedTemplate}
              onChange={(event) => setSelectedTemplate(event.target.value)}
              className="mt-1 w-full border border-border bg-surface px-3 py-2 text-sm text-fg focus:outline-none"
            >
              {WEB_SEARCH_ENGINES.map((engine) => (
                <option key={engine.urlTemplate} value={engine.urlTemplate}>
                  {engine.name}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-center gap-3">
            <button
              onClick={() => void saveEngine()}
              disabled={loading}
              className="border border-border bg-page px-3 py-2 text-sm text-fg hover:border-fg/40 disabled:opacity-50"
            >
              Save web search
            </button>
            {message && (
              <span className="text-sm text-muted" role="status">
                {message}
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
