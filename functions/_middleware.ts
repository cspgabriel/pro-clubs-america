const securityHeaders = {
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
  "strict-transport-security": "max-age=31536000",
  "x-frame-options": "DENY",
  "permissions-policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  "cross-origin-opener-policy": "same-origin-allow-popups",
  "cross-origin-resource-policy": "same-site",
  "content-security-policy": "base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'",
};

function secure(response: Response) {
  for (const [name, value] of Object.entries(securityHeaders)) response.headers.set(name, value);
  return response;
}

export const onRequest = async (context: { request: Request; env: { SITE_URL?: string }; next: () => Promise<Response> }) => {
  if (["POST", "PUT", "PATCH", "DELETE"].includes(context.request.method)) {
    const origin = context.request.headers.get("origin");
    const allowed = new Set([new URL(context.request.url).origin]);
    if (context.env.SITE_URL) allowed.add(new URL(context.env.SITE_URL).origin);
    if (origin && !allowed.has(origin)) return secure(Response.json({ error: "ORIGIN_NOT_ALLOWED" }, { status: 403 }));
  }
  return secure(await context.next());
};
