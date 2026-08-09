import clubData from "@/data/club.json";
import { publicClubs, publicClubRosterTotals, publicPlayers } from "@/lib/public-data";
import { buildDashboard } from "@/lib/stats";
import type { ClubDataset, PlayerRanking } from "@/types/domain";

export type RankingMetric = "artilharia" | "assistencias" | "desarmes" | "aproveitamento";
export type RankedPlayer = PlayerRanking & { clubName?: string };
export interface ClubRankingRow { id: string; name: string; value: number; secondary: string; }

export const rankingMetrics: RankingMetric[] = ["artilharia", "assistencias", "desarmes", "aproveitamento"];

const dataset = clubData as ClubDataset;
const dashboard = buildDashboard(dataset);

export function getPlayerRankingRows(): RankedPlayer[] {
  return [
    ...dashboard.rankings.map((player) => ({ ...player, clubName: dataset.club.name })),
    ...publicPlayers.filter((player) => player.statsReliable),
  ];
}

export function getClubRankingRows(metric: RankingMetric): ClubRankingRow[] {
  const localValue = metric === "artilharia"
    ? dashboard.summary.goalsFor
    : metric === "assistencias"
      ? dashboard.rankings.reduce((total, player) => total + (player.assists ?? 0), 0)
      : metric === "desarmes"
        ? dashboard.rankings.reduce((total, player) => total + (player.tacklesMade ?? 0), 0)
        : dashboard.summary.winRate;

  const publicRows = metric === "artilharia"
    ? publicClubs.map((club) => ({ id: club.id, name: club.name, value: club.goals, secondary: `EA global #${club.rank} · SR ${club.skillRating}` }))
    : metric === "aproveitamento"
      ? publicClubs.map((club) => ({ id: club.id, name: club.name, value: club.winRate, secondary: `${club.wins} vitórias em ${club.matches} jogos` }))
      : metric === "assistencias"
        ? publicClubs.filter((club) => publicClubRosterTotals.has(club.id)).map((club) => ({ id: club.id, name: club.name, value: publicClubRosterTotals.get(club.id)?.assists ?? 0, secondary: "Soma do elenco público coletado" }))
        : [];

  return [
    ...publicRows.filter((club) => club.id !== dataset.club.id),
    {
      id: dataset.club.id,
      name: dataset.club.name,
      value: localValue,
      secondary: metric === "artilharia" || metric === "aproveitamento" ? "Dado geral oficial" : "Soma do elenco cadastrado",
    },
  ].sort((a, b) => b.value - a.value);
}
