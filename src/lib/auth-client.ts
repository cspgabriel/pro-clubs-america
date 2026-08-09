"use client";

import { createUserWithEmailAndPassword, GoogleAuthProvider, onAuthStateChanged, sendPasswordResetEmail, signInWithEmailAndPassword, signInWithPopup, signOut, updateProfile, type User } from "firebase/auth";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase";

export interface AuthUserSnapshot { uid: string; name: string; email: string; photoUrl?: string; provider: "google" | "password" | "demo"; }
export const authStorageKey = "clubs-brasil-auth-user";
const authEvent = "clubs-brasil-auth-change";

function snapshot(user: User, provider: "google" | "password"): AuthUserSnapshot {
  return { uid: user.uid, name: user.displayName || user.email?.split("@")[0] || "Jogador", email: user.email ?? "", photoUrl: user.photoURL ?? undefined, provider };
}

function persist(user: AuthUserSnapshot | null) {
  if (user) localStorage.setItem(authStorageKey, JSON.stringify(user)); else localStorage.removeItem(authStorageKey);
  window.dispatchEvent(new CustomEvent(authEvent));
  return user;
}

export function getStoredAuthUser(): AuthUserSnapshot | null {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(localStorage.getItem(authStorageKey) ?? "null"); } catch { return null; }
}

export async function loginWithGoogle() {
  const auth = getFirebaseAuth();
  if (!auth) return persist({ uid: `demo-google-${Date.now()}`, name: "Jogador Google", email: "jogador@demo.proclubsamerica.com", provider: "demo" });
  const result = await signInWithPopup(auth, new GoogleAuthProvider());
  return persist(snapshot(result.user, "google"));
}

export async function loginWithEmail(email: string, password: string) {
  const auth = getFirebaseAuth();
  if (!auth) return persist({ uid: `demo-email-${Date.now()}`, name: email.split("@")[0] || "Jogador", email, provider: "demo" });
  const result = await signInWithEmailAndPassword(auth, email, password);
  return persist(snapshot(result.user, "password"));
}

export async function registerWithEmail(name: string, email: string, password: string) {
  const auth = getFirebaseAuth();
  if (!auth) return persist({ uid: `demo-register-${Date.now()}`, name, email, provider: "demo" });
  const result = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(result.user, { displayName: name });
  return persist(snapshot(result.user, "password"));
}

export async function requestPasswordReset(email: string) {
  const auth = getFirebaseAuth();
  if (auth) await sendPasswordResetEmail(auth, email);
  return { demo: !auth };
}

export async function logout() {
  const auth = getFirebaseAuth();
  if (auth) await signOut(auth);
  persist(null);
}

export function observeAuth(callback: (user: AuthUserSnapshot | null) => void) {
  const update = () => callback(getStoredAuthUser());
  window.addEventListener(authEvent, update);
  window.addEventListener("storage", update);
  const auth = getFirebaseAuth();
  const unsubscribe = auth ? onAuthStateChanged(auth, (user) => callback(user ? snapshot(user, user.providerData[0]?.providerId === "google.com" ? "google" : "password") : null)) : () => undefined;
  update();
  return () => { window.removeEventListener(authEvent, update); window.removeEventListener("storage", update); unsubscribe(); };
}

export { isFirebaseConfigured };
