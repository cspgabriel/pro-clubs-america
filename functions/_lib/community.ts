import type { BillingEnv } from "./billing";
import { findClubById, publicRouteId, supabaseRest, type SupabaseClub } from "./supabase";

export interface MatchRow {
  id: string;
  home_club_id: string;
  away_club_id: string | null;
  invited_club_id: string | null;
  creator_profile_id: string | null;
  accepted_by_profile_id: string | null;
  challenge_mode: "open" | "invite";
  status: "open_challenge" | "accepted" | "waiting_ea_verification" | "completed" | "cancelled";
  scheduled_date: string | null;
  scheduled_time: string | null;
  region: string | null;
  featured: boolean | null;
  created_at: string;
}

export async function matchPayload(env: BillingEnv, row: MatchRow) {
  const [home, away, invited] = await Promise.all([
    findClubById(env, row.home_club_id),
    row.away_club_id ? findClubById(env, row.away_club_id) : null,
    row.invited_club_id ? findClubById(env, row.invited_club_id) : null,
  ]);
  const creator = row.creator_profile_id
    ? (await supabaseRest<Array<{ firebase_uid: string; full_name: string | null }>>(env, `profiles?id=eq.${encodeURIComponent(row.creator_profile_id)}&select=firebase_uid,full_name&limit=1`))[0]
    : null;
  const accepted = row.accepted_by_profile_id
    ? (await supabaseRest<Array<{ firebase_uid: string; full_name: string | null }>>(env, `profiles?id=eq.${encodeURIComponent(row.accepted_by_profile_id)}&select=firebase_uid,full_name&limit=1`))[0]
    : null;
  const status = row.status === "open_challenge" ? "searching" : row.status === "accepted" ? "scheduled" : row.status === "waiting_ea_verification" ? "waiting_ea" : "verified";
  return {
    id: row.id,
    creatorUid: creator?.firebase_uid,
    creatorName: creator?.full_name || "Comunidade",
    hostClubId: home ? publicRouteId(home) : row.home_club_id,
    hostClubName: home?.name || "Clube",
    mode: row.challenge_mode,
    date: row.scheduled_date || row.created_at.slice(0, 10),
    time: row.scheduled_time?.slice(0, 5) || "21:30",
    region: row.region || "Brasil",
    status,
    invitedClubId: invited ? publicRouteId(invited) : undefined,
    invitedClubName: invited?.name,
    opponentClubId: away ? publicRouteId(away) : undefined,
    opponentClubName: away?.name,
    acceptedBy: accepted?.full_name || undefined,
    acceptedByUid: accepted?.firebase_uid,
    featured: Boolean(row.featured),
    createdAt: row.created_at,
  };
}

export async function resolveClubRoute(env: BillingEnv, routeId: string): Promise<SupabaseClub | null> {
  const direct = await supabaseRest<SupabaseClub[]>(env, `clubs?ea_club_id=eq.${encodeURIComponent(routeId)}&platform=eq.common-gen5&limit=1`);
  if (direct[0]) return direct[0];
  const match = routeId.match(/^(common-gen4|common-gen5|nx)-(.+)$/);
  if (!match) return null;
  const rows = await supabaseRest<SupabaseClub[]>(env, `clubs?platform=eq.${encodeURIComponent(match[1])}&ea_club_id=eq.${encodeURIComponent(match[2])}&limit=1`);
  return rows[0] ?? null;
}
