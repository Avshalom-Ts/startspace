// set-release-version.ts
//
// Updates package.json and the extension manifest to the same release version.
// It changes local source files only; it does not commit, tag, or publish.

/** Validates a Chrome-compatible semantic version and updates both source files. */
export async function setReleaseVersion(): Promise<void> {
  const version = Bun.argv[2];
  if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
    console.error("Usage: bun run release:version MAJOR.MINOR.PATCH");
    process.exit(1);
  }

  for (const path of ["package.json", "public/manifest.json"]) {
    const document = (await Bun.file(path).json()) as Record<string, unknown>;
    document.version = version;
    await Bun.write(path, `${JSON.stringify(document, null, 2)}\n`);
  }
  console.log(`Updated package.json and public/manifest.json to ${version}.`);
}

await setReleaseVersion();
