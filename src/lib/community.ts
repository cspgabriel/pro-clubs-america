export interface TeamRegistration {
  id: string;
  responsibleName: string;
  email: string;
  clubName: string;
  eaUrl: string;
  clubId: string;
  platform: string;
  country: string;
  submittedAt: string;
  status: "pending_review" | "indexed";
}

export function parseEaClubUrl(value: string) {
  try {
    const url = new URL(value);
    const validHost = url.hostname === "www.ea.com" || url.hostname === "ea.com";
    const validPath = /^\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?games\/ea-sports-fc\/clubs\/(?:overview|member-list|match-history)$/.test(url.pathname);
    const clubId = url.searchParams.get("clubId") ?? "";
    const platform = url.searchParams.get("platform") ?? "";
    if (!validHost || !validPath || !/^\d+$/.test(clubId) || !platform) return null;
    return { clubId, platform, normalizedUrl: url.toString() };
  } catch { return null; }
}
