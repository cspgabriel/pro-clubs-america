import { readFile } from "node:fs/promises";
import { assertFails, assertSucceeds, initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc, writeBatch } from "firebase/firestore";

const projectId = "primeval-jet-326417";
const rules = await readFile(new URL("../firestore.rules", import.meta.url), "utf8");
const testEnv = await initializeTestEnvironment({ projectId, firestore: { rules } });

const safeProfile = (uid, overrides = {}) => ({
  uid,
  displayName: uid,
  email: `${uid}@example.test`,
  country: "brasil",
  locale: "pt-br",
  role: "visitor",
  plan: "free",
  elo: 1000,
  reliability: 100,
  ...overrides,
});

const safeClub = (ownerUid, clubId, overrides = {}) => ({
  clubId,
  clubName: `Clube ${clubId}`,
  platform: "common-gen5",
  eaUrl: `https://www.ea.com/pt-br/games/ea-sports-fc/clubs/overview?clubId=${clubId}&platform=common-gen5`,
  responsibleName: ownerUid,
  email: `${ownerUid}@example.test`,
  ownerUid,
  captainUids: [],
  playerUids: [],
  status: "pending_review",
  plan: "free",
  elo: 1000,
  reliability: 100,
  ...overrides,
});

try {
  const anonymous = testEnv.unauthenticatedContext().firestore();
  const visitor = testEnv.authenticatedContext("visitor").firestore();

  await assertSucceeds(setDoc(doc(visitor, "users", "visitor"), safeProfile("visitor")));
  await assertSucceeds(getDoc(doc(visitor, "users", "visitor")));
  await assertFails(getDoc(doc(testEnv.authenticatedContext("attacker").firestore(), "users", "visitor")));
  await assertFails(setDoc(doc(testEnv.authenticatedContext("attacker").firestore(), "users", "attacker"), safeProfile("attacker", { role: "owner", clubId: "999", clubKey: "common-gen5-999" })));
  await assertFails(updateDoc(doc(visitor, "users", "visitor"), { role: "owner", clubId: "999", clubKey: "common-gen5-999" }));
  await assertFails(setDoc(doc(anonymous, "marketPosts", "anon"), { authorUid: "anon" }));

  const ownerDb = testEnv.authenticatedContext("owner-a").firestore();
  await assertSucceeds(setDoc(doc(ownerDb, "users", "owner-a"), safeProfile("owner-a")));
  const registration = writeBatch(ownerDb);
  registration.set(doc(ownerDb, "clubs", "common-gen5-100"), safeClub("owner-a", "100"));
  registration.set(doc(ownerDb, "users", "owner-a"), { role: "owner", clubId: "100", clubKey: "common-gen5-100" }, { merge: true });
  await assertSucceeds(registration.commit());

  await testEnv.withSecurityRulesDisabled(async (context) => {
    const admin = context.firestore();
    await setDoc(doc(admin, "users", "owner-b"), safeProfile("owner-b", { role: "owner", clubId: "200", clubKey: "common-gen5-200" }));
    await setDoc(doc(admin, "clubs", "common-gen5-200"), safeClub("owner-b", "200"));
    await setDoc(doc(admin, "users", "outsider"), safeProfile("outsider", { role: "owner", clubId: "300", clubKey: "common-gen5-300" }));
    await setDoc(doc(admin, "clubs", "common-gen5-300"), safeClub("outsider", "300"));
  });

  const friendly = {
    creatorUid: "owner-a",
    creatorName: "Owner A",
    hostClubId: "100",
    hostClubName: "Clube 100",
    mode: "open",
    date: "2026-08-10",
    time: "21:30",
    region: "Brasil",
    status: "searching",
    hostElo: 1000,
    featured: false,
    plan: "free",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  await assertSucceeds(setDoc(doc(ownerDb, "friendlies", "match-1"), friendly));
  await assertFails(setDoc(doc(visitor, "friendlies", "visitor-match"), { ...friendly, creatorUid: "visitor" }));
  await assertSucceeds(getDoc(doc(anonymous, "friendlies", "match-1")));

  const ownerB = testEnv.authenticatedContext("owner-b").firestore();
  await assertSucceeds(updateDoc(doc(ownerB, "friendlies", "match-1"), { status: "scheduled", opponentClubId: "200", opponentClubName: "Clube 200", opponentElo: 1000, acceptedByUid: "owner-b", acceptedBy: "Owner B", acceptedAt: new Date(), updatedAt: new Date() }));
  await assertSucceeds(setDoc(doc(ownerB, "friendlies", "match-1", "messages", "message-1"), { authorUid: "owner-b", author: "Owner B", clubId: "200", text: "Sala aberta", createdAt: new Date() }));
  await assertSucceeds(getDoc(doc(ownerDb, "friendlies", "match-1", "messages", "message-1")));
  await assertFails(getDoc(doc(testEnv.authenticatedContext("outsider").firestore(), "friendlies", "match-1", "messages", "message-1")));

  console.log("Firestore rules: 13 security assertions passed.");
} finally {
  await testEnv.cleanup();
}
