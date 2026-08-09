export type RequestStatus = "searching" | "scheduled" | "waiting_ea" | "verified";
export type ChallengeMode = "open" | "invite";
export interface FriendlyRequest { id: string; creatorName: string; hostClubId: string; hostClubName: string; mode: ChallengeMode; date: string; time: string; region: string; status: RequestStatus; invitedClubId?: string; invitedClubName?: string; opponentClubId?: string; opponentClubName?: string; acceptedBy?: string; createdAt: string; }
export const friendlyStorageKey = "clubs-brasil-friendly-requests-v2";
