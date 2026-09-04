import { apiError, assertSameOrigin, verifyFirebaseRequest, type FunctionContext } from "../../_lib/billing";
import { sendFlowEmail, type EmailEnv } from "../../_lib/email";
import { ensureProfile, findClubById, publicRouteId, supabaseRest, type SupabaseProfile } from "../../_lib/supabase";

interface InvitationRow {
  id: string;
  club_id: string;
  inviter_profile_id: string;
  invitee_profile_id: string;
  status: "pending" | "accepted" | "declined" | "cancelled" | "expired";
  expires_at: string;
  created_at: string;
}

interface InvitationProfile {
  id: string;
  full_name: string | null;
  nickname: string | null;
  email: string;
  avatar_url: string | null;
  club_id: string | null;
}

const canManage = (profile: SupabaseProfile) => Boolean(profile.club_id && (profile.role === "owner" || profile.role === "captain" || profile.role === "admin"));

async function authenticated(context: FunctionContext) {
  const identity = await verifyFirebaseRequest(context.request, context.env);
  const profile = await ensureProfile(context.env, identity, identity.name);
  return { identity, profile };
}

async function invitationsPayload(context: FunctionContext, profile: SupabaseProfile) {
  const now = new Date().toISOString();
  const incoming = await supabaseRest<InvitationRow[]>(context.env, `club_invitations?invitee_profile_id=eq.${encodeURIComponent(profile.id)}&status=eq.pending&expires_at=gt.${encodeURIComponent(now)}&select=id,club_id,inviter_profile_id,invitee_profile_id,status,expires_at,created_at&order=created_at.desc&limit=20`);
  const outgoing = canManage(profile)
    ? await supabaseRest<InvitationRow[]>(context.env, `club_invitations?club_id=eq.${encodeURIComponent(profile.club_id!)}&status=eq.pending&expires_at=gt.${encodeURIComponent(now)}&select=id,club_id,inviter_profile_id,invitee_profile_id,status,expires_at,created_at&order=created_at.desc&limit=50`)
    : [];
  const rows = [...incoming, ...outgoing];
  const profileIds = [...new Set(rows.flatMap((row) => [row.inviter_profile_id, row.invitee_profile_id]))];
  const profiles = profileIds.length
    ? await supabaseRest<InvitationProfile[]>(context.env, `profiles?id=in.(${profileIds.map(encodeURIComponent).join(",")})&select=id,full_name,nickname,email,avatar_url,club_id`)
    : [];
  const profileMap = new Map(profiles.map((item) => [item.id, item]));
  const clubIds = [...new Set(rows.map((row) => row.club_id))];
  const clubs = (await Promise.all(clubIds.map((id) => findClubById(context.env, id)))).filter((club) => club !== null);
  const clubMap = new Map(clubs.map((club) => [club.id, club]));
  const format = (row: InvitationRow) => {
    const club = clubMap.get(row.club_id);
    const inviter = profileMap.get(row.inviter_profile_id);
    const invitee = profileMap.get(row.invitee_profile_id);
    return {
      id: row.id,
      status: row.status,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      club: club ? { id: publicRouteId(club), name: club.name, platform: club.platform } : { id: row.club_id, name: "Clube", platform: "common-gen5" },
      inviter: { id: row.inviter_profile_id, name: inviter?.full_name || "Capitão", nickname: inviter?.nickname || undefined },
      invitee: { id: row.invitee_profile_id, name: invitee?.full_name || invitee?.email || "Jogador", nickname: invitee?.nickname || undefined, avatarUrl: invitee?.avatar_url || undefined },
    };
  };
  const currentClub = profile.club_id ? await findClubById(context.env, profile.club_id) : null;
  return {
    incoming: incoming.map(format),
    outgoing: outgoing.map(format),
    membership: currentClub ? { clubId: publicRouteId(currentClub), clubName: currentClub.name, role: profile.role, canManage: canManage(profile) } : null,
  };
}

