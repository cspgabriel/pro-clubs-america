import { apiError, assertSameOrigin, verifyFirebaseRequest, type BillingEnv, type FunctionContext } from "../../_lib/billing";
import { ensureProfile, findClubById, findClubByPublicRouteId, publicRouteId, supabaseRest, type SupabaseProfile } from "../../_lib/supabase";
import { countries, locales } from "../../../src/lib/i18n";
import { nicknamePattern, normalizeNickname, normalizePhone, validPhone, playerDevices, playerPositions } from "../../../src/lib/player-identity";

interface ClaimRow { id: string; status: string; club_id: string; created_at: string }

async function profilePayload(env: BillingEnv, profile: SupabaseProfile) {
  const contact = (await supabaseRest<Array<{ phone: string | null }>>(env, `profile_private_contacts?profile_id=eq.${encodeURIComponent(profile.id)}&select=phone&limit=1`))[0];
  const club = profile.club_id ? await findClubById(env, profile.club_id) : null;
  const player = profile.player_id ? (await supabaseRest<Array<{ gamertag: string; games_played: number; goals: number; assists: number; tackles_made: number }>>(env, `players?id=eq.${encodeURIComponent(profile.player_id)}&select=gamertag,games_played,goals,assists,tackles_made&limit=1`))[0] : null;
  const claims = await supabaseRest<ClaimRow[]>(env, `club_claims?profile_id=eq.${encodeURIComponent(profile.id)}&order=created_at.desc&limit=1`);
  const pending = claims[0]?.status === "pending_review" ? await findClubById(env, claims[0].club_id) : null;
  return {
    id: profile.id,
    uid: profile.firebase_uid,
    displayName: profile.full_name || profile.email.split("@")[0],
    nickname: profile.nickname || "",
    gamingPlatform: profile.gaming_platform || "",
    preferredPosition: profile.preferred_position || "",
    lookingForClub: profile.looking_for_club || false,
    phone: contact?.phone || "",
    email: profile.email,
    country: profile.country_slug || "brasil",
    locale: profile.locale || "pt-br",
    onboardingCompleted: Boolean(profile.onboarding_completed_at),
    role: profile.role,
    plan: profile.plan,
    premiumAccess: profile.plan !== "free" || Boolean(profile.bonus_access_until && new Date(profile.bonus_access_until).getTime() > Date.now()),
    bonusAccessUntil: profile.bonus_access_until || undefined,
    clubId: club ? publicRouteId(club) : undefined,
    clubName: club?.name,
    playerId: player?.gamertag,
    playerName: player?.gamertag,
    playerGames: player?.games_played,
    playerGoals: player?.goals,
    playerAssists: player?.assists,
    playerTackles: player?.tackles_made,
    playerEaUrl: profile.player_ea_url || undefined,
    playerEaLinkedAt: profile.player_ea_linked_at || undefined,
    pendingClubId: pending ? publicRouteId(pending) : undefined,
    pendingClubName: pending?.name,
    pendingClaimId: claims[0]?.status === "pending_review" ? claims[0].id : undefined,
  };
}

async function authenticated(context: FunctionContext) {
  const identity = await verifyFirebaseRequest(context.request, context.env);
  const profile = await ensureProfile(context.env, identity, identity.name);
  return { identity, profile };
}

