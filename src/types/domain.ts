export type SourceState = "pending" | "complete" | "partial";

export interface PlayerMatchStats {
  playerId: string;
  playerName: string;
  position?: string;
  goals: number;
  assists: number;
  rating?: number;
  shots?: number;
  passesMade?: number;
  passAttempts?: number;
  tacklesMade?: number;
  tackleAttempts?: number;
  redCards?: number;
  saves?: number;
  cleanSheet?: boolean;
}

export interface MatchRecord {
  id: string;
  mode?: "leagueMatch" | "playoffMatch" | "friendlyMatch";
  playedAt: string;
  homeClubId: string;
  homeClubName: string;
  awayClubId: string;
  awayClubName: string;
  homeScore: number;
  awayScore: number;
  competition: string;
  sourceUrl: string;
  players: PlayerMatchStats[];
}

export interface ClubDataset {
  club: {
    id: string;
    name: string;
    platform: string;
    sourceUrl: string;
    crestUrl?: string;
    overview?: {
      skillRating: number;
      reputation: string;
      wins: number;
      draws: number;
      losses: number;
      totalMatches: number;
      leagueAppearances: number;
      playoffAppearances: number;
      goalsFor: number;
      goalsAgainst: number;
      members: number;
      midfielders: number;
      forwards: number;
      defenders: number;
      goalkeepers: number;
    };
  };
  source: {
    state: SourceState;
    fetchedAt: string | null;
    note: string;
  };
  players: Array<{
    id: string;
    name: string;
    position?: string;
    overallRating?: number;
    gamesPlayed?: number;
    averageRating?: number;
    goals?: number;
    assists?: number;
    passesMade?: number;
    passSuccessRate?: number;
    tacklesMade?: number;
    tackleSuccessRate?: number;
    cleanSheets?: number;
    winRate?: number;
  }>;
  matches: MatchRecord[];
}

export interface PlayerRanking {
  id: string;
  name: string;
  position: string;
  matches: number;
  goals: number | null;
  assists: number | null;
  goalContributions: number | null;
  averageRating: number | null;
  cleanSheets: number;
  overallRating: number | null;
  passesMade: number | null;
  passSuccessRate: number | null;
  tacklesMade: number | null;
  tackleSuccessRate: number | null;
  winRate: number | null;
}

export interface DashboardData extends ClubDataset {
  summary: {
    matches: number;
    wins: number;
    draws: number;
    losses: number;
    goalsFor: number;
    goalsAgainst: number;
    winRate: number;
  };
  rankings: PlayerRanking[];
  form: Array<{
    label: string;
    goalsFor: number;
    goalsAgainst: number;
    result: "V" | "E" | "D";
  }>;
}