export const onRequestGet = async (context: FunctionContext) => {
  try {
    const { profile } = await authenticated(context);
    return Response.json(await invitationsPayload(context, profile), { headers: { "cache-control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "INVITATIONS_FAILED";
    return apiError(message.startsWith("AUTH_") ? "AUTH_REQUIRED" : "Não foi possível carregar os convites.", message.startsWith("AUTH_") ? 401 : 500);
  }
};

export const onRequestPost = async (context: FunctionContext) => {
  try {
    assertSameOrigin(context.request, context.env.SITE_URL);
    const { profile } = await authenticated(context);
    if (!canManage(profile)) return apiError("Apenas dono ou capitão pode convidar jogadores.", 403);
    const body = await context.request.json() as { target?: unknown };
    const target = typeof body.target === "string" ? body.target.trim().toLocaleLowerCase("en-US") : "";
    if (target.length < 3 || target.length > 254) return apiError("Informe o @nick ou e-mail do jogador.");
    const query = target.includes("@") && !target.startsWith("@")
      ? `email=ilike.${encodeURIComponent(target)}`
      : `nickname=eq.${encodeURIComponent(target.replace(/^@/, ""))}`;
    const invitee = (await supabaseRest<InvitationProfile[]>(context.env, `profiles?${query}&select=id,full_name,nickname,email,avatar_url,club_id&limit=1`))[0];
    if (!invitee) return apiError("Jogador não encontrado. Para quem ainda não tem conta, use o link geral do elenco.", 404);
    if (invitee.id === profile.id) return apiError("Você não pode convidar a própria conta.", 409);
    if (invitee.club_id === profile.club_id) return apiError("Este jogador já faz parte do seu clube.", 409);
    if (invitee.club_id) return apiError("Este jogador já representa outro clube.", 409);
    const existing = await supabaseRest<InvitationRow[]>(context.env, `club_invitations?club_id=eq.${encodeURIComponent(profile.club_id!)}&invitee_profile_id=eq.${encodeURIComponent(invitee.id)}&status=eq.pending&select=id,club_id,inviter_profile_id,invitee_profile_id,status,expires_at,created_at&limit=1`);
    if (existing[0]) return apiError("Este convite já está aguardando resposta.", 409);
    const created = await supabaseRest<InvitationRow[]>(context.env, "club_invitations", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ club_id: profile.club_id, inviter_profile_id: profile.id, invitee_profile_id: invitee.id }),
    });
    const invitation = created[0];
    if (!invitation) throw new Error("INVITATION_CREATE_EMPTY");
    const club = await findClubById(context.env, profile.club_id!);
    if (!club) throw new Error("CLUB_NOT_FOUND");
    const origin = context.env.SITE_URL || new URL(context.request.url).origin;
    const result = await sendFlowEmail(context.env as EmailEnv, {
      profileId: invitee.id,
      email: invitee.email,
      name: invitee.full_name || invitee.nickname || "jogador",
      flow: "club_invitation",
      dedupeKey: `club_invitation:${invitation.id}`,
      data: {
        clubName: club.name,
        inviterName: profile.full_name || profile.nickname || "Um capitão",
        url: `${origin}/time/?id=${encodeURIComponent(publicRouteId(club))}`,
      },
    });
    return Response.json({ invitationId: invitation.id, emailStatus: result.status, ...(result.status === "skipped" ? { emailReason: result.reason } : {}) }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "INVITATION_CREATE_FAILED";
    if (message.includes("club_invitations_pending_key")) return apiError("Este convite já está aguardando resposta.", 409);
    return apiError(message.startsWith("AUTH_") ? "AUTH_REQUIRED" : message === "ORIGIN_NOT_ALLOWED" ? "Origem não permitida." : "Não foi possível enviar o convite.", message.startsWith("AUTH_") ? 401 : message === "ORIGIN_NOT_ALLOWED" ? 403 : 500);
  }
};

export const onRequestPatch = async (context: FunctionContext) => {
  try {
    assertSameOrigin(context.request, context.env.SITE_URL);
    const { profile } = await authenticated(context);
    const body = await context.request.json() as { id?: unknown; action?: unknown };
    const action = typeof body.action === "string" ? body.action : "";
    if (action === "leave") {
      const result = await supabaseRest<Array<{ club_id: string; club_name: string }>>(context.env, "rpc/leave_community_club", { method: "POST", body: JSON.stringify({ p_profile_id: profile.id }) });
      return Response.json({ left: true, clubName: result[0]?.club_name });
    }
    const id = typeof body.id === "string" && /^[0-9a-f-]{36}$/i.test(body.id) ? body.id : "";
    if (!id || !["accept", "decline", "cancel"].includes(action)) return apiError("Ação de convite inválida.");
    if (action === "cancel") {
      if (!canManage(profile)) return apiError("Apenas dono ou capitão pode cancelar convites.", 403);
      const invitation = (await supabaseRest<InvitationRow[]>(context.env, `club_invitations?id=eq.${encodeURIComponent(id)}&club_id=eq.${encodeURIComponent(profile.club_id!)}&status=eq.pending&select=id,club_id,inviter_profile_id,invitee_profile_id,status,expires_at,created_at&limit=1`))[0];
      if (!invitation) return apiError("Convite não encontrado.", 404);
      await supabaseRest(context.env, `club_invitations?id=eq.${encodeURIComponent(id)}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ status: "cancelled", responded_at: new Date().toISOString(), updated_at: new Date().toISOString() }) });
      return Response.json({ id, status: "cancelled" });
    }
    const result = await supabaseRest<Array<{ invitation_id: string; invitation_status: string; club_id: string; club_name: string }>>(context.env, "rpc/respond_club_invitation", {
      method: "POST",
      body: JSON.stringify({ p_invitation_id: id, p_profile_id: profile.id, p_action: action }),
    });
    return Response.json({ id: result[0]?.invitation_id || id, status: result[0]?.invitation_status || action, clubName: result[0]?.club_name });
  } catch (error) {
    const message = error instanceof Error ? error.message : "INVITATION_UPDATE_FAILED";
    const known = message.includes("INVITATION_NOT_FOUND") ? "Convite não encontrado." : message.includes("INVITATION_ALREADY_RESOLVED") ? "Este convite já foi respondido." : message.includes("INVITATION_EXPIRED") ? "Este convite expirou." : message.includes("INVITEE_HAS_CLUB") ? "Você já representa outro clube." : message.includes("OWNER_CANNOT_LEAVE") ? "O dono precisa transferir a gestão antes de sair." : message.includes("PROFILE_WITHOUT_CLUB") ? "Você não está vinculado a um clube." : "Não foi possível atualizar o convite.";
    return apiError(message.startsWith("AUTH_") ? "AUTH_REQUIRED" : known, message.startsWith("AUTH_") ? 401 : message.includes("NOT_FOUND") ? 404 : 409);
  }
};

export const onRequest = () => apiError("Método não permitido.", 405);
