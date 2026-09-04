import type { BillingEnv } from "./billing";
import { supabaseRest } from "./supabase";

export type EmailFlow = "welcome_d0" | "welcome_d2" | "welcome_d5" | "reactivation" | "match_notification" | "club_invitation";
/** Fluxos que o usuario pode desligar sem quebrar a conta. */
const MARKETING_FLOWS = new Set<EmailFlow>(["welcome_d2", "welcome_d5", "reactivation"]);

export interface EmailEnv extends BillingEnv {
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
  /** Trava mestra. Nada e enviado enquanto isto nao for exatamente "true". */
  EMAIL_ENABLED?: string;
}

interface ConsentRow { profile_id: string; email: string; transactional: boolean; marketing: boolean; unsubscribe_token: string; unsubscribed_at: string | null }

/**
 * Exige a trava explicita EMAIL_ENABLED="true" alem das credenciais.
 * Ter chave configurada NAO basta: o envio so liga por decisao deliberada.
 */
export function emailConfigured(env: EmailEnv) {
  return env.EMAIL_ENABLED === "true" && Boolean(env.RESEND_API_KEY && env.EMAIL_FROM);
}

export async function ensureConsent(env: EmailEnv, profileId: string, email: string): Promise<ConsentRow> {
  const rows = await supabaseRest<ConsentRow[]>(env, "email_consent?on_conflict=profile_id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({ profile_id: profileId, email, updated_at: new Date().toISOString() }),
  });
  return rows[0];
}

function shell(env: EmailEnv, title: string, body: string, unsubscribeUrl?: string) {
  const site = env.SITE_URL || "https://proclubsamerica.com";
  const footerLink = unsubscribeUrl
    ? `<br><a href="${unsubscribeUrl}" style="color:#7f94b4">Cancelar estes avisos</a>`
    : "";
  return [
    '<!doctype html><html lang="pt-BR"><body style="margin:0;background:#061329;font-family:Inter,Arial,sans-serif;color:#f5f8ff">',
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">',
    '<table role="presentation" width="100%" style="max-width:560px;background:#0d2d59;border:1px solid #254a78">',
    '<tr><td style="padding:22px 26px;border-bottom:1px solid #254a78">',
    `<a href="${site}" style="display:inline-flex;vertical-align:middle;color:#ffc83d;font-size:13px;font-weight:700;letter-spacing:.14em;text-decoration:none"><img src="${site}/brand/pro-clubs-america-192.png" width="42" height="42" alt="Pro Clubs America" style="display:inline-block;vertical-align:middle;margin-right:11px;border:0">PRO CLUBS AMERICA</a></td></tr>`,
    '<tr><td style="padding:28px 26px">',
    `<h1 style="margin:0 0 14px;font-size:22px;line-height:1.3;color:#fff">${title}</h1>`,
    body,
    "</td></tr>",
    '<tr><td style="padding:18px 26px;border-top:1px solid #254a78;color:#7f94b4;font-size:11px;line-height:1.6">',
    "Voce recebe este e-mail porque tem conta no Pro Clubs America.",
    footerLink,
    "</td></tr></table></td></tr></table></body></html>",
  ].join("");
}

const button = (url: string, label: string) =>
  `<p style="margin:22px 0 0"><a href="${url}" style="display:inline-block;padding:13px 24px;background:#ffc83d;color:#04120a;font-weight:700;font-size:13px;text-decoration:none">${label}</a></p>`;

const paragraph = (text: string) => `<p style="margin:0 0 12px;font-size:14px;line-height:1.65;color:#c9d8ee">${text}</p>`;

const strong = (text: string) => `<strong style="color:#fff">${text}</strong>`;

const escapeHtml = (text: string) => text.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] || character);

