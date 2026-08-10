import { apiError, type FunctionContext } from "../../_lib/billing";
import { findClubByEa, supabaseRest } from "../../_lib/supabase";
import { repairPublicText } from "../../_lib/text";

interface SnapshotPlayer {
  playerId?: string;
  playerName?: string;
  goals?: number;
  assists?: number;
  rating?: number;
  passesMade?: number;
  tacklesMade?: number;
}

interface SnapshotRow {
  id: string;
  mode: "leagueMatch" | "friendlyMatch" | "playoffMatch";
  played_at: string;
  home_club_id: string | null;
  home_ea_club_id: string;
  home_club_name: string;
  home_score: number;
  away_club_id: string | null;
  away_ea_club_id: string;
  away_club_name: string;
  away_score: number;
  source_url: string;
  players: SnapshotPlayer[] | null;
}

function parsePublicClubId(value: string) {
  const prefixed = /^(common-gen4|common-gen5|nx)-(\d{1,12})$/.exec(value);
  if (prefixed) return { platform: prefixed[1], clubId: prefixed[2] };
  return /^\d{1,12}$/.test(value) ? { platform: "common-gen5", clubId: value } : null;
}

export const onRequestGet = async ({ request, env }: FunctionContext) => {
  try {
    const url = new URL(request.url);
    const gamertag = String(url.searchParams.get("gamertag") || "").trim();
    const parsedClub = parsePublicClubId(String(url.searchParams.get("clubId") || "").trim());
    if (!gamertag || !parsedClub) return apiError("Informe jogador e clube.", 422);
    const club = await findClubByEa(env, parsedClub.platform, parsedClub.clubId);
    if (!club) return apiError("Clube não indexado.", 404);
    const snapshots = await supabaseRest<SnapshotRow[]>(env, `ea_match_snapshots?or=(home_club_id.eq.${encodeURIComponent(club.id)},away_club_id.eq.${encodeURIComponent(club.id)})&select=id,mode,played_at,home_club_id,home_ea_club_id,home_club_name,home_score,away_club_id,away_ea_club_id,away_club_name,away_score,source_url,players&order=played_at.desc&limit=100`);
    const normalizedName = gamertag.toLocaleLowerCase("pt-BR");
    const matches = snapshots.flatMap((match) => {
      const player = (Array.isArray(match.players) ? match.players : []).find((item) => String(item.playerName || item.playerId || "").toLocaleLowerCase("pt-BR") === normalizedName);
      if (!player) return [];
      const isHome = match.home_club_id === club.id || match.home_ea_club_id === club.ea_club_id;
      const ownScore = isHome ? match.home_score : match.away_score;
      const opponentScore = isHome ? match.away_score : match.home_score;
      return [{
        id: match.id,
        playedAt: match.played_at,
        mode: match.mode,
        opponent: repairPublicText(isHome ? match.away_club_name : match.home_club_name),
        score: `${ownScore} × ${opponentScore}`,
        result: ownScore > opponentScore ? "V" : ownScore === opponentScore ? "E" : "D",
        goals: Number(player.goals || 0),
        assists: Number(player.assists || 0),
        rating: player.rating == null ? null : Number(player.rating),
        passes: player.passesMade == null ? null : Number(player.passesMade),
        tackles: player.tacklesMade == null ? null : Number(player.tacklesMade),
        sourceUrl: match.source_url,
      }];
    }).slice(0, 10);
    return Response.json({ matches, source: "EA SPORTS FC Clubs public match history" }, { headers: { "cache-control": "public, max-age=60, stale-while-revalidate=300" } });
  } catch {
    return apiError("Não foi possível carregar o histórico público do jogador.", 500);
  }
};
