import { apiError, assertSameOrigin, verifyFirebaseRequest, type FunctionContext } from "../../../_lib/billing";
import { ensureProfile } from "../../../_lib/supabase";

const MIME_EXTENSIONS: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export const onRequestPost = async (context: FunctionContext) => {
  try {
    assertSameOrigin(context.request, context.env.SITE_URL);
    const identity = await verifyFirebaseRequest(context.request, context.env);
    const profile = await ensureProfile(context.env, identity, identity.name);
    const form = await context.request.formData();
    const file = form.get("photo");
    if (!(file instanceof File) || !MIME_EXTENSIONS[file.type]) return apiError("Envie uma imagem JPG, PNG ou WebP.", 400);
    if (file.size > 4 * 1024 * 1024) return apiError("A imagem deve ter no máximo 4 MB.", 400);
    const objectPath = `${profile.id}/${crypto.randomUUID()}.${MIME_EXTENSIONS[file.type]}`;
    const baseUrl = context.env.SUPABASE_URL.replace(/\/$/, "");
    const response = await fetch(`${baseUrl}/storage/v1/object/profile-showcase/${objectPath}`, {
      method: "POST",
      headers: { apikey: context.env.SUPABASE_SERVICE_ROLE_KEY, authorization: `Bearer ${context.env.SUPABASE_SERVICE_ROLE_KEY}`, "content-type": file.type, "x-upsert": "false" },
      body: file.stream(),
    });
    if (!response.ok) throw new Error(`SUPABASE_STORAGE_${response.status}`);
    return Response.json({ url: `${baseUrl}/storage/v1/object/public/profile-showcase/${objectPath}` });
  } catch (error) {
    const message = error instanceof Error ? error.message : "SHOWCASE_UPLOAD_FAILED";
    return apiError(message.startsWith("AUTH_") ? "AUTH_REQUIRED" : "Não foi possível enviar a imagem.", message.startsWith("AUTH_") ? 401 : 500);
  }
};

export const onRequest = () => apiError("Método não permitido.", 405);
