import { chromium } from "playwright";
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Configuration & Flags
const args = process.argv.slice(2);
function getArg(flag, defaultValue = "") {
  const index = args.indexOf(flag);
  return index !== -1 && args[index + 1] ? args[index + 1] : defaultValue;
}

const siteUrl = (process.env.PCA_SITE_URL || getArg("--site", "https://pro-clubs-america.pages.dev")).replace(/\/$/, "");
const ingestSecret = process.env.EA_INGEST_SECRET || getArg("--secret", "");
const forcedClubId = getArg("--clubId", "");
const forcedPlatform = getArg("--platform", "common-gen5");
const limit = Math.max(1, Math.min(Number(process.env.CRAWL_LIMIT || getArg("--limit", "3")), 20));
const parserVersion = "playwright-stealth-api-v2";
const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const number = (value, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback);
const text = (value, fallback = "") => String(value ?? fallback).trim();

function timestamp(value) {
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 0) {
    return new Date(numeric < 10_000_000_000 ? numeric * 1000 : numeric).toISOString();
  }
  const parsed = new Date(String(value || ""));
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function playerRows(rawPlayers, clubIds) {
  if (!rawPlayers || typeof rawPlayers !== "object") return [];
  const rows = [];
  for (const clubId of clubIds) {
    const clubPlayers = rawPlayers[clubId] || rawPlayers[String(clubId)] || {};
    const playersList = Array.isArray(clubPlayers) ? clubPlayers : Object.values(clubPlayers);
    for (const player of playersList) {
      if (!player || typeof player !== "object") continue;
      const name = text(player.playername || player.playerName || player.name || player.eaId);
      if (!name) continue;
      rows.push({
        playerId: text(player.playerId || player.nucleusId || name),
        playerName: name,
        position: text(player.pos || player.position || player.favoritePosition),
        goals: number(player.goals),
        assists: number(player.assists),
        rating: player.rating == null ? undefined : number(player.rating),
        shots: player.shots == null ? undefined : number(player.shots),
        passesMade: player.passesMade == null ? undefined : number(player.passesMade),
        passAttempts: player.passAttempts == null ? undefined : number(player.passAttempts),
        tacklesMade: player.tacklesMade == null ? undefined : number(player.tacklesMade),
        tackleAttempts: player.tackleAttempts == null ? undefined : number(player.tackleAttempts),
        redCards: player.redCards == null ? undefined : number(player.redCards),
        saves: player.saves == null ? undefined : number(player.saves),
        cleanSheet: Boolean(player.cleanSheet || player.cleanSheets),
      });
    }
  }
  return rows;
}

function normalizeMatches(rawMatches, mode, sourceUrl, requestedClubId) {
  if (!rawMatches || typeof rawMatches !== "object") return [];
  const list = Array.isArray(rawMatches) ? rawMatches : Object.values(rawMatches);
  const normalized = [];

  for (const raw of list) {
    if (!raw || typeof raw !== "object") continue;
    const clubsObject = raw.clubs && typeof raw.clubs === "object" ? raw.clubs : {};
    const entries = Object.entries(clubsObject).map(([id, val]) => ({ id: text(val?.clubId || id), ...val }));
    if (entries.length < 2) continue;

    entries.sort((left, right) => {
      const side = (c) => number(c.teamSide ?? c.side ?? c.details?.teamSide, 99);
      return side(left) - side(right) || (left.id === requestedClubId ? -1 : 1);
    });

    const [home, away] = entries;
    const playedAt = timestamp(raw.timestamp || raw.playedAt || raw.matchTimestamp || raw.date);
    if (!playedAt) continue;

    normalized.push({
      mode,
      playedAt,
      homeClubId: home.id,
      homeClubName: text(home.name || home.clubName || home.details?.name, `Clube ${home.id}`),
      awayClubId: away.id,
      awayClubName: text(away.name || away.clubName || away.details?.name, `Clube ${away.id}`),
      homeScore: number(home.goals ?? home.score),
      awayScore: number(away.goals ?? away.score),
      competition: "EA SPORTS FC Clubs",
      sourceUrl,
      players: playerRows(raw.players, [home.id, away.id]),
    });
  }
  return normalized;
}

