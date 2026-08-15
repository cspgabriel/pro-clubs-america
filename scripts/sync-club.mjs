import { chromium } from "playwright";
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const clubId = process.argv[2] || "171630";
const platform = process.argv[3] || "common-gen5";

const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log(`=== Sincronizador EA Pro Clubs ===`);
  console.log(`Clube: ${clubId} | Plataforma: ${platform}`);

  const launchOptions = {
    headless: true,
    args: ["--disable-http2", "--no-sandbox"],
  };
  if (process.platform === "win32" && existsSync("C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe")) {
    launchOptions.executablePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  }

  const browser = await chromium.launch(launchOptions);
  const context = await browser.newContext({ userAgent, locale: "pt-BR" });
  const page = await context.newPage();

  try {
    console.log("1. Obtendo cookies de sessão na EA...");
    try {
      await page.goto("https://www.ea.com/pt-br/games/ea-sports-fc/clubs/rankings", { timeout: 15000 });
    } catch {}
    await sleep(2000);

    console.log("2. Consultando endpoints da API EA Pro Clubs...");
    const infoUrl = `https://proclubs.ea.com/api/fc/clubs/info?platform=${platform}&clubIds=${clubId}`;
    const statsUrl = `https://proclubs.ea.com/api/fc/members/career/stats?platform=${platform}&clubId=${clubId}`;
    const leagueUrl = `https://proclubs.ea.com/api/fc/clubs/matches?platform=${platform}&clubIds=${clubId}&matchType=gameType9`;
    const playoffUrl = `https://proclubs.ea.com/api/fc/clubs/matches?platform=${platform}&clubIds=${clubId}&matchType=gameType13`;
    const friendlyUrl = `https://proclubs.ea.com/api/fc/clubs/matches?platform=${platform}&clubIds=${clubId}&matchType=gameType24`;

    const data = await page.evaluate(async (urls) => {
      const get = async (url) => {
        try {
          const r = await fetch(url, { headers: { Referer: "https://www.ea.com/" } });
          return r.ok ? await r.json() : null;
        } catch { return null; }
      };
      return {
        info: await get(urls.infoUrl),
        stats: await get(urls.statsUrl),
        league: await get(urls.leagueUrl),
        playoff: await get(urls.playoffUrl),
        friendly: await get(urls.friendlyUrl),
      };
    }, { infoUrl, statsUrl, leagueUrl, playoffUrl, friendlyUrl });

    const outDir = resolve(__dirname, "../data/snapshots");
    if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
    const outFile = resolve(outDir, `club_${clubId}_${platform}.json`);
    writeFileSync(outFile, JSON.stringify(data, null, 2), "utf8");

    const clubName = data.info?.[clubId]?.name || "Desconhecido";
    const memberCount = data.stats?.members?.length || 0;
    const leagueMatchCount = Array.isArray(data.league) ? data.league.length : Object.keys(data.league || {}).length;
    const playoffMatchCount = Array.isArray(data.playoff) ? data.playoff.length : Object.keys(data.playoff || {}).length;
    const friendlyMatchCount = Array.isArray(data.friendly) ? data.friendly.length : Object.keys(data.friendly || {}).length;

    console.log(`\n✅ Sucesso!`);
    console.log(`- Nome do Clube: ${clubName}`);
    console.log(`- Membros no Elenco: ${memberCount}`);
    console.log(`- Partidas de Liga: ${leagueMatchCount}`);
    console.log(`- Partidas de Playoff: ${playoffMatchCount}`);
    console.log(`- Partidas de Amistosos: ${friendlyMatchCount}`);
    console.log(`- Arquivo salvo: ${outFile}`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("Erro na sincronização:", err);
  process.exit(1);
});
