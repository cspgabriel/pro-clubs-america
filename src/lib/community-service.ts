"use client";

import { getFirebaseAuth } from "./firebase";
import type { ChallengeMode, FriendlyRequest } from "./friendlies";
import type { TeamRegistration } from "./community";
import type { MatchRecord } from "@/types/domain";

export type CommunityRole = "owner" | "captain" | "player" | "visitor" | "admin";
export type CommunityPlan = "free" | "pro" | "vip" | "player_pro" | "club_pro" | "club_premium";

export interface CommunityProfile {
  uid: string;
  displayName: string;
  email: string;
  country: string;
  locale: string;
  role: CommunityRole;
  clubId?: string;
  clubName?: string;
  playerId?: string;
  playerName?: string;
  playerGames?: number;
  playerGoals?: number;
  playerAssists?: number;
  playerTackles?: number;
  playerEaUrl?: string;
  playerEaLinkedAt?: string;
  pendingClubId?: string;
  pendingClubName?: string;
  pendingClaimId?: string;
  plan: CommunityPlan;
  premiumAccess: boolean;
  bonusAccessUntil?: string;
}

export interface ClubReferralSummary {
  code: string;
  inviteUrl: string;
  clubId?: string;
  clubName?: string;
  bonusAccessUntil?: string;
  invitedCount: number;
  members: Array<{ id: string; name: string; role: string; avatarUrl?: string }>;
}

export interface TransferPostRecord {
  id: string;
  type: "club_vacancy" | "player_search";
  title: string;
  owner: string;
  position: string;
  minimumOvr?: number;
  platform: string;
  availability: string;
  contact: string;
  authorUid: string;
  plan: CommunityPlan;
  createdAt: string;
  isOwner?: boolean;
  hasApplied?: boolean;
  applicationCount?: number;
}
export interface MarketApplicationRecord { id: string; profileId: string; playerId?: string; name: string; email: string; role: string; clubName?: string; message?: string; contact?: string; status: string; createdAt: string; }

export interface LobbyMessageRecord { id: string; authorUid: string; author: string; text: string; createdAt: string; }
type WatchError = (error: Error) => void;
type Unsubscribe = () => void;

async function api<T>(path: string, init: RequestInit = {}, authRequired = false): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json");
  const user = getFirebaseAuth()?.currentUser;
  if (authRequired) {
    if (!user) throw new Error("AUTH_REQUIRED");
    headers.set("authorization", `Bearer ${await user.getIdToken()}`);
  }
  const response = await fetch(path, { ...init, headers, cache: "no-store" });
  const payload = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error || `API_${response.status}`);
  return payload;
}

function poll<T>(load: () => Promise<T>, callback: (value: T) => void, onError?: WatchError, interval = 15_000): Unsubscribe {
  let active = true;
  const run = () => load().then((value) => { if (active) callback(value); }).catch((error) => { if (active) onError?.(error instanceof Error ? error : new Error("POLL_FAILED")); });
  void run();
  const timer = window.setInterval(run, interval);
  return () => { active = false; window.clearInterval(timer); };
}

export function ensureCommunityProfile() {
  return api<CommunityProfile>("/api/community/profile", { method: "POST", body: "{}" }, true);
}

export async function getCommunityProfile(): Promise<CommunityProfile | null> {
  if (!getFirebaseAuth()?.currentUser) return null;
  return api<CommunityProfile>("/api/community/profile", {}, true);
}

export function saveCommunityPreferences(input: { country: string; locale: string }) {
  return api<CommunityProfile>("/api/community/profile", { method: "PATCH", body: JSON.stringify(input) }, true);
}

export function getPushConfig() {
  return api<{ publicKey: string }>("/api/push/config");
}

export function savePushSubscription(subscription: PushSubscriptionJSON) {
  return api<{ subscribed: boolean }>("/api/push/subscribe", { method: "POST", body: JSON.stringify(subscription) }, true);
}

export function removePushSubscription(endpoint: string) {
  return api<{ subscribed: boolean }>("/api/push/subscribe", { method: "DELETE", body: JSON.stringify({ endpoint }) }, true);
}

export function sendPushTest() {
  return api<{ sent: boolean }>("/api/push/test", { method: "POST", body: "{}" }, true);
}

export function linkEaPlayer(input: { eaUrl: string; gamertag: string }) {
  return api<{ playerId: string; playerName: string; clubId: string; clubName: string; matches: number; goals: number; assists: number; tackles: number; sourceUrl: string; historyStatus: "queued" }>("/api/community/player-link", { method: "POST", body: JSON.stringify(input) }, true);
}

