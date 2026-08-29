import type { MetadataRoute } from "next";
import { SITE_URL, canonical } from "@/lib/seo";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin/", "/conta/", "/perfil/", "/onboarding/", "/api/"] }],
    sitemap: canonical("/sitemap.xml").replace(/\/$/, ""),
    host: SITE_URL,
  };
}