async function fetchEaData(page, clubId, platform) {
  const infoUrl = `https://proclubs.ea.com/api/fc/clubs/info?platform=${encodeURIComponent(platform)}&clubIds=${encodeURIComponent(clubId)}`;
  const statsUrl = `https://proclubs.ea.com/api/fc/members/career/stats?platform=${encodeURIComponent(platform)}&clubId=${encodeURIComponent(clubId)}`;
  const leagueMatchesUrl = `https://proclubs.ea.com/api/fc/clubs/matches?platform=${encodeURIComponent(platform)}&clubIds=${encodeURIComponent(clubId)}&matchType=gameType9`;
  const playoffMatchesUrl = `https://proclubs.ea.com/api/fc/clubs/matches?platform=${encodeURIComponent(platform)}&clubIds=${encodeURIComponent(clubId)}&matchType=gameType13`;
  const friendlyMatchesUrl = `https://proclubs.ea.com/api/fc/clubs/matches?platform=${encodeURIComponent(platform)}&clubIds=${encodeURIComponent(clubId)}&matchType=gameType24`;

  return await page.evaluate(async ({ infoUrl, statsUrl, leagueUrl, playoffUrl, friendlyUrl }) => {
    const fetchJson = async (url) => {
      try {
        const res = await fetch(url, {
          headers: {
            "Referer": "https://www.ea.com/",
            "Accept": "application/json, text/plain, */*",
          },
        });
        if (!res.ok) return null;
        return await res.json();
      } catch {
        return null;
      }
    };

    const [info, players, league, playoff, friendly] = await Promise.all([
      fetchJson(infoUrl),
      fetchJson(statsUrl),
      fetchJson(leagueUrl),
      fetchJson(playoffUrl),
      fetchJson(friendlyUrl),
    ]);

    return { info, players, league, playoff, friendly };
  }, { infoUrl, statsUrl, leagueUrl: leagueMatchesUrl, playoffUrl: playoffMatchesUrl, friendlyUrl: friendlyMatchesUrl });
}

