// verify-release-version.ts
//
// Prevents a Chrome release when its tag, package version, and manifest version
// differ. Chrome only accepts a package whose manifest version has increased.

interface PackageDocument {
  version?: string;
}

interface ManifestDocument {
  version?: string;
}

/** Reads the version files and exits unsuccessfully when release signals differ. */
export async function verifyReleaseVersion(): Promise<void> {
  const releaseVersion = process.env.RELEASE_VERSION;
  if (!releaseVersion || !/^\d+\.\d+\.\d+$/.test(releaseVersion)) {
    console.error("RELEASE_VERSION must use MAJOR.MINOR.PATCH.");
    process.exit(1);
  }

  const packageDocument = (await Bun.file(
    "package.json",
  ).json()) as PackageDocument;
  const manifestDocument = (await Bun.file(
    "public/manifest.json",
  ).json()) as ManifestDocument;
  const versions = [packageDocument.version, manifestDocument.version];
  if (versions.some((version) => version !== releaseVersion)) {
    console.error(
      `Release ${releaseVersion} does not match package.json (${packageDocument.version ?? "missing"}) and public/manifest.json (${manifestDocument.version ?? "missing"}).`,
    );
    process.exit(1);
  }
  console.log(`Verified release version ${releaseVersion}.`);
}

await verifyReleaseVersion();
