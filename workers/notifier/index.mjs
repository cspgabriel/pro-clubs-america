/**
 * Dispara os fluxos de e-mail agendados. O endpoint e idempotente
 * (dedupe por chave), entao reexecucao no mesmo dia nao duplica envio.
 */
async function dispatch(env) {
  if (!env.EA_INGEST_SECRET) throw new Error("EA_INGEST_SECRET_REQUIRED");
  const response = await fetch(new URL("/api/internal/email-dispatch", env.PCA_SITE_URL), {
    method: "POST",
    headers: { authorization: `Bearer ${env.EA_INGEST_SECRET}`, "content-type": "application/json" },
    body: "{}",
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`DISPATCH_${response.status}:${payload.error || "unknown"}`);
  return payload;
}

const notifier = {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(dispatch(env).catch((error) => console.error(JSON.stringify({ event: "email_dispatch_failed", reason: error.message }))));
  },
  async fetch(request, env) {
    const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
    if (!env.EA_INGEST_SECRET || supplied !== env.EA_INGEST_SECRET) return Response.json({ error: "AUTH_REQUIRED" }, { status: 401 });
    try {
      return Response.json(await dispatch(env));
    } catch (error) {
      return Response.json({ error: error instanceof Error ? error.message : "DISPATCH_FAILED" }, { status: 500 });
    }
  },
};

export default notifier;
