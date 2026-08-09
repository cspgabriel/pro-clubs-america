import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const dataDirectory = resolve(root, "data");
const files = {
  clubs: resolve(root, "data/pro_clubs_all_teams_summary.csv"),
  players: resolve(root, "data/pro_clubs_all_players_full.csv"),
  detailed: resolve(root, "data/pro_clubs_all_teams_detailed.json"),
  matches: resolve(root, "data/pro_clubs_all_matches.json"),
};

function parseCsv(text) {
  const rows = []; let row = []; let field = ""; let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') { field += '"'; index += 1; }
      else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") { row.push(field); field = ""; }
    else if (char === "\n") { row.push(field.replace(/\r$/, "")); rows.push(row); row = []; field = ""; }
    else field += char;
  }
  if (field || row.length) { row.push(field.replace(/\r$/, "")); rows.push(row); }
  const headers = rows.shift() ?? [];
  if (headers.length) headers[0] = headers[0].replace(/^\uFEFF/, "");
  return rows.filter((item) => item.some(Boolean)).map((item) => Object.fromEntries(headers.map((header, index) => [header, item[index] ?? ""])));
}

const number = (value) => value === "" || value == null || Number.isNaN(Number(value)) ? null : Number(value);
const integer = (value) => { const parsed = number(value); return parsed == null ? 0 : Math.trunc(parsed); };
const key = (platform, clubId) => `${platform}:${clubId}`;
const playerKey = (platform, clubId, gamertag) => `${key(platform, clubId)}:${gamertag.trim().toLocaleLowerCase("en")}`;
const sourceUrl = (platform, clubId, page = "overview") => `https://www.ea.com/pt-br/games/ea-sports-fc/clubs/${page}?clubId=${clubId}&platform=${platform}`;

const rawContents = Object.fromEntries(await Promise.all(Object.entries(files).map(async ([name, path]) => [name, await readFile(path, "utf8")])));
const clubRows = parseCsv(rawContents.clubs);
const playerRows = parseCsv(rawContents.players);
const detailed = JSON.parse(rawContents.detailed);
const matches = JSON.parse(rawContents.matches);
const detailByClub = new Map(Object.values(detailed).map((entry) => [key(entry.metadata.platform, String(entry.metadata.clubId)), entry]));
const detailByPlayer = new Map();
for (const entry of Object.values(detailed)) for (const member of entry.player_stats?.members ?? []) detailByPlayer.set(playerKey(entry.metadata.platform, String(entry.metadata.clubId), member.name), member);

const clubs = clubRows.map((row) => {
  const platform = row["Platform Code"].trim(); const eaClubId = row["Club ID"].trim(); const detail = detailByClub.get(key(platform, eaClubId));
  return {
    ea_club_id: eaClubId, platform, name: row["Club Name"].trim(), ea_url: sourceUrl(platform, eaClubId), source_url: sourceUrl(platform, eaClubId), verified: true, country_code: null,
    skill_rating: integer(row["Skill Rating"]), wins: integer(row.Wins), ties: integer(row.Ties), losses: integer(row.Losses), games_played: integer(row["Games Played"]), goals: integer(row.Goals), goals_against: integer(row["Goals Against"]), clean_sheets: integer(row["Clean Sheets"]), reputation_level: row["Reputation Level"] || null,
    all_time_rank: number(row["All-Time Rank"]), seasonal_rank: number(row["Seasonal Rank"]), current_division: number(row.Division), goals_per_game: number(row["Goals/Game"]), source_payload: detail ?? row, last_synced_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  };
});

const duplicateClubs = clubs.filter((club, index) => clubs.findIndex((candidate) => key(candidate.platform, candidate.ea_club_id) === key(club.platform, club.ea_club_id)) !== index);
if (duplicateClubs.length) throw new Error(`Clubes duplicados por plataforma/ID: ${duplicateClubs.length}`);
const knownClubs = new Set(clubs.map((club) => key(club.platform, club.ea_club_id)));
const orphanPlayers = playerRows.filter((row) => !knownClubs.has(key(row["Platform Code"], row["Club ID"])));
if (orphanPlayers.length) throw new Error(`Jogadores sem clube correspondente: ${orphanPlayers.length}`);

