import { PlayerRouteResolver } from "@/components/profile-resolvers";
import { Suspense } from "react";
export default function Page() { return <Suspense fallback={<p>Carregando jogador…</p>}><PlayerRouteResolver /></Suspense>; }
