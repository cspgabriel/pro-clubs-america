import { supabaseRest } from "../../_lib/supabase";
import type { EmailEnv } from "../../_lib/email";

interface Context { request: Request; env: EmailEnv }

const page = (title: string, message: string) =>
  new Response(
    `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${title}</title></head>` +
    `<body style="margin:0;background:#061329;color:#f5f8ff;font-family:Inter,Arial,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;text-align:center">` +
    `<div style="max-width:420px;padding:32px"><h1 style="font-size:22px;margin:0 0 12px">${title}</h1>` +
    `<p style="color:#9fb0c9;font-size:14px;line-height:1.6;margin:0 0 22px">${message}</p>` +
    `<a href="/" style="color:#ffc83d;font-size:13px">Voltar ao Pro Clubs America</a></div></body></html>`,
    { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } },
  );

/** Opt-out de um clique. Nao exige login: o token do link ja identifica o destinatario. */
export const onRequestGet = async (context: Context) => {
  const token = new URL(context.request.url).searchParams.get("token") || "";
  if (!/^[0-9a-f-]{36}$/i.test(token)) return page("Link invalido", "Este link de cancelamento nao e valido ou ja expirou.");
  try {
    const now = new Date().toISOString();
    const rows = await supabaseRest<Array<{ profile_id: string }>>(context.env, `email_consent?unsubscribe_token=eq.${encodeURIComponent(token)}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ marketing: false, unsubscribed_at: now, updated_at: now }),
    });
    if (!rows.length) return page("Link invalido", "Nao encontramos este cadastro. Talvez o cancelamento ja tenha sido feito.");
    return page("Pronto, cancelado", "Voce nao recebera mais avisos de novidades. E-mails essenciais da conta continuam ativos.");
  } catch {
    return page("Nao foi possivel cancelar", "Tente novamente em alguns minutos.");
  }
};

/** RFC 8058: clientes de e-mail fazem POST no List-Unsubscribe. */
export const onRequestPost = onRequestGet;
