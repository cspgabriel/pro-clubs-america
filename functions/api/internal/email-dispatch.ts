import { apiError, type FunctionContext } from "../../_lib/billing";
import { supabaseRest } from "../../_lib/supabase";
import { emailConfigured, sendFlowEmail, type EmailEnv, type EmailFlow } from "../../_lib/email";

interface ProfileRow { id: string; email: string; full_name: string | null; created_at: string; updated_at: string; player_id: string | null; club_id: string | null }

const DAY = 86400000;
const day = (value: string) => value.slice(0, 10);

async function digest(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function authorized(request: Request, secret?: string) {
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!secret || !supplied) return false;
  return (await digest(supplied)) === (await digest(secret));
}

/**
 * Executa os fluxos agendados. Idempotente: o dedupe_key impede reenvio
 * mesmo que o cron dispare varias vezes no mesmo dia.
 */
export const onRequestPost = async (context: FunctionContext) => {
  const env = context.env as EmailEnv;
  if (!(await authorized(context.request, env.EA_INGEST_SECRET))) return apiError("INGEST_AUTH_REQUIRED", 401);
  // Modo seguro: sem a trava EMAIL_ENABLED="true" o endpoint apenas relata o que
  // enviaria, sem chamar o provedor. Ver docs/OPERACAO-GROWTH.md.
  if (!emailConfigured(env)) return Response.json({ status: "disabled", reason: "EMAIL_DISABLED", sent: {}, note: "Nenhum e-mail foi enviado. Defina EMAIL_ENABLED=true para ativar." }, { status: 200 });

  const now = Date.now();
  const sent: Record<string, number> = { welcome_d0: 0, welcome_d2: 0, welcome_d5: 0, reactivation: 0, match_notification: 0 };
  const errors: string[] = [];

  const send = async (profile: ProfileRow, flow: EmailFlow, key: string, data?: Record<string, string>) => {
    const result = await sendFlowEmail(env, { profileId: profile.id, email: profile.email, name: profile.full_name || profile.email.split("@")[0], flow, dedupeKey: key, data });
    if (result.status === "sent") sent[flow] = (sent[flow] ?? 0) + 1;
    if (result.status === "failed") errors.push(`${flow}:${result.reason}`);
  };

  // 1) Boas-vindas D0 — todo perfil criado nas ultimas 48h que ainda nao recebeu.
  const fresh = await supabaseRest<ProfileRow[]>(env, `profiles?created_at=gte.${new Date(now - 2 * DAY).toISOString()}&select=id,email,full_name,created_at,updated_at,player_id,club_id&limit=200`);
  for (const profile of fresh) await send(profile, "welcome_d0", `welcome_d0:${profile.id}`);

  // 2) D2 e D5 — condicionais: so seguem se a acao pendente nao aconteceu.
  const window = await supabaseRest<ProfileRow[]>(env, `profiles?created_at=gte.${new Date(now - 8 * DAY).toISOString()}&select=id,email,full_name,created_at,updated_at,player_id,club_id&limit=500`);
  for (const profile of window) {
    const ageDays = (now - new Date(profile.created_at).getTime()) / DAY;
    if (ageDays >= 2 && ageDays < 5 && !profile.player_id) await send(profile, "welcome_d2", `welcome_d2:${profile.id}`);
    if (ageDays >= 5 && ageDays < 8 && !profile.club_id) await send(profile, "welcome_d5", `welcome_d5:${profile.id}`);
  }

  // 3) Reativacao — inativos ha 14+ dias, no maximo 1 por semana por pessoa.
  const dormant = await supabaseRest<ProfileRow[]>(env, `profiles?updated_at=lte.${new Date(now - 14 * DAY).toISOString()}&select=id,email,full_name,created_at,updated_at,player_id,club_id&limit=200`);
  for (const profile of dormant) {
    const previous = await supabaseRest<Array<{ id: string }>>(env, `email_events?profile_id=eq.${encodeURIComponent(profile.id)}&flow=eq.reactivation&status=eq.sent&created_at=gte.${new Date(now - 7 * DAY).toISOString()}&select=id&limit=1`);
    if (previous.length) continue;
    // Corta apos 3 reativacoes ignoradas: dominio novo nao aguenta engajamento baixo.
    const history = await supabaseRest<Array<{ id: string }>>(env, `email_events?profile_id=eq.${encodeURIComponent(profile.id)}&flow=eq.reactivation&status=eq.sent&select=id&limit=4`);
    if (history.length >= 3) continue;
    const snapshots = await supabaseRest<Array<{ home_club_name: string; away_club_name: string; home_score: number; away_score: number }>>(env, `ea_match_snapshots?created_at=gte.${new Date(now - 14 * DAY).toISOString()}&select=home_club_name,away_club_name,home_score,away_score&order=created_at.desc&limit=3`);
    const summary = snapshots.length
      ? `Ultimas partidas registradas: ${snapshots.map((item) => `${item.home_club_name} ${item.home_score}x${item.away_score} ${item.away_club_name}`).join(" · ")}.`
      : "Novos clubes e jogadores entraram na base desde a sua ultima visita.";
    await send(profile, "reactivation", `reactivation:${profile.id}:${day(new Date(now).toISOString())}`, { summary });
  }

  // 4) Notificacao de partida — digest diario por clube, nunca por evento.
  const today = day(new Date(now).toISOString());
  const claimed = await supabaseRest<Array<{ club_id: string }>>(env, "club_claims?status=eq.approved&select=club_id&limit=1000");
  for (const { club_id: clubId } of claimed) {
    const fresh24h = await supabaseRest<Array<{ home_club_name: string; away_club_name: string; home_score: number; away_score: number }>>(
      env,
      `ea_match_snapshots?or=(home_club_id.eq.${encodeURIComponent(clubId)},away_club_id.eq.${encodeURIComponent(clubId)})&created_at=gte.${new Date(now - DAY).toISOString()}&select=home_club_name,away_club_name,home_score,away_score&order=created_at.desc&limit=5`,
    );
    if (!fresh24h.length) continue;
    const members = await supabaseRest<ProfileRow[]>(env, `profiles?club_id=eq.${encodeURIComponent(clubId)}&select=id,email,full_name,created_at,updated_at,player_id,club_id&limit=60`);
    const lines = fresh24h.map((item) => `${item.home_club_name} ${item.home_score}x${item.away_score} ${item.away_club_name}`).join(" · ");
    const summary = `${fresh24h.length} ${fresh24h.length === 1 ? "partida nova foi importada" : "partidas novas foram importadas"} da EA: ${lines}.`;
    for (const member of members) {
      await send(member, "match_notification", `match_notification:${member.id}:${today}`, {
        subject: fresh24h.length === 1 ? "Nova partida do seu clube" : `${fresh24h.length} partidas novas do seu clube`,
        title: "Partidas importadas",
        summary,
      });
    }
  }

  return Response.json({ status: "ok", sent, errors: errors.slice(0, 20) }, { headers: { "cache-control": "no-store" } });
};

export const onRequest = () => apiError("Metodo nao permitido.", 405);
