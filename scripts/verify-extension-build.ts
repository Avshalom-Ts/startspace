// verify-extension-build.ts
//
// Verifies that a production build contains the minimum files required to load
// StartSpace as a Manifest V3 extension. It reads only generated local files.

const requiredFiles = [
  "dist/manifest.json",
  "dist/index.html",
  "dist/background.js",
  "dist/icons/icon-16.png",
  "dist/icons/icon-48.png",
  "dist/icons/icon-128.png",
];

/** Exits with a clear error when one or more required extension files are absent. */
async function verifyBuild(): Promise<void> {
  const missing: string[] = [];
  for (const path of requiredFiles) {
    if (!(await Bun.file(path).exists())) missing.push(path);
  }
  if (missing.length > 0) {
    console.error(`Extension build is incomplete. Missing: ${missing.join(", ")}`);
    process.exit(1);
  }

  const manifest = (await Bun.file("dist/manifest.json").json()) as {
    manifest_version?: number;
    chrome_url_overrides?: { newtab?: string };
    background?: { service_worker?: string };
  };
  if (
    manifest.manifest_version !== 3 ||
    manifest.chrome_url_overrides?.newtab !== "index.html" ||
    manifest.background?.service_worker !== "background.js"
  ) {
    console.error("Generated manifest is not a loadable StartSpace MV3 build.");
    process.exit(1);
  }
  console.log("Verified load-unpacked extension in dist/.");
}

await verifyBuild();
