"use client";

import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
  type DocumentData,
  type QueryDocumentSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDb } from "./firebase";
import type { ChallengeMode, FriendlyRequest } from "./friendlies";
import type { TeamRegistration } from "./community";

export type CommunityRole = "owner" | "captain" | "player" | "visitor";
export type CommunityPlan = "free" | "pro" | "vip";

export interface CommunityProfile {
  uid: string;
  displayName: string;
  email: string;
  country: string;
  locale: string;
  role: CommunityRole;
  clubId?: string;
  clubName?: string;
  plan: CommunityPlan;
  reliability: number;
  elo: number;
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
}

export interface LobbyMessageRecord { id: string; authorUid: string; author: string; text: string; createdAt: string; }

const asIso = (value: unknown) => {
  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") return value.toDate().toISOString();
  return typeof value === "string" ? value : new Date().toISOString();
};
const record = (snapshot: QueryDocumentSnapshot<DocumentData>) => ({ id: snapshot.id, ...snapshot.data(), createdAt: asIso(snapshot.data().createdAt) });
const requireSession = () => {
  const user = getFirebaseAuth()?.currentUser;
  if (!user) throw new Error("AUTH_REQUIRED");
  return user;
};
const requireDb = () => {
  const db = getFirebaseDb();
  if (!db) throw new Error("FIREBASE_NOT_CONFIGURED");
  return db;
};

