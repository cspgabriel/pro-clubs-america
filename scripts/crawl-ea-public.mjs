import { chromium } from "playwright";

const siteUrl = (process.env.PCA_SITE_URL || "https://pro-clubs-america.pages.dev").replace(/\/$/, "");
const ingestSecret = process.env.EA_INGEST_SECRET || "";
const limit = Math.max(1, Math.min(Number(process.env.CRAWL_LIMIT || 3), 10));
const parserVersion = "playwright-public-page-v1";
const userAgent = "ProClubsAmericaCrawler/1.0 (+https://proclubsamerica.com)";
if (!ingestSecret) throw new Error("EA_INGEST_SECRET_REQUIRED");

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const number = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const text = (value, fallback = "") => String(value ?? fallback).trim();

async function robotsAllows(pathname) {
  const response = await fetch("https://www.ea.com/robots.txt", { headers: { "user-agent": userAgent } });
  if (!response.ok) throw new Error(`ROBOTS_${response.status}`);
  const lines = (await response.text()).split(/\r?\n/).map((line) => line.replace(/#.*$/, "").trim()).filter(Boolean);
  let applies = false;
  const disallowed = [];
  for (const line of lines) {
    const [field, ...rest] = line.split(":");
    const value = rest.join(":").trim();
    if (field.toLowerCase() === "user-agent") applies = value === "*";
    else if (applies && field.toLowerCase() === "disallow" && value) disallowed.push(value);
  }
  return !disallowed.some((rule) => pathname.startsWith(rule));
}

function matchList(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  const values = Object.values(payload);
  const arrays = values.filter(Array.isArray).flat();
  if (arrays.length) return arrays;
  return values.filter((value) => value && typeof value === "object" && (value.clubs || value.matchId || value.timestamp));
}

function timestamp(value) {
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 0) return new Date(numeric < 10_000_000_000 ? numeric * 1000 : numeric).toISOString();
  const parsed = new Date(String(value || ""));
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function playerRows(rawPlayers, clubIds) {
  if (!rawPlayers || typeof rawPlayers !== "object") return [];
  const rows = [];
  for (const clubId of clubIds) {
    const clubPlayers = rawPlayers[clubId] || rawPlayers[String(clubId)] || {};
    const players = Array.isArray(clubPlayers) ? clubPlayers : Object.values(clubPlayers);
    for (const player of players) {
      if (!player || typeof player !== "object") continue;
      const name = text(player.playername || player.playerName || player.name || player.eaId);
      if (!name) continue;
      rows.push({
        playerId: text(player.playerId || player.nucleusId || name), playerName: name,
        position: text(player.pos || player.position || player.favoritePosition), goals: number(player.goals), assists: number(player.assists),
        rating: player.rating == null ? undefined : number(player.rating), shots: player.shots == null ? undefined : number(player.shots),
        passesMade: player.passesMade == null ? undefined : number(player.passesMade), passAttempts: player.passAttempts == null ? undefined : number(player.passAttempts),
        tacklesMade: player.tacklesMade == null ? undefined : number(player.tacklesMade), tackleAttempts: player.tackleAttempts == null ? undefined : number(player.tackleAttempts),
        redCards: player.redCards == null ? undefined : number(player.redCards), saves: player.saves == null ? undefined : number(player.saves),
        cleanSheet: Boolean(player.cleanSheet || player.cleanSheets),
      });
    }
  }
  return rows;
}

function normalize(payload, mode, sourceUrl, requestedClubId) {
  const normalized = [];
  for (const raw of matchList(payload)) {
    const clubsObject = raw?.clubs && typeof raw.clubs === "object" ? raw.clubs : {};
    const entries = Object.entries(clubsObject).map(([id, value]) => ({ id: text(value?.clubId || id), ...value }));
    if (entries.length < 2) continue;
    entries.sort((left, right) => {
      const side = (club) => number(club.teamSide ?? club.side ?? club.details?.teamSide, 99);
      return side(left) - side(right) || (left.id === requestedClubId ? -1 : 1);
    });
    const [home, away] = entries;
    const playedAt = timestamp(raw.timestamp || raw.playedAt || raw.matchTimestamp || raw.date);
    if (!playedAt) continue;
    normalized.push({
      mode, playedAt,
      homeClubId: home.id, homeClubName: text(home.name || home.clubName || home.details?.name, `Clube ${home.id}`),
      awayClubId: away.id, awayClubName: text(away.name || away.clubName || away.details?.name, `Clube ${away.id}`),
      homeScore: number(home.goals ?? home.score), awayScore: number(away.goals ?? away.score),
      competition: "EA SPORTS FC Clubs", sourceUrl,
      players: playerRows(raw.players, [home.id, away.id]),
    });
  }
  return normalized;
}

async function clickMode(page, names) {
  for (const role of ["tab", "button", "link"]) {
    const locator = page.getByRole(role, { name: new RegExp(names, "i") });
    if (await locator.count()) {
      await locator.first().click({ force: true, timeout: 5000 }).catch(() => undefined);
      await sleep(3500);
      return true;
    }
  }
  return false;
}

async function crawlClub(browser, item) {
  const sourceUrl = `https://www.ea.com/pt-br/games/ea-sports-fc/clubs/match-history?clubId=${encodeURIComponent(item.clubId)}&platform=${encodeURIComponent(item.platform)}`;
  if (!(await robotsAllows(new URL(sourceUrl).pathname))) return { status: "blocked", error: "ROBOTS_DISALLOW", responseCount: 0, matches: [] };
  const context = await browser.newContext({ locale: "pt-BR", userAgent });
  const page = await context.newPage();
  const observed = [];
  page.on("response", (response) => {
    const url = response.url();
    if (!url.startsWith("https://proclubs.ea.com/") || !url.includes("/clubs/matches")) return;
    response.body().then((body) => {
      try {
        const requestUrl = new URL(url);
        const rawMode = requestUrl.searchParams.get("matchType") || "leagueMatch";
        const mode = ["leagueMatch", "friendlyMatch", "playoffMatch"].includes(rawMode) ? rawMode : "leagueMatch";
        observed.push({ mode, payload: JSON.parse(body.toString("utf8")) });
      } catch { /* invalid responses are ignored and classified below */ }
    }).catch(() => undefined);
  });
  try {
    const response = await page.goto(sourceUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
    if (!response || response.status() >= 400) throw new Error(`PAGE_${response?.status() || "NO_RESPONSE"}`);
    const reject = page.getByRole("button", { name: /Recusar|Reject|Rechazar/i });
    if (await reject.count()) await reject.first().click({ force: true, timeout: 3000 }).catch(() => undefined);
    await sleep(7000);
    await clickMode(page, "Friendly|Amistoso");
    await clickMode(page, "Playoff|Mata-mata");
    await sleep(1500);
    const matches = observed.flatMap((entry) => normalize(entry.payload, entry.mode, sourceUrl, item.clubId));
    return { status: observed.length ? "succeeded" : "failed", error: observed.length ? undefined : "PUBLIC_PAGE_DATA_NOT_OBSERVED", responseCount: observed.length, matches };
  } catch (error) {
    const message = error instanceof Error ? error.message : "CRAWL_FAILED";
    return { status: /captcha|access denied|forbidden/i.test(message) ? "blocked" : "failed", error: message.slice(0, 400), responseCount: observed.length, matches: [] };
  } finally { await context.close().catch(() => undefined); }
}

async function ingest(item, result) {
  const response = await fetch(`${siteUrl}/api/internal/ea-ingest`, {
    method: "POST", headers: { authorization: `Bearer ${ingestSecret}`, "content-type": "application/json" },
    body: JSON.stringify({ parserVersion, source: "ea-public-page-playwright", startedAt: new Date().toISOString(), matches: result.matches, metadata: { queueId: item.queueId, attempts: item.attempts, clubId: item.clubId, platform: item.platform, responseCount: result.responseCount, collectionStatus: result.status, error: result.error } }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok && result.status === "succeeded") throw new Error(`INGEST_${response.status}:${payload.error || "unknown"}`);
  return { httpStatus: response.status, ...payload };
}

const queueResponse = await fetch(`${siteUrl}/api/internal/ea-ingest?limit=${limit}`, { headers: { authorization: `Bearer ${ingestSecret}` } });
if (!queueResponse.ok) throw new Error(`QUEUE_${queueResponse.status}`);
const queue = await queueResponse.json();
if (!queue.items?.length) { console.log(JSON.stringify({ status: "idle", processed: 0 })); process.exit(0); }

const launchOptions = { headless: true, args: ["--disable-http2", "--no-sandbox"] };
if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH) launchOptions.executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
const browser = await chromium.launch(launchOptions);
const report = [];
try {
  for (const item of queue.items) {
    const result = await crawlClub(browser, item);
    const stored = await ingest(item, result);
    report.push({ clubId: item.clubId, status: result.status, responses: result.responseCount, matches: result.matches.length, ingestStatus: stored.status || stored.httpStatus });
    await sleep(2500 + Math.floor(Math.random() * 1500));
  }
} finally { await browser.close(); }
console.log(JSON.stringify({ status: report.some((item) => item.status !== "succeeded") ? "partial" : "succeeded", processed: report.length, report }, null, 2));
if (report.every((item) => item.status !== "succeeded")) process.exitCode = 1;