async function crawlClub(page, item) {
  const sourceUrl = `https://www.ea.com/pt-br/games/ea-sports-fc/clubs/overview?clubId=${encodeURIComponent(item.clubId)}&platform=${encodeURIComponent(item.platform)}`;
  console.log(`[CRAWLER] Coletando dados para o Clube ID ${item.clubId} (${item.platform})...`);

  try {
    const data = await fetchEaData(page, item.clubId, item.platform);
    if (!data || (!data.info && !data.players && !data.league)) {
      return {
        status: "failed",
        error: "EA_API_EMPTY_RESPONSE",
        responseCount: 0,
        matches: [],
        raw: data,
      };
    }

    const leagueMatches = normalizeMatches(data.league, "leagueMatch", sourceUrl, item.clubId);
    const playoffMatches = normalizeMatches(data.playoff, "playoffMatch", sourceUrl, item.clubId);
    const friendlyMatches = normalizeMatches(data.friendly, "friendlyMatch", sourceUrl, item.clubId);

    const allMatches = [...leagueMatches, ...playoffMatches, ...friendlyMatches];
    const responseCount = (data.info ? 1 : 0) + (data.players ? 1 : 0) + (data.league ? 1 : 0) + (data.playoff ? 1 : 0) + (data.friendly ? 1 : 0);

    return {
      status: "succeeded",
      error: undefined,
      responseCount,
      matches: allMatches,
      clubInfo: data.info?.[item.clubId] || Object.values(data.info || {})[0] || null,
      membersStats: data.players?.members || [],
      raw: data,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "CRAWL_FAILED";
    return {
      status: /captcha|access denied|forbidden/i.test(message) ? "blocked" : "failed",
      error: message.slice(0, 400),
      responseCount: 0,
      matches: [],
    };
  }
}

async function ingest(item, result) {
  if (!ingestSecret) {
    console.log(`[INGEST] EA_INGEST_SECRET ausente. Pulando ingestão remota.`);
    return { status: "skipped_no_secret" };
  }
  const response = await fetch(`${siteUrl}/api/internal/ea-ingest`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${ingestSecret}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      parserVersion,
      source: "ea-playwright-stealth-api",
      startedAt: new Date().toISOString(),
      matches: result.matches,
      metadata: {
        queueId: item.queueId,
        attempts: item.attempts,
        clubId: item.clubId,
        platform: item.platform,
        responseCount: result.responseCount,
        collectionStatus: result.status,
        error: result.error,
      },
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok && result.status === "succeeded") {
    throw new Error(`INGEST_${response.status}:${payload.error || "unknown"}`);
  }
  return { httpStatus: response.status, ...payload };
}

async function main() {
  let queueItems = [];

  if (forcedClubId) {
    queueItems = [{
      queueId: `cli-${forcedClubId}`,
      attempts: 0,
      clubId: forcedClubId,
      platform: forcedPlatform,
      clubName: `Club ${forcedClubId}`,
    }];
  } else if (ingestSecret) {
    try {
      const queueResponse = await fetch(`${siteUrl}/api/internal/ea-ingest?limit=${limit}`, {
        headers: { authorization: `Bearer ${ingestSecret}` },
      });
      if (queueResponse.ok) {
        const queue = await queueResponse.json();
        queueItems = queue.items || [];
      }
    } catch (err) {
      console.warn(`[WARN] Não foi possível consultar fila da API: ${err.message}`);
    }
  }

  if (!queueItems.length && !forcedClubId) {
    console.log(JSON.stringify({ status: "idle", message: "Nenhum clube na fila para processar." }));
    return;
  }

  console.log(`[CRAWLER] Iniciando sessão Playwright com ${queueItems.length} clube(s)...`);

  const launchOptions = {
    headless: true,
    args: ["--disable-http2", "--no-sandbox", "--disable-setuid-sandbox"],
  };
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH) {
    launchOptions.executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
  } else if (process.platform === "win32" && existsSync("C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe")) {
    launchOptions.executablePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  }

  const browser = await chromium.launch(launchOptions);
  const context = await browser.newContext({
    userAgent,
    locale: "pt-BR",
    viewport: { width: 1440, height: 900 },
  });

  const page = await context.newPage();

  try {
    console.log("[CRAWLER] Inicializando sessão no site da EA para cookies Akamai...");
    try {
      await page.goto("https://www.ea.com/pt-br/games/ea-sports-fc/clubs/rankings", {
        waitUntil: "domcontentloaded",
        timeout: 20000,
      });
    } catch {
      // Rankings timeout is non-fatal; cookies may already be established
    }
    await sleep(2000);

    const report = [];
    const outDir = resolve(__dirname, "../data/snapshots");
    if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

    for (const item of queueItems) {
      const result = await crawlClub(page, item);

      // Salva snapshot local
      const snapshotFile = resolve(outDir, `club_${item.clubId}_${item.platform}_latest.json`);
      writeFileSync(snapshotFile, JSON.stringify(result, null, 2), "utf8");
      console.log(`[SNAPSHOT] Salvo em: ${snapshotFile}`);

      let stored = { status: "local_only" };
      if (ingestSecret && result.status === "succeeded") {
        stored = await ingest(item, result);
      }

      report.push({
        clubId: item.clubId,
        platform: item.platform,
        status: result.status,
        matchesFound: result.matches.length,
        playersFound: result.membersStats?.length || 0,
        ingestStatus: stored.status || stored.httpStatus,
      });

      await sleep(1500);
    }

    console.log("\n--- RESULTADO DA EXECUÇÃO ---");
    console.log(JSON.stringify({ status: "succeeded", processed: report.length, report }, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("[FATAL]", err);
  process.exit(1);
});
