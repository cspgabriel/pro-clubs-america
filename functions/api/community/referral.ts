import { apiError, verifyFirebaseRequest, type FunctionContext } from "../../_lib/billing";
import { ensureProfile, findClubById, supabaseRest } from "../../_lib/supabase";

interface ReferralMember { id: string; full_name: string | null; role: string; avatar_url: string | null; }
interface ReferralRow { id: string; credited_at: string; }

async function payload(context: FunctionContext) {
  const identity = await verifyFirebaseRequest(context.request, context.env);
  const profile = await ensureProfile(context.env, identity, identity.name);
  const club = profile.club_id ? await findClubById(context.env, profile.club_id) : null;
  const members = club ? await supabaseRest<ReferralMember[]>(context.env, `profiles?select=id,full_name,role,avatar_url&club_id=eq.${encodeURIComponent(club.id)}&order=full_name.asc`) : [];
  const referrals = await supabaseRest<ReferralRow[]>(context.env, `club_referrals?select=id,credited_at&inviter_profile_id=eq.${encodeURIComponent(profile.id)}&order=credited_at.desc`);
  const code = profile.referral_code || "";
  return {
    code,
    inviteUrl: code ? `${new URL(context.request.url).origin}/criar-conta?ref=${encodeURIComponent(code)}` : "",
    clubId: club?.ea_club_id,
    clubName: club?.name,
    bonusAccessUntil: profile.bonus_access_until,
    invitedCount: referrals.length,
    members: members.map((member) => ({ id: member.id, name: member.full_name || "Jogador", role: member.role, avatarUrl: member.avatar_url })),
  };
}

export const onRequestGet = async (context: FunctionContext) => {
  try { return Response.json(await payload(context), { headers: { "cache-control": "no-store" } }); }
  catch (error) {
    const message = error instanceof Error ? error.message : "REFERRAL_FAILED";
    return apiError(message.startsWith("AUTH_") ? "AUTH_REQUIRED" : "Não foi possível carregar os convites.", message.startsWith("AUTH_") ? 401 : 500);
  }
};

export const onRequestPost = async (context: FunctionContext) => {
  try {
    const identity = await verifyFirebaseRequest(context.request, context.env);
    await ensureProfile(context.env, identity, identity.name);
    const body = await context.request.json() as { code?: string };
    const code = String(body.code || "").trim().toUpperCase();
    if (!/^[A-Z0-9]{8,16}$/.test(code)) return apiError("Convite inválido.");
    const result = await supabaseRest<Array<{ club_id: string; club_name: string; bonus_days: number }>>(context.env, "rpc/redeem_club_referral", {
      method: "POST", body: JSON.stringify({ p_invitee_uid: identity.uid, p_code: code }),
    });
    return Response.json({ joined: true, clubId: result[0]?.club_id, clubName: result[0]?.club_name, bonusDays: result[0]?.bonus_days || 15 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "REFERRAL_FAILED";
    const known = message.includes("REFERRAL_ALREADY_USED") ? "Este convite já foi utilizado." : message.includes("REFERRAL_SELF") ? "Você não pode usar o próprio convite." : message.includes("REFERRAL_INVITER_WITHOUT_CLUB") ? "O time do convite ainda não está vinculado." : message.includes("REFERRAL_INVITEE_HAS_CLUB") ? "Sua conta já pertence a outro time." : "Não foi possível aceitar o convite.";
    return apiError(message.startsWith("AUTH_") ? "AUTH_REQUIRED" : known, message.startsWith("AUTH_") ? 401 : 409);
  }
};

export const onRequest = () => apiError("Método não permitido.", 405);
