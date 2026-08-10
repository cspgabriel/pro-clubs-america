import { apiError, assertSameOrigin, verifyFirebaseRequest, type FunctionContext } from "../../../../_lib/billing";
import type { MatchRow } from "../../../../_lib/community";
import { ensureProfile, supabaseRest } from "../../../../_lib/supabase";

type MessageContext = FunctionContext & { params: { id: string } };
interface MessageRow { id: string; author_profile_id: string; author_name: string; message: string; created_at: string }

async function participant(context: MessageContext) {
  const identity = await verifyFirebaseRequest(context.request, context.env);
  const profile = await ensureProfile(context.env, identity, identity.name);
  const match = (await supabaseRest<MatchRow[]>(context.env, `matches?id=eq.${encodeURIComponent(context.params.id)}&limit=1`))[0];
  if (!match || !profile.club_id || ![match.home_club_id, match.away_club_id].includes(profile.club_id)) throw new Error("MATCH_PARTICIPANT_REQUIRED");
  return profile;
}

export const onRequestGet = async (context: MessageContext) => {
  try {
    await participant(context);
    const rows = await supabaseRest<MessageRow[]>(context.env, `match_messages?match_id=eq.${encodeURIComponent(context.params.id)}&order=created_at.asc&limit=100`);
    return Response.json(rows.map((row) => ({ id: row.id, authorUid: row.author_profile_id, author: row.author_name, text: row.message, createdAt: row.created_at })));
  } catch (error) {
    const message = error instanceof Error ? error.message : "MESSAGES_FAILED";
    return apiError(message.startsWith("AUTH_") ? "AUTH_REQUIRED" : "MATCH_PARTICIPANT_REQUIRED", message.startsWith("AUTH_") ? 401 : 403);
  }
};

export const onRequestPost = async (context: MessageContext) => {
  try {
    assertSameOrigin(context.request, context.env.SITE_URL);
    const profile = await participant(context);
    const body = await context.request.json() as { text?: string };
    const message = String(body.text || "").trim().slice(0, 500);
    if (!message) return apiError("Mensagem vazia.");
    const rows = await supabaseRest<MessageRow[]>(context.env, "match_messages", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ match_id: context.params.id, author_profile_id: profile.id, author_name: profile.full_name || "Jogador", message }) });
    const row = rows[0];
    return Response.json({ id: row.id, authorUid: row.author_profile_id, author: row.author_name, text: row.message, createdAt: row.created_at }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "MESSAGE_CREATE_FAILED";
    return apiError(message.startsWith("AUTH_") ? "AUTH_REQUIRED" : "Não foi possível enviar a mensagem.", message.startsWith("AUTH_") ? 401 : 403);
  }
};

export const onRequest = () => apiError("Método não permitido.", 405);
