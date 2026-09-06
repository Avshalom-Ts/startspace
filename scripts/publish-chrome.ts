// publish-chrome.ts
//
// Uploads a previously built ZIP to the Chrome Web Store API v2 and submits it
// for review. Credentials and item identifiers are read from CI environment
// variables and are never stored in the repository or printed.

const API_ORIGIN = "https://chromewebstore.googleapis.com";

interface UploadResponse {
  uploadState?: string;
}

/** Reads a required CI variable without echoing secret values. */
function requiredEnvironment(name: string): string {
  const value = process.env[name];
  if (!value)
    throw new Error(`Required environment variable ${name} is missing.`);
  return value;
}

/** Calls the Chrome Web Store API and returns its parsed JSON response. */
async function chromeRequest<T>(
  url: string,
  token: string,
  init: RequestInit,
): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...init.headers,
    },
  });
  const body = await response.text();
  if (!response.ok) {
    throw new Error(
      `Chrome Web Store API returned ${response.status}: ${body.slice(0, 500)}`,
    );
  }
  return body ? (JSON.parse(body) as T) : ({} as T);
}

/** Waits for asynchronous package validation before requesting publication. */
async function waitForUpload(
  itemName: string,
  token: string,
  initialState: string | undefined,
): Promise<void> {
  let state = initialState;
  for (
    let attempt = 0;
    attempt < 24 && state === "UPLOAD_IN_PROGRESS";
    attempt++
  ) {
    await Bun.sleep(5_000);
    const status = await chromeRequest<UploadResponse>(
      `${API_ORIGIN}/v2/${itemName}:fetchStatus`,
      token,
      { method: "GET" },
    );
    state = status.uploadState;
  }
  if (state !== "UPLOAD_SUCCESS") {
    throw new Error(
      `Chrome rejected or did not finish validating the upload (${state ?? "unknown state"}).`,
    );
  }
}

/** Uploads the release ZIP and requests automatic publication after review. */
export async function publishChromeExtension(): Promise<void> {
  const token = requiredEnvironment("CHROME_ACCESS_TOKEN");
  const publisherId = requiredEnvironment("CHROME_PUBLISHER_ID");
  const extensionId = requiredEnvironment("CHROME_EXTENSION_ID");
  const zipPath = requiredEnvironment("CHROME_ZIP_PATH");
  const itemName = `publishers/${publisherId}/items/${extensionId}`;
  const zip = Bun.file(zipPath);
  if (!(await zip.exists()))
    throw new Error(`Release package ${zipPath} does not exist.`);

  console.log("Uploading extension package to the Chrome Web Store…");
  const upload = await chromeRequest<UploadResponse>(
    `${API_ORIGIN}/upload/v2/${itemName}:upload`,
    token,
    {
      method: "POST",
      headers: { "Content-Type": "application/zip" },
      body: zip,
    },
  );
  await waitForUpload(itemName, token, upload.uploadState);

  console.log("Submitting extension for Chrome Web Store review…");
  await chromeRequest(`${API_ORIGIN}/v2/${itemName}:publish`, token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      publishType: "DEFAULT_PUBLISH",
      blockOnWarnings: true,
    }),
  });
  console.log("Submitted successfully; Chrome will publish it after approval.");
}

await publishChromeExtension();
