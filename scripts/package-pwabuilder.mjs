import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import yauzl from "yauzl";

const site = new URL(process.env.PWA_URL || process.argv[2] || "https://pro-clubs-america.pages.dev/");
const outputDir = path.resolve(process.env.MOBILE_OUTPUT_DIR || "mobile-packages");
const manifestUrl = new URL("/manifest.webmanifest", site).toString();
const iconUrl = new URL("/brand/pro-clubs-america-512.png", site).toString();
const androidService = "https://pwabuilder-cloudapk.azurewebsites.net";
const iosService = "https://www.pwabuilder.com/api/iospackage/create";

async function checked(response, label) {
  if (response.ok) return response;
  const responseText = await response.text().catch(() => "");
  throw new Error(`${label}_${response.status}: ${responseText.slice(0, 1200)}`);
}

async function loadManifest() {
  const response = await checked(await fetch(manifestUrl, { headers: { "user-agent": "ProClubsAmerica-Packager/1.0" } }), "MANIFEST");
  const value = await response.json();
  if (!value.name || !value.start_url || !Array.isArray(value.icons) || !value.icons.length) throw new Error("MANIFEST_INVALID");
  return value;
}

function readZipEntries(archivePath, requestedNames) {
  return new Promise((resolve, reject) => {
    yauzl.open(archivePath, { lazyEntries: true }, (openError, zip) => {
      if (openError) { reject(openError); return; }
      const result = new Map();
      zip.on("error", reject);
      zip.on("entry", (entry) => {
        if (!requestedNames.has(entry.fileName)) { zip.readEntry(); return; }
        zip.openReadStream(entry, (streamError, stream) => {
          if (streamError) { reject(streamError); return; }
          const chunks = [];
          stream.on("data", (chunk) => chunks.push(chunk));
          stream.on("error", reject);
          stream.on("end", () => { result.set(entry.fileName, Buffer.concat(chunks)); zip.readEntry(); });
        });
      });
      zip.on("end", () => resolve(result));
      zip.readEntry();
    });
  });
}

