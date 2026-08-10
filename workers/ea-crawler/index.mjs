import puppeteer from "@cloudflare/puppeteer";

const PARSER_VERSION = "cloudflare-browser-public-page-v1";
const USER_AGENT = "ProClubsAmericaCrawler/1.0 (+https://proclubsamerica.com)";
const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const safeText = (value, fallback = "") => String(value ?? fallback).trim();
const safeNumber = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;

function listMatches(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  const values = Object.values(payload);
  const arrays = values.filter(Array.isArray).flat();
  return arrays.length ? arrays : values.filter((value) => value && typeof value === "object" && (value.clubs || value.matchId || value.timestamp));
}

function playedAt(value) {
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 0) return new Date(numeric < 10_000_000_000 ? numeric * 1000 : numeric).toISOString();
  const parsed = new Date(String(value || ""));
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function players(payload, clubIds) {
  if (!payload || typeof payload !== "object") return [];
  return clubIds.flatMap((clubId) => {
    const collection = payload[clubId] || {};
    return (Array.isArray(collection) ? collection : Object.values(collection)).flatMap((player) => {
      const name = safeText(player?.playername || player?.playerName || player?.name || player?.eaId);
      return name ? [{ playerId: safeText(player.playerId || player.nucleusId || name), playerName: name, position: safeText(player.pos || player.position || player.favoritePosition), goals: safeNumber(player.goals), assists: safeNumber(player.assists), rating: player.rating == null ? undefined : safeNumber(player.rating), shots: player.shots == null ? undefined : safeNumber(player.shots), passesMade: player.passesMade == null ? undefined : safeNumber(player.passesMade), passAttempts: player.passAttempts == null ? undefined : safeNumber(player.passAttempts), tacklesMade: player.tacklesMade == null ? undefined : safeNumber(player.tacklesMade), tackleAttempts: player.tackleAttempts == null ? undefined : safeNumber(player.tackleAttempts), redCards: player.redCards == null ? undefined : safeNumber(player.redCards), saves: player.saves == null ? undefined : safeNumber(player.saves), cleanSheet: Boolean(player.cleanSheet || player.cleanSheets) }] : [];
    });
  });
}

function normalize(payload, mode, sourceUrl, requestedClubId) {
  return listMatches(payload).flatMap((raw) => {
    const clubRows = raw?.clubs && typeof raw.clubs === "object" ? Object.entries(raw.clubs).map(([id, club]) => ({ id: safeText(club?.clubId || id), ...club })) : [];
    if (clubRows.length < 2) return [];
    clubRows.sort((left, right) => safeNumber(left.teamSide ?? left.side ?? left.details?.teamSide, 99) - safeNumber(right.teamSide ?? right.side ?? right.details?.teamSide, 99) || (left.id === requestedClubId ? -1 : 1));
    const [home, away] = clubRows;
    const date = playedAt(raw.timestamp || raw.playedAt || raw.matchTimestamp || raw.date);
    if (!date) return [];
    return [{ mode, playedAt: date, homeClubId: home.id, homeClubName: safeText(home.name || home.clubName || home.details?.name, `Clube ${home.id}`), awayClubId: away.id, awayClubName: safeText(away.name || away.clubName || away.details?.name, `Clube ${away.id}`), homeScore: safeNumber(home.goals ?? home.score), awayScore: safeNumber(away.goals ?? away.score), competition: "EA SPORTS FC Clubs", sourceUrl, players: players(raw.players, [home.id, away.id]) }];
  });
}