export function renderEmail(env: EmailEnv, flow: EmailFlow, input: { name: string; unsubscribeUrl: string; data?: Record<string, string> }) {
  const site = env.SITE_URL || "https://proclubsamerica.com";
  const first = input.name.split(" ")[0] || "jogador";
  switch (flow) {
    case "welcome_d0":
      return {
        subject: "Bem-vindo ao Pro Clubs America. Seu próximo time está aqui.",
        html: shell(env, `Seu vestiário está aberto, ${first}.`, [
          paragraph("Agora você faz parte da comunidade independente de Pro Clubs da América do Sul."),
          '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;background:#082248;border:1px solid #254a78"><tr><td style="padding:16px 14px;width:33.33%;border-right:1px solid #254a78"><span style="display:block;color:#ffc83d;font-size:10px;font-weight:700;letter-spacing:.1em">01 · PERFIL</span><span style="display:block;margin-top:5px;color:#d9e6f8;font-size:12px;line-height:1.45">Mostre seu boneco e os seus melhores lances.</span></td><td style="padding:16px 14px;width:33.33%;border-right:1px solid #254a78"><span style="display:block;color:#ffc83d;font-size:10px;font-weight:700;letter-spacing:.1em">02 · MERCADO</span><span style="display:block;margin-top:5px;color:#d9e6f8;font-size:12px;line-height:1.45">Encontre vaga ou divulgue seu time.</span></td><td style="padding:16px 14px;width:33.33%"><span style="display:block;color:#ffc83d;font-size:10px;font-weight:700;letter-spacing:.1em">03 · AMISTOSOS</span><span style="display:block;margin-top:5px;color:#d9e6f8;font-size:12px;line-height:1.45">Escolha um rival e entre em campo.</span></td></tr></table>',
          paragraph(`${strong("Comece vinculando seu perfil do EA SPORTS FC Clubs.")} Assim suas estatísticas, posições e partidas ganham contexto dentro da comunidade.`),
          button(`${site}/conta/`, "Montar meu perfil"),
        ].join("")),
      };
    case "welcome_d2":
      return {
        subject: `${first}, seu perfil ainda esta sem estatisticas`,
        html: shell(env, "Falta vincular seu perfil EA", [
          paragraph("Sem o vinculo com a EA, seu perfil fica vazio e voce nao aparece nos rankings."),
          paragraph("Leva menos de um minuto: basta colar o link do seu clube na EA."),
          button(`${site}/conta/`, "Vincular agora"),
        ].join(""), input.unsubscribeUrl),
      };
    case "welcome_d5":
      return {
        subject: `${first}, encontre um clube para jogar`,
        html: shell(env, "Times procurando jogadores", [
          paragraph(input.data?.clubs || "Ha clubes ativos procurando reforcos na sua regiao."),
          paragraph("Voce pode entrar em um clube existente ou cadastrar o seu."),
          button(`${site}/mercado/`, "Ver o mercado"),
        ].join(""), input.unsubscribeUrl),
      };
    case "reactivation":
      return {
        subject: input.data?.subject || "O que rolou no seu clube esta semana",
        html: shell(env, "Resumo do seu clube", [
          paragraph(input.data?.summary || "Novas partidas foram registradas desde a sua ultima visita."),
          button(`${site}/inicio/`, "Ver meu clube"),
        ].join(""), input.unsubscribeUrl),
      };
    case "match_notification":
      return {
        subject: input.data?.subject || "Nova partida registrada",
        html: shell(env, input.data?.title || "Nova partida", [
          paragraph(input.data?.summary || "Uma partida do seu clube foi importada da EA."),
          button(input.data?.url || `${site}/partidas/`, "Ver detalhes"),
        ].join(""), input.unsubscribeUrl),
      };
    case "club_invitation": {
      const clubNameText = input.data?.clubName || "Um clube";
      const clubName = escapeHtml(clubNameText);
      const inviterName = escapeHtml(input.data?.inviterName || "Um capitão");
      const url = input.data?.url || `${site}/conta/`;
      return {
        subject: `${clubNameText} convidou você para o elenco`,
        html: shell(env, "Um clube te chamou", [
          paragraph(`${strong(inviterName)} convidou você para jogar no ${strong(clubName)}.`),
          paragraph("Abra o convite para conferir o clube e aceitar ou recusar. Nada muda no seu perfil até você confirmar."),
          button(url, "Ver convite"),
        ].join(""), input.unsubscribeUrl),
      };
    }
  }
}

/** Envia respeitando consentimento e dedupe. Nunca lanca: registra e devolve o status. */
export async function sendFlowEmail(env: EmailEnv, input: { profileId: string; email: string; name: string; flow: EmailFlow; dedupeKey: string; data?: Record<string, string> }) {
  if (!emailConfigured(env)) return { status: "skipped" as const, reason: "EMAIL_NOT_CONFIGURED" };

  const existing = await supabaseRest<Array<{ id: string }>>(env, `email_events?dedupe_key=eq.${encodeURIComponent(input.dedupeKey)}&select=id&limit=1`);
  if (existing.length) return { status: "skipped" as const, reason: "ALREADY_SENT" };

  const consent = await ensureConsent(env, input.profileId, input.email);
  const isMarketing = MARKETING_FLOWS.has(input.flow);
  if (consent.unsubscribed_at || (isMarketing && !consent.marketing) || (!isMarketing && !consent.transactional)) {
    await supabaseRest(env, "email_events", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ profile_id: input.profileId, email: input.email, flow: input.flow, dedupe_key: input.dedupeKey, status: "skipped", error: "NO_CONSENT" }) });
    return { status: "skipped" as const, reason: "NO_CONSENT" };
  }

  const site = env.SITE_URL || "https://proclubsamerica.com";
  const unsubscribeUrl = `${site}/api/email/unsubscribe?token=${consent.unsubscribe_token}`;
  const message = renderEmail(env, input.flow, { name: input.name, unsubscribeUrl, data: input.data });

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to: [input.email],
        subject: message.subject,
        html: message.html,
        headers: { "List-Unsubscribe": `<${unsubscribeUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
      }),
    });
    const payload = (await response.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!response.ok) throw new Error(payload.message || `RESEND_${response.status}`);
    await supabaseRest(env, "email_events", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ profile_id: input.profileId, email: input.email, flow: input.flow, dedupe_key: input.dedupeKey, provider_id: payload.id, status: "sent" }) });
    return { status: "sent" as const, id: payload.id };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "SEND_FAILED";
    await supabaseRest(env, "email_events", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ profile_id: input.profileId, email: input.email, flow: input.flow, dedupe_key: input.dedupeKey, status: "failed", error: reason.slice(0, 400) }) });
    return { status: "failed" as const, reason };
  }
}