export function getClubReferral() {
  return api<ClubReferralSummary>("/api/community/referral", {}, true);
}

export function redeemClubReferral(code: string) {
  return api<{ joined: boolean; clubId?: string; clubName?: string; bonusDays: number }>("/api/community/referral", { method: "POST", body: JSON.stringify({ code }) }, true);
}

export function registerCommunityClub(input: Omit<TeamRegistration, "id" | "submittedAt" | "status">) {
  return api<TeamRegistration>("/api/community/clubs/claim", { method: "POST", body: JSON.stringify(input) }, true);
}

export function watchCommunityClubs(callback: (items: TeamRegistration[]) => void, onError?: WatchError): Unsubscribe {
  return poll(() => api<TeamRegistration[]>("/api/community/claims"), callback, onError, 30_000);
}

export function createFriendly(input: { hostClubId: string; hostClubName: string; mode: ChallengeMode; date: string; time: string; region: string; invitedClubId?: string; invitedClubName?: string }) {
  return api<FriendlyRequest>("/api/community/matches", { method: "POST", body: JSON.stringify(input) }, true);
}

export function acceptFriendly(match: FriendlyRequest) {
  return api<FriendlyRequest>(`/api/community/matches/${encodeURIComponent(match.id)}`, { method: "PATCH", body: JSON.stringify({ action: "accept" }) }, true);
}

export function markFriendlyPlayed(match: FriendlyRequest) {
  return api<FriendlyRequest>(`/api/community/matches/${encodeURIComponent(match.id)}`, { method: "PATCH", body: JSON.stringify({ action: "played" }) }, true);
}

export function submitEaMatchSource(matchId: string, url: string) {
  return api<{ id: string; status: string; eaUrl: string; message: string }>(`/api/community/matches/${encodeURIComponent(matchId)}/ea-source`, { method: "POST", body: JSON.stringify({ url }) }, true);
}

export function watchFriendlies(callback: (items: FriendlyRequest[]) => void, onError?: WatchError): Unsubscribe {
  return poll(() => api<FriendlyRequest[]>("/api/community/matches"), callback, onError);
}

export function watchOfficialMatches(callback: (items: MatchRecord[]) => void, onError?: WatchError): Unsubscribe {
  return poll(() => api<MatchRecord[]>("/api/community/official-matches"), callback, onError, 30_000);
}

export function getOfficialMatch(matchId: string) {
  return api<MatchRecord>(`/api/community/official-matches?id=${encodeURIComponent(matchId)}`);
}

export function watchFriendly(matchId: string, callback: (item: FriendlyRequest | null) => void, onError?: WatchError): Unsubscribe {
  return poll(() => api<FriendlyRequest>(`/api/community/matches/${encodeURIComponent(matchId)}`).catch((error) => { if (error instanceof Error && /não encontrada/i.test(error.message)) return null; throw error; }), callback, onError);
}

export function publishTransferPost(input: Omit<TransferPostRecord, "id" | "authorUid" | "plan" | "createdAt">) {
  return api<TransferPostRecord>("/api/community/market", { method: "POST", body: JSON.stringify(input) }, true);
}

export function watchTransferPosts(callback: (items: TransferPostRecord[]) => void, onError?: WatchError): Unsubscribe {
  return poll(() => api<TransferPostRecord[]>("/api/community/market", {}, Boolean(getFirebaseAuth()?.currentUser)), callback, onError, 30_000);
}

export function applyToTransferPost(id: string) {
  return api<{ id: string; status: string }>(`/api/community/market/${encodeURIComponent(id)}/applications`, { method: "POST", body: "{}" }, true);
}

export function getTransferApplications(id: string) {
  return api<MarketApplicationRecord[]>(`/api/community/market/${encodeURIComponent(id)}/applications`, {}, true);
}

export function sendLobbyMessage(matchId: string, text: string) {
  return api<LobbyMessageRecord>(`/api/community/matches/${encodeURIComponent(matchId)}/messages`, { method: "POST", body: JSON.stringify({ text }) }, true);
}

export function watchLobbyMessages(matchId: string, callback: (items: LobbyMessageRecord[]) => void, onError?: WatchError): Unsubscribe {
  return poll(() => api<LobbyMessageRecord[]>(`/api/community/matches/${encodeURIComponent(matchId)}/messages`, {}, true), callback, onError, 8_000);
}

export async function listCommunityClubKeys() {
  const claims = await api<TeamRegistration[]>("/api/community/claims");
  return claims.map((item) => item.id);
}