export const onRequestGet = async (context: FunctionContext) => {
  try {
    const { profile } = await authenticated(context);
    return Response.json(await profilePayload(context.env, profile), { headers: { "cache-control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "PROFILE_FAILED";
    return apiError(message.startsWith("AUTH_") ? "AUTH_REQUIRED" : "Não foi possível carregar o perfil.", message.startsWith("AUTH_") ? 401 : 500);
  }
};

export const onRequestPost = onRequestGet;

export const onRequestPatch = async (context: FunctionContext) => {
  try {
    assertSameOrigin(context.request, context.env.SITE_URL);
    const { profile } = await authenticated(context);
    const body = await context.request.json() as { country?: string; locale?: string; completeOnboarding?: boolean; clubId?: string | null; nickname?: unknown; displayName?: unknown; gamingPlatform?: unknown; preferredPosition?: unknown; lookingForClub?: unknown; phone?: unknown };
    const country = countries.find((item) => item.slug === body.country);
    const locale = locales.find((item) => item.id === body.locale);
    if (!country || !locale) return apiError("Escolha um país e idioma disponíveis.");
    const updates: Partial<SupabaseProfile> & { country_code: string } = {
      country_slug: country.slug, country_code: country.code, locale: locale.id,
    };
    const identityError = (error: string) => Response.json({ error, step: 1 }, { status: 400 });
    if (body.nickname !== undefined || (body.completeOnboarding && !profile.nickname)) {
      if (typeof body.nickname !== "string" || !nicknamePattern.test(normalizeNickname(body.nickname))) return identityError("Escolha um nick de 3 a 24 letras, números ou hífen, começando e terminando com letra ou número.");
      updates.nickname = normalizeNickname(body.nickname);
    }
    if (body.displayName !== undefined) {
      if (typeof body.displayName !== "string" || body.displayName.trim().length < 2 || body.displayName.trim().length > 60 || /[\x00-\x1f]/.test(body.displayName)) return identityError("Informe um nome de 2 a 60 caracteres.");
      updates.full_name = body.displayName.trim();
    }
    if (body.gamingPlatform !== undefined) {
      if (typeof body.gamingPlatform !== "string" || (body.gamingPlatform && !playerDevices.some((item) => item.id === body.gamingPlatform))) return apiError("Escolha uma plataforma disponível.");
      updates.gaming_platform = body.gamingPlatform || null;
    }
    if (body.preferredPosition !== undefined) {
      if (typeof body.preferredPosition !== "string" || (body.preferredPosition && !playerPositions.includes(body.preferredPosition))) return apiError("Escolha uma posição disponível.");
      updates.preferred_position = body.preferredPosition || null;
    }
    if (body.lookingForClub !== undefined) {
      if (typeof body.lookingForClub !== "boolean") return apiError("Disponibilidade inválida.");
      updates.looking_for_club = body.lookingForClub;
    }
    let phone: string | null = null;
    if (body.phone !== undefined) {
      if (typeof body.phone !== "string" || body.phone.length > 40 || !validPhone(normalizePhone(body.phone))) return identityError("Informe o telefone com + e código do país, ou deixe em branco.");
      phone = normalizePhone(body.phone) || null;
    }
    if (body.completeOnboarding === true) {
      if (body.clubId !== null && (typeof body.clubId !== "string" || !/^(?:(?:common-gen4|nx)-)?\d{1,12}$/.test(body.clubId))) {
        return apiError("Selecione um time da base ou a opção sem time.");
      }
      const club = body.clubId ? await findClubByPublicRouteId(context.env, body.clubId) : null;
      if (body.clubId && !club) return apiError("Time não encontrado na base. Pesquise novamente.", 404);
      // Choosing a club is self-declared membership, never ownership or an EA player claim.
      if (profile.club_id && profile.club_id !== club?.id) return apiError("Sua conta já está vinculada a outro time. Mantenha o vínculo atual para continuar.", 409);
      updates.club_id = club?.id || null;
      if (profile.role === "visitor" && club) updates.role = "player";
      updates.onboarding_completed_at = profile.onboarding_completed_at || new Date().toISOString();
    }
    const rows = await supabaseRest<SupabaseProfile[]>(context.env, "rpc/save_profile_preferences", {
      method: "POST",
      body: JSON.stringify({ p_profile_id: profile.id, p_updates: updates, p_write_phone: body.phone !== undefined, p_phone: phone }),
    });
    if (!rows[0]) throw new Error("PROFILE_UPDATE_EMPTY");
    return Response.json(await profilePayload(context.env, rows[0]), { headers: { "cache-control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "PROFILE_UPDATE_FAILED";
    if (message.includes("profiles_nickname_key")) return Response.json({ error: "Este nick já está em uso. Escolha outro.", step: 1 }, { status: 409 });
    return apiError(message.startsWith("AUTH_") ? "AUTH_REQUIRED" : "Não foi possível salvar o perfil.", message.startsWith("AUTH_") ? 401 : message === "ORIGIN_NOT_ALLOWED" ? 403 : 500);
  }
};

export const onRequest = () => apiError("Método não permitido.", 405);
