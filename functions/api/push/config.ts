import { apiError, type FunctionContext } from "../../_lib/billing";
import { pushConfigured } from "../../_lib/push";

export const onRequestGet = async ({ env }: FunctionContext) => pushConfigured(env)
  ? Response.json({ publicKey: env.VAPID_PUBLIC_KEY }, { headers: { "cache-control": "public, max-age=3600" } })
  : apiError("PUSH_NOT_CONFIGURED", 503);