export async function ensureCommunityProfile() {
  const user = requireSession();
  const db = requireDb();
  const ref = doc(db, "users", user.uid);
  const current = await getDoc(ref);
  if (!current.exists()) await setDoc(ref, { uid: user.uid, displayName: user.displayName || user.email?.split("@")[0] || "Jogador", email: user.email || "", country: "brasil", locale: "pt-br", role: "visitor", plan: "free", reliability: 100, elo: 1000, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  return getCommunityProfile();
}

export async function getCommunityProfile(): Promise<CommunityProfile | null> {
  const user = getFirebaseAuth()?.currentUser;
  const db = getFirebaseDb();
  if (!user || !db) return null;
  const snapshot = await getDoc(doc(db, "users", user.uid));
  return snapshot.exists() ? snapshot.data() as CommunityProfile : null;
}

export async function saveCommunityPreferences(input: { country: string; locale: string }) {
  const user = requireSession(); const db = requireDb();
  await ensureCommunityProfile();
  await updateDoc(doc(db, "users", user.uid), { country: input.country, locale: input.locale, updatedAt: serverTimestamp() });
}

export async function registerCommunityClub(input: Omit<TeamRegistration, "id" | "submittedAt" | "status">) {
  const user = requireSession(); const db = requireDb();
  const clubKey = `${input.platform}-${input.clubId}`;
  const batch = writeBatch(db);
  batch.set(doc(db, "clubs", clubKey), { ...input, routeId: input.platform === "common-gen5" ? input.clubId : clubKey, ownerUid: user.uid, captainUids: [], playerUids: [], status: "pending_review", submittedAt: serverTimestamp(), updatedAt: serverTimestamp(), elo: 1000, reliability: 100, plan: "free" }, { merge: true });
  batch.set(doc(db, "users", user.uid), { uid: user.uid, displayName: user.displayName || input.responsibleName, email: user.email || input.email, role: "owner", clubId: input.platform === "common-gen5" ? input.clubId : clubKey, clubKey, clubName: input.clubName, plan: "free", reliability: 100, elo: 1000, updatedAt: serverTimestamp() }, { merge: true });
  await batch.commit();
  return { ...input, id: clubKey, submittedAt: new Date().toISOString(), status: "pending_review" } as TeamRegistration;
}

export function watchCommunityClubs(callback: (items: TeamRegistration[]) => void): Unsubscribe {
  const db = getFirebaseDb(); if (!db) { callback([]); return () => undefined; }
  return onSnapshot(query(collection(db, "clubs"), orderBy("submittedAt", "desc"), limit(100)), (snapshot) => callback(snapshot.docs.map((item) => ({ id: item.id, responsibleName: item.data().responsibleName, email: item.data().email, clubName: item.data().clubName, eaUrl: item.data().eaUrl, clubId: item.data().clubId, platform: item.data().platform, submittedAt: asIso(item.data().submittedAt), status: item.data().status }))));
}

export async function createFriendly(input: { hostClubId: string; hostClubName: string; mode: ChallengeMode; date: string; time: string; region: string; invitedClubId?: string; invitedClubName?: string }) {
  const user = requireSession(); const db = requireDb(); const profile = await getCommunityProfile();
  if (!profile?.clubId || profile.clubId !== input.hostClubId || !["owner", "captain"].includes(profile.role)) throw new Error("CLUB_PERMISSION_REQUIRED");
  const reference = await addDoc(collection(db, "friendlies"), { ...input, creatorUid: user.uid, creatorName: profile.displayName, status: "searching", hostElo: profile.elo || 1000, featured: profile.plan !== "free", plan: profile.plan, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  return reference.id;
}

export async function acceptFriendly(match: FriendlyRequest) {
  const user = requireSession(); const db = requireDb(); const profile = await getCommunityProfile();
  if (!profile?.clubId || !["owner", "captain"].includes(profile.role)) throw new Error("CLUB_PERMISSION_REQUIRED");
  if (profile.clubId === match.hostClubId) throw new Error("SELF_ACCEPT");
  if (match.mode === "invite" && match.invitedClubId !== profile.clubId) throw new Error("INVITE_RESERVED");
  await updateDoc(doc(db, "friendlies", match.id), { status: "scheduled", opponentClubId: profile.clubId, opponentClubName: profile.clubName || "Clube", opponentElo: profile.elo || 1000, acceptedByUid: user.uid, acceptedBy: profile.displayName, acceptedAt: serverTimestamp(), updatedAt: serverTimestamp() });
}

export async function markFriendlyPlayed(match: FriendlyRequest) {
  const user = requireSession(); const db = requireDb(); const profile = await getCommunityProfile();
  if (!profile?.clubId || ![match.hostClubId, match.opponentClubId].includes(profile.clubId) || !["owner", "captain"].includes(profile.role)) throw new Error("CLUB_PERMISSION_REQUIRED");
  await updateDoc(doc(db, "friendlies", match.id), { status: "waiting_ea", playedByUid: user.uid, playedAt: serverTimestamp(), updatedAt: serverTimestamp() });
}

export function watchFriendlies(callback: (items: FriendlyRequest[]) => void): Unsubscribe {
  const db = getFirebaseDb(); if (!db) { callback([]); return () => undefined; }
  return onSnapshot(query(collection(db, "friendlies"), orderBy("createdAt", "desc"), limit(100)), (snapshot) => callback(snapshot.docs.map((item) => record(item) as FriendlyRequest)));
}

export async function publishTransferPost(input: Omit<TransferPostRecord, "id" | "authorUid" | "plan" | "createdAt">) {
  const user = requireSession(); const db = requireDb(); const profile = await getCommunityProfile();
  await addDoc(collection(db, "marketPosts"), { ...input, authorUid: user.uid, plan: profile?.plan || "free", createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
}

export function watchTransferPosts(callback: (items: TransferPostRecord[]) => void): Unsubscribe {
  const db = getFirebaseDb(); if (!db) { callback([]); return () => undefined; }
  return onSnapshot(query(collection(db, "marketPosts"), orderBy("createdAt", "desc"), limit(100)), (snapshot) => callback(snapshot.docs.map((item) => record(item) as TransferPostRecord)));
}

export async function sendLobbyMessage(matchId: string, text: string) {
  const user = requireSession(); const db = requireDb(); const profile = await getCommunityProfile();
  await addDoc(collection(db, "friendlies", matchId, "messages"), { authorUid: user.uid, author: profile?.displayName || user.displayName || "Jogador", clubId: profile?.clubId || null, text: text.trim().slice(0, 500), createdAt: serverTimestamp() });
}

export function watchLobbyMessages(matchId: string, callback: (items: LobbyMessageRecord[]) => void): Unsubscribe {
  const db = getFirebaseDb(); if (!db) { callback([]); return () => undefined; }
  return onSnapshot(query(collection(db, "friendlies", matchId, "messages"), orderBy("createdAt", "asc"), limit(100)), (snapshot) => callback(snapshot.docs.map((item) => record(item) as LobbyMessageRecord)));
}

export async function listCommunityClubKeys() {
  const db = requireDb(); const snapshot = await getDocs(collection(db, "clubs")); return snapshot.docs.map((item) => item.id);
}
