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

export const onRequest = async (context: { next: () => Promise<Response> }) => {
  const response = await context.next();
  for (const [name, value] of Object.entries(securityHeaders)) response.headers.set(name, value);
  return response;
};