const catalogFileNames = (await readdir(dataDirectory)).filter((name) => /\.(csv|json)$/i.test(name)).sort();
const sourceFiles = await Promise.all(catalogFileNames.map(async (name) => {
  const content = await readFile(resolve(dataDirectory, name), "utf8");
  let records = null;
  try { records = name.endsWith(".csv") ? parseCsv(content).length : Array.isArray(JSON.parse(content)) ? JSON.parse(content).length : Object.keys(JSON.parse(content)).length; } catch {}
  return { name, bytes: Buffer.byteLength(content), records, sha256: createHash("sha256").update(content).digest("hex") };
}));
const report = { clubs: clubs.length, players: playerRows.length, matches: Array.isArray(matches) ? matches.length : Object.keys(matches).length, detailedClubs: Object.keys(detailed).length, sourceFiles };

const apply = process.argv.includes("--apply");
if (!apply) {
  console.log(JSON.stringify({ mode: "dry-run", ...report }, null, 2));
  process.exit(0);
}

const supabaseUrl = (process.env.SUPABASE_URL || "https://mdqtlkvkpacjouwgtibr.supabase.co").replace(/\/$/, "");
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY ausente. Nenhum dado foi enviado.");
const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" };

async function upsert(table, rows, onConflict, batchSize = 250) {
  const returned = [];
  for (let start = 0; start < rows.length; start += batchSize) {
    const response = await fetch(`${supabaseUrl}/rest/v1/${table}?on_conflict=${encodeURIComponent(onConflict)}`, { method: "POST", headers: { ...headers, Prefer: "resolution=merge-duplicates,return=representation" }, body: JSON.stringify(rows.slice(start, start + batchSize)) });
    if (!response.ok) throw new Error(`${table} lote ${start / batchSize + 1}: ${response.status} ${await response.text()}`);
    returned.push(...await response.json());
    console.log(`${table}: ${Math.min(start + batchSize, rows.length)}/${rows.length}`);
  }
  return returned;
}

const importedClubs = await upsert("clubs", clubs, "platform,ea_club_id");
const clubIds = new Map(importedClubs.map((club) => [key(club.platform, club.ea_club_id), club.id]));
if (clubIds.size !== clubs.length) throw new Error(`Supabase retornou ${clubIds.size} clubes para ${clubs.length} entradas.`);

const players = playerRows.map((row) => {
  const platform = row["Platform Code"].trim(); const eaClubId = row["Club ID"].trim(); const gamertag = row["Player Name"].trim(); const games = integer(row["Games Played"]); const detail = detailByPlayer.get(playerKey(platform, eaClubId, gamertag));
  const goals = integer(row.Goals); const assists = integer(row.Assists); const tackles = integer(row["Tackles Made"]);
  return { club_id: clubIds.get(key(platform, eaClubId)), gamertag, favorite_position: row["Position / Rating"] || detail?.favoritePosition || "Midfielder", rating: number(detail?.ratingAve), games_played: games, goals, assists, passes_made: integer(row["Passes Made"]), pass_success_rate: number(row["Pass Success %"]) ?? 0, tackles_made: tackles, tackle_success_rate: number(row["Tackle Success %"]) ?? 0, clean_sheets_def: integer(row["Clean Sheets (Def)"]), clean_sheets_gk: integer(row["Clean Sheets (GK)"]), man_of_the_match: integer(row["MoTM (Melhor em Campo)"]), win_rate: null, country_code: null, source_url: sourceUrl(platform, eaClubId, "member-list"), source_payload: { ...row, detail: detail ?? null }, goals_per_game: games ? goals / games : 0, assists_per_game: games ? assists / games : 0, tackles_per_game: games ? tackles / games : 0, last_synced_at: new Date().toISOString(), updated_at: new Date().toISOString() };
});
await upsert("players", players, "gamertag,club_id");
await fetch(`${supabaseUrl}/rest/v1/catalog_import_runs`, { method: "POST", headers, body: JSON.stringify({ club_count: clubs.length, player_count: players.length, match_count: report.matches, source_files: sourceFiles }) }).then(async (response) => { if (!response.ok) throw new Error(`catalog_import_runs: ${response.status} ${await response.text()}`); });
console.log(JSON.stringify({ mode: "applied", ...report }, null, 2));