async function loadExistingAndroidSigning(archivePath) {
  try {
    const entries = await readZipEntries(archivePath, new Set(["signing.keystore", "signing-key-info.txt", "source/app/build.gradle"]));
    const key = entries.get("signing.keystore");
    const info = entries.get("signing-key-info.txt")?.toString("utf8") || "";
    const gradle = entries.get("source/app/build.gradle")?.toString("utf8") || "";
    const field = (label) => info.match(new RegExp(`^${label}:\\s*(.+)$`, "m"))?.[1]?.trim() || "";
    const versionCode = Number(gradle.match(/versionCode\s+(\d+)/)?.[1] || 0);
    if (!key || !field("Key alias") || !field("Key password") || !field("Key store password")) throw new Error("ANDROID_SIGNING_ARCHIVE_INVALID");
    return { file: `data:application/octet-stream;base64,${key.toString("base64")}`, alias: field("Key alias"), keyPassword: field("Key password"), storePassword: field("Key store password"), versionCode };
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

async function packageAndroid(webManifest) {
  const target = path.join(outputDir, "pro-clubs-america-android.zip");
  const existingSigning = await loadExistingAndroidSigning(target);
  const appVersionCode = Number(process.env.MOBILE_VERSION_CODE || (existingSigning ? existingSigning.versionCode + 1 : 1));
  if (!Number.isSafeInteger(appVersionCode) || appVersionCode < 1) throw new Error("ANDROID_VERSION_CODE_INVALID");
  const options = {
    analysisId: null, appVersion: process.env.MOBILE_APP_VERSION || `1.0.0.${appVersionCode - 1}`, appVersionCode,
    backgroundColor: webManifest.background_color || "#061329", display: "standalone",
    enableNotifications: true, enableSiteSettingsShortcut: true, fallbackType: "customtabs",
    features: { locationDelegation: { enabled: false }, playBilling: { enabled: false } },
    host: site.host, iconUrl, includeSourceCode: true, isChromeOSOnly: false, isMetaQuest: false,
    launcherName: "Clubs America", maskableIconUrl: iconUrl, monochromeIconUrl: "", name: "Pro Clubs America",
    navigationColor: "#061329", navigationColorDark: "#061329", navigationDividerColor: "#061329", navigationDividerColorDark: "#061329",
    orientation: "portrait", packageId: "com.proclubsamerica.app", shortcuts: webManifest.shortcuts || [],
    signing: existingSigning ? { file: existingSigning.file, alias: existingSigning.alias, keyPassword: existingSigning.keyPassword, storePassword: existingSigning.storePassword, countryCode: null } : { file: null, alias: "proclubsamerica", fullName: "Pro Clubs America", organization: "Pro Clubs America", organizationalUnit: "Mobile", countryCode: "BR", keyPassword: "", storePassword: "" },
    signingMode: existingSigning ? "mine" : "new", splashScreenFadeOutDuration: 300, startUrl: "/",
    themeColor: webManifest.theme_color || "#0d2347", themeColorDark: "#061329",
    webManifestUrl: manifestUrl, pwaUrl: site.toString(), fullScopeUrl: site.toString(), minSdkVersion: 23,
  };
  const enqueue = await checked(await fetch(`${androidService}/enqueuePackageJob`, { method: "POST", headers: { "content-type": "application/json", "platform-identifier": "pro-clubs-america-script", "platform-identifier-version": "1" }, body: JSON.stringify(options) }), "ANDROID_ENQUEUE");
  const jobId = (await enqueue.text()).replaceAll('"', "").trim();
  if (!jobId) throw new Error("ANDROID_JOB_ID_MISSING");
  const deadline = Date.now() + 12 * 60_000;
  let job;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    const status = await checked(await fetch(`${androidService}/getPackageJob?id=${encodeURIComponent(jobId)}`), "ANDROID_STATUS");
    job = await status.json();
    if (job.status === "Completed") break;
    if (job.status === "Failed") throw new Error(`ANDROID_FAILED: ${(job.errors || []).join("; ")}`);
  }
  if (job?.status !== "Completed") throw new Error("ANDROID_TIMEOUT");
  const archive = await checked(await fetch(`${androidService}/downloadPackageZip?id=${encodeURIComponent(jobId)}`), "ANDROID_DOWNLOAD");
  await writeFile(target, Buffer.from(await archive.arrayBuffer()));
  return { target, jobId, versionCode: appVersionCode, reusedSigningKey: Boolean(existingSigning) };
}

async function packageIos(webManifest) {
  const options = {
    name: "Pro Clubs America", bundleId: "com.proclubsamerica.app", url: site.toString(), imageUrl: iconUrl,
    splashColor: "#061329", progressBarColor: "#fbc02d", statusBarColor: "#061329",
    permittedUrls: [site.host, "accounts.google.com", "primeval-jet-326417.firebaseapp.com", "www.googleapis.com"],
    manifest: webManifest, manifestUrl,
  };
  const response = await checked(await fetch(iosService, { method: "POST", headers: { "content-type": "application/json", "platform-identifier": "pro-clubs-america-script", "platform-identifier-version": "1" }, body: JSON.stringify(options) }), "IOS_PACKAGE");
  const target = path.join(outputDir, "pro-clubs-america-ios.zip");
  await writeFile(target, Buffer.from(await response.arrayBuffer()));
  return { target };
}

await mkdir(outputDir, { recursive: true });
const webManifest = await loadManifest();
const [android, ios] = await Promise.allSettled([packageAndroid(webManifest), packageIos(webManifest)]);
const result = {
  site: site.toString(),
  android: android.status === "fulfilled" ? { ok: true, ...android.value } : { ok: false, error: String(android.reason?.message || android.reason) },
  ios: ios.status === "fulfilled" ? { ok: true, ...ios.value } : { ok: false, error: String(ios.reason?.message || ios.reason) },
};
await writeFile(path.join(outputDir, "package-result.json"), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
if (!result.android.ok || !result.ios.ok) process.exitCode = 1;
