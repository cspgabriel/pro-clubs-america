import { notFound } from "next/navigation";
import clubData from "@/data/club.json";
import { buildDashboard } from "@/lib/stats";
import { RankingsPage, type RankingMetric } from "@/components/rankings-page";
import type { ClubDataset } from "@/types/domain";
import { publicClubs, publicClubRosterTotals, publicPlayers } from "@/lib/public-data";

const metrics: RankingMetric[] = ["artilharia", "assistencias", "desarmes", "aproveitamento"];
const dataset = clubData as ClubDataset;
const dashboard = buildDashboard(dataset);

export function generateStaticParams() { return metrics.map((metric) => ({ metric })); }

export async function generateMetadata({ params }: { params: Promise<{ metric: string }> }) {
  const { metric } = await params;
  const titles: Record<string, string> = { artilharia: "Artilharia", assistencias: "Assistências", desarmes: "Tackles", aproveitamento: "Win rate" };
  return { title: `${titles[metric] ?? "Rankings"} | Clubs Brasil` };
}

export default async function RankingRoute({ params }: { params: Promise<{ metric: string }> }) {
  const { metric } = await params;
  if (!metrics.includes(metric as RankingMetric)) notFound();
  const selected = metric as RankingMetric;
  const localValue = selected === "artilharia" ? dashboard.summary.goalsFor : selected === "assistencias" ? dashboard.rankings.reduce((total, player) => total + (player.assists ?? 0), 0) : selected === "desarmes" ? dashboard.rankings.reduce((total, player) => total + (player.tacklesMade ?? 0), 0) : dashboard.summary.winRate;
  const publicRows = selected === "artilharia" ? publicClubs.map((club) => ({ id: club.id, name: club.name, value: club.goals, secondary: `EA global #${club.rank} · SR ${club.skillRating}` })) : selected === "aproveitamento" ? publicClubs.map((club) => ({ id: club.id, name: club.name, value: club.winRate, secondary: `${club.wins} vitórias em ${club.matches} jogos` })) : selected === "assistencias" ? publicClubs.filter((club) => publicClubRosterTotals.has(club.id)).map((club) => ({ id: club.id, name: club.name, value: publicClubRosterTotals.get(club.id)?.assists ?? 0, secondary: "Soma do elenco público coletado" })) : [];
  const clubs = [...publicRows.filter((club) => club.id !== dataset.club.id), { id: dataset.club.id, name: dataset.club.name, value: localValue, secondary: selected === "artilharia" || selected === "aproveitamento" ? "Dado geral oficial" : "Soma do elenco cadastrado" }].sort((a, b) => b.value - a.value);
  return <RankingsPage metric={selected} players={[...dashboard.rankings.map((player) => ({ ...player, clubName: dataset.club.name })), ...publicPlayers]} clubs={clubs} />;
}
