import type {
  ClubDataset,
  DashboardData,
  PlayerRanking,
} from "@/types/domain";

const round = (value: number) => Math.round(value * 10) / 10;

export function buildDashboard(dataset: ClubDataset): DashboardData {
  const playerMap = new Map<
    string,
    PlayerRanking & { ratingTotal: number; ratedMatches: number; officialCareer: boolean }
  >();

  for (const player of dataset.players) {
    playerMap.set(player.id, {
      id: player.id,
      name: player.name,
      position: player.position ?? "—",
      matches: player.gamesPlayed ?? 0,
      goals: player.goals ?? null,
      assists: player.assists ?? null,
      goalContributions:
        player.goals == null && player.assists == null
          ? null
          : (player.goals ?? 0) + (player.assists ?? 0),
      averageRating: player.averageRating ?? null,
      cleanSheets: player.cleanSheets ?? 0,
      overallRating: player.overallRating ?? null,
      passesMade: player.passesMade ?? null,
      passSuccessRate: player.passSuccessRate ?? null,
      tacklesMade: player.tacklesMade ?? null,
      tackleSuccessRate: player.tackleSuccessRate ?? null,
      winRate: player.winRate ?? null,
      ratingTotal: player.averageRating ?? 0,
      ratedMatches: player.averageRating == null ? 0 : 1,
      officialCareer: player.gamesPlayed != null,
    });
  }

  let wins = 0;
  let draws = 0;
  let losses = 0;
  let goalsFor = 0;
  let goalsAgainst = 0;

  const form = dataset.matches
    .slice()
    .sort((a, b) => a.playedAt.localeCompare(b.playedAt))
    .map((match) => {
      const isHome = match.homeClubId === dataset.club.id;
      const ownGoals = isHome ? match.homeScore : match.awayScore;
      const opponentGoals = isHome ? match.awayScore : match.homeScore;
      const result: "V" | "E" | "D" =
        ownGoals > opponentGoals ? "V" : ownGoals === opponentGoals ? "E" : "D";

      goalsFor += ownGoals;
      goalsAgainst += opponentGoals;
      if (result === "V") wins += 1;
      if (result === "E") draws += 1;
      if (result === "D") losses += 1;

      for (const stats of match.players) {
        const player = playerMap.get(stats.playerId) ?? {
          id: stats.playerId,
          name: stats.playerName,
          position: stats.position ?? "—",
          matches: 0,
          goals: 0,
          assists: 0,
          goalContributions: 0,
          averageRating: null,
          cleanSheets: 0,
          overallRating: null,
          passesMade: null,
          passSuccessRate: null,
          tacklesMade: null,
          tackleSuccessRate: null,
          winRate: null,
          ratingTotal: 0,
          ratedMatches: 0,
          officialCareer: false,
        };

        if (!player.officialCareer) {
          player.matches += 1;
          player.goals = (player.goals ?? 0) + stats.goals;
          player.assists = (player.assists ?? 0) + stats.assists;
          player.goalContributions = player.goals + player.assists;
          player.cleanSheets += stats.cleanSheet ? 1 : 0;
          player.passesMade = (player.passesMade ?? 0) + (stats.passesMade ?? 0);
          player.tacklesMade = (player.tacklesMade ?? 0) + (stats.tacklesMade ?? 0);
          if (typeof stats.rating === "number") {
            player.ratingTotal += stats.rating;
            player.ratedMatches += 1;
            player.averageRating = round(player.ratingTotal / player.ratedMatches);
          }
        }
        playerMap.set(stats.playerId, player);
      }

      return {
        label: new Intl.DateTimeFormat("pt-BR", {
          day: "2-digit",
          month: "2-digit",
        }).format(new Date(match.playedAt)),
        goalsFor: ownGoals,
        goalsAgainst: opponentGoals,
        result,
      };
    });

  const rankings = [...playerMap.values()]
    .map((player) => ({
      id: player.id,
      name: player.name,
      position: player.position,
      matches: player.matches,
      goals: player.goals,
      assists: player.assists,
      goalContributions: player.goalContributions,
      averageRating: player.averageRating,
      cleanSheets: player.cleanSheets,
      overallRating: player.overallRating,
      passesMade: player.passesMade,
      passSuccessRate: player.passSuccessRate,
      tacklesMade: player.tacklesMade,
      tackleSuccessRate: player.tackleSuccessRate,
      winRate: player.winRate,
    }))
    .sort(
      (a, b) =>
        (b.goals ?? -1) - (a.goals ?? -1) ||
        (b.assists ?? -1) - (a.assists ?? -1) ||
        (b.averageRating ?? 0) - (a.averageRating ?? 0),
    );

  const overview = dataset.club.overview;
  const officialMatches = overview?.totalMatches ?? dataset.matches.length;
  const officialWins = overview?.wins ?? wins;

  return {
    ...dataset,
    summary: {
      matches: officialMatches,
      wins: officialWins,
      draws: overview?.draws ?? draws,
      losses: overview?.losses ?? losses,
      goalsFor: overview?.goalsFor ?? goalsFor,
      goalsAgainst: overview?.goalsAgainst ?? goalsAgainst,
      winRate: officialMatches ? round((officialWins / officialMatches) * 100) : 0,
    },
    rankings,
    form,
  };
}
