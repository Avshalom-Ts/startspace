import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { GITHUB_URL } from "../../data/nav";
import AboutSettingsSection from "./about-settings-section";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => vi.unstubAllGlobals());

it("shows the app overview, data ownership, and public project links", async () => {
  vi.stubGlobal("chrome", {
    runtime: { getManifest: () => ({ version: "0.1.0" }) },
  });
  const container = document.createElement("div");
  const root = createRoot(container);

  try {
    await act(async () => root.render(<AboutSettingsSection />));

    expect(container.textContent).toContain("0.1.0");
    expect(container.textContent).toContain("Markdown notes");
    expect(container.textContent).toContain("No account, backend, or cloud service");
    expect(container.textContent).toContain("default search provider");
    expect(container.textContent).toContain("Please do not include private");
    expect(
      container.querySelector('[aria-label="View source on GitHub"] svg'),
    ).not.toBeNull();
    expect(
      Array.from(container.querySelectorAll("a"), (link) => ({
        href: link.getAttribute("href"),
        target: link.target,
        rel: link.rel,
      })).sort((a, b) => (a.href ?? "").localeCompare(b.href ?? "")),
    ).toEqual([
      {
        href: "https://github.com/Avshalom-Ts/startspace/blob/main/LICENSE",
        target: "_blank",
        rel: "noreferrer",
      },
      {
        href: "https://github.com/Avshalom-Ts/startspace",
        target: "_blank",
        rel: "noreferrer",
      },
      {
        href: GITHUB_URL,
        target: "_blank",
        rel: "noopener noreferrer",
      },
      {
        href: "https://github.com/Avshalom-Ts/startspace/issues",
        target: "_blank",
        rel: "noreferrer",
      },
    ].sort((a, b) => a.href.localeCompare(b.href)));
  } finally {
    await act(async () => root.unmount());
  }
});