async function robotsAllows(pathname) {
  const response = await fetch("https://www.ea.com/robots.txt", { headers: { "user-agent": USER_AGENT } });
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

async function clickMode(page, labels) {
  return page.evaluate((wanted) => {
    const elements = [];
    const visit = (root) => {
      for (const element of root.querySelectorAll("button,[role=tab],a")) {
        elements.push(element);
        if (element.shadowRoot) visit(element.shadowRoot);
      }
      for (const element of root.querySelectorAll("*")) if (element.shadowRoot) visit(element.shadowRoot);
    };
    visit(document);
    const target = elements.find((element) => wanted.some((label) => (element.textContent || "").trim().toLocaleLowerCase().includes(label)));
    if (!target) return false;
    target.click();
    return true;
  }, labels);
}

async function crawl(env, item) {
  const sourceUrl = `https://www.ea.com/pt-br/games/ea-sports-fc/clubs/match-history?clubId=${encodeURIComponent(item.clubId)}&platform=${encodeURIComponent(item.platform)}`;
  if (!(await robotsAllows(new URL(sourceUrl).pathname))) return { status: "blocked", responseCount: 0, error: "ROBOTS_DISALLOW", matches: [] };
  const browser = await puppeteer.launch(env.BROWSER, { keep_alive: 120000 });
  const page = await browser.newPage();
  const observed = [];
  const responseTasks = [];
  page.on("response", (response) => {
    const url = response.url();
    if (!url.startsWith("https://proclubs.ea.com/") || !url.includes("/clubs/matches")) return;
    responseTasks.push(response.json().then((payload) => {
      const rawMode = new URL(url).searchParams.get("matchType") || "leagueMatch";
      observed.push({ mode: ["leagueMatch", "friendlyMatch", "playoffMatch"].includes(rawMode) ? rawMode : "leagueMatch", payload });
    }).catch(() => undefined));
  });
  try {
    await page.setUserAgent(USER_AGENT);
    const response = await page.goto(sourceUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
    if (!response || response.status() >= 400) throw new Error(`PAGE_${response?.status() || "NO_RESPONSE"}`);
    await sleep(6500);
    await clickMode(page, ["friendly", "amistoso"]);
    await sleep(3000);
    await clickMode(page, ["playoff", "mata-mata"]);
    await sleep(3000);
    await Promise.allSettled(responseTasks);
    const matches = observed.flatMap((entry) => normalize(entry.payload, entry.mode, sourceUrl, item.clubId));
    return { status: observed.length ? "succeeded" : "failed", responseCount: observed.length, error: observed.length ? undefined : "PUBLIC_PAGE_DATA_NOT_OBSERVED", matches };
  } catch (error) {
    const message = error instanceof Error ? error.message : "CRAWL_FAILED";
    return { status: /captcha|access denied|forbidden/i.test(message) ? "blocked" : "failed", responseCount: observed.length, error: message.slice(0, 400), matches: [] };
  } finally { await browser.close().catch(() => undefined); }
}

async function ingest(env, item, result) {
  const response = await fetch(`${env.PCA_SITE_URL}/api/internal/ea-ingest`, { method: "POST", headers: { authorization: `Bearer ${env.EA_INGEST_SECRET}`, "content-type": "application/json" }, body: JSON.stringify({ parserVersion: PARSER_VERSION, source: "cloudflare-browser-public-page", startedAt: new Date().toISOString(), matches: result.matches, metadata: { queueId: item.queueId, attempts: item.attempts, clubId: item.clubId, platform: item.platform, responseCount: result.responseCount, collectionStatus: result.status, error: result.error } }) });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok && result.status === "succeeded") throw new Error(`INGEST_${response.status}:${payload.error || "unknown"}`);
  return { httpStatus: response.status, ...payload };
}

async function run(env) {
  if (!env.EA_INGEST_SECRET) throw new Error("EA_INGEST_SECRET_REQUIRED");
  const queueResponse = await fetch(`${env.PCA_SITE_URL}/api/internal/ea-ingest?limit=1`, { headers: { authorization: `Bearer ${env.EA_INGEST_SECRET}` } });
  if (!queueResponse.ok) throw new Error(`QUEUE_${queueResponse.status}`);
  const queue = await queueResponse.json();
  const item = queue.items?.[0];
  if (!item) return { status: "idle", processed: 0 };
  const result = await crawl(env, item);
  const stored = await ingest(env, item, result);
  return { status: result.status, processed: 1, clubId: item.clubId, responses: result.responseCount, matches: result.matches.length, ingestStatus: stored.status || stored.httpStatus };
}

const worker = {
  async scheduled(_controller, env, context) { context.waitUntil(run(env).then((result) => console.log(JSON.stringify(result))).catch((error) => console.error(error))); },
  async fetch(request, env) {
    const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
    if (!env.EA_INGEST_SECRET || supplied !== env.EA_INGEST_SECRET) return Response.json({ error: "AUTH_REQUIRED" }, { status: 401 });
    try { return Response.json(await run(env)); } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "CRAWLER_FAILED" }, { status: 500 }); }
  },
};

export default worker;
