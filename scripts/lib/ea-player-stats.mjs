const numeric = (value) => value == null || value === "" || !Number.isFinite(Number(value)) ? undefined : Number(value);
const text = (value) => String(value ?? "").trim();

export function normalizeEaPlayers(payload, clubIds) {
  if (!payload || typeof payload !== "object") return [];
  return clubIds.flatMap((clubId) => Object.values(payload[clubId] || {}).flatMap((player) => {
    if (!player || typeof player !== "object") return [];
    const name = text(player.playername || player.playerName || player.name || player.eaId);
    if (!name) return [];
    const cleanSheet = numeric(player.cleanSheet ?? player.cleanSheets ?? player.cleansheetsany ?? player.cleansheetsdef ?? player.cleansheetsgk);
    return [{
      playerId: text(player.playerId || player.nucleusId || name), playerName: name, clubId: text(clubId),
      position: text(player.pos || player.position || player.favoritePosition),
      goals: numeric(player.goals) ?? 0, assists: numeric(player.assists) ?? 0,
      rating: numeric(player.rating), shots: numeric(player.shots),
      passesMade: numeric(player.passesmade ?? player.passesMade), passAttempts: numeric(player.passattempts ?? player.passAttempts),
      tacklesMade: numeric(player.tacklesmade ?? player.tacklesMade), tackleAttempts: numeric(player.tackleattempts ?? player.tackleAttempts),
      redCards: numeric(player.redcards ?? player.redCards), saves: numeric(player.saves),
      cleanSheet: cleanSheet == null ? undefined : cleanSheet > 0,
      secondsPlayed: numeric(player.secondsPlayed), manOfTheMatch: numeric(player.mom),
      archetypeId: text(player.archetypeid || player.archetypeId) || undefined,
      vproAttributes: text(player.vproattr) || undefined,
    }];
  }));
}
