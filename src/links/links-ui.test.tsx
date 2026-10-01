import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { buildFaviconUrl, LinkIcon } from "./links-ui";

describe("buildFaviconUrl", () => {
  it("encodes the page URL for Chrome's extension favicon endpoint", () => {
    const source = buildFaviconUrl(
      "https://docs.example.test/guide?q=1#section",
      "chrome-extension://test-id/_favicon/",
      48,
    );

    expect(source).toBeDefined();
    const parsed = new URL(source!);
    expect(parsed.protocol).toBe("chrome-extension:");
    expect(parsed.hostname).toBe("test-id");
    expect(parsed.pathname).toBe("/_favicon/");
    expect(parsed.searchParams.get("pageUrl")).toBe(
      "https://docs.example.test/guide?q=1#section",
    );
    expect(parsed.searchParams.get("size")).toBe("48");
  });

  it("rejects unsupported or invalid bookmark URLs", () => {
    expect(
      buildFaviconUrl(
        "file:///C:/notes/readme.html",
        "chrome-extension://id/_favicon/",
      ),
    ).toBeUndefined();
    expect(
      buildFaviconUrl("javascript:alert(1)", "chrome-extension://id/_favicon/"),
    ).toBeUndefined();
    expect(
      buildFaviconUrl("not a URL", "chrome-extension://id/_favicon/"),
    ).toBeUndefined();
  });
});

describe("LinkIcon", () => {
  it("renders its local initial when the extension favicon API is unavailable", () => {
    const markup = renderToStaticMarkup(
      <LinkIcon title="Example" url="https://example.test" />,
    );

    expect(markup).toContain(">E</span>");
    expect(markup).not.toContain("_favicon/");
  });
});
