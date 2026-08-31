"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useDismissible } from "@/lib/use-dismissible";
import { Link2, X } from "lucide-react";
import { observeAuth } from "@/lib/auth-client";
import { getCommunityProfile } from "@/lib/community-service";

const HIDDEN_ON = ["/", "/entrar", "/cadastro", "/criar-conta", "/onboarding", "/recuperar-senha"];
const DISMISS_KEY = "pca:profile-nudge-dismissed";

/**
 * Barra persistente enquanto o perfil EA nao esta vinculado — a acao que
 * destrava rankings, estatisticas e amistosos. Some sozinha apos o vinculo.
 */
export function ProfileNudge() {
  const pathname = usePathname();
  const [pending, setPending] = useState<"unknown" | "no-ea" | "no-club" | "ok">("unknown");
  const [dismissed, dismiss] = useDismissible(DISMISS_KEY, "session");

  useEffect(() => observeAuth((user) => {
    if (!user) { setPending("ok"); return; }
    getCommunityProfile()
      .then((profile) => {
        if (!profile) { setPending("ok"); return; }
        setPending(!profile.playerId ? "no-ea" : !profile.clubId ? "no-club" : "ok");
      })
      .catch(() => setPending("ok"));
  }), []);

  const hidden = HIDDEN_ON.includes(pathname) || pathname.startsWith("/admin");
  if (hidden || dismissed || pending === "unknown" || pending === "ok") return null;

  const copy = pending === "no-ea"
    ? { text: "Seu perfil ainda está vazio.", action: "Vincular perfil EA", href: "/onboarding" }
    : { text: "Você ainda não faz parte de um clube.", action: "Encontrar um time", href: "/mercado" };

  return (
    <div className="profile-nudge" role="status">
      <Link2 />
      <p>{copy.text}</p>
      <Link href={copy.href}>{copy.action}</Link>
      <button type="button" onClick={dismiss} aria-label="Dispensar"><X /></button>
    </div>
  );
}
