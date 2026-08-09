export type EntitlementId = "player_pro" | "club_pro" | "club_premium";

export interface ProductPlan {
  id: "free" | EntitlementId;
  name: string;
  audience: string;
  monthlyLabel: string;
  annualLabel?: string;
  entitlement?: EntitlementId;
  featured?: boolean;
  features: string[];
}

export const planCatalog: ProductPlan[] = [
  { id: "free", name: "Gratuito", audience: "Para começar e ser encontrado", monthlyLabel: "R$ 0", features: ["Perfil de jogador e clube", "Busca e rankings básicos", "Desafios abertos"] },
  { id: "player_pro", name: "Pro Jogador", audience: "Para ganhar visibilidade", monthlyLabel: "R$ 19,90/mês", annualLabel: "ou R$ 179/ano", entitlement: "player_pro", featured: true, features: ["Estatísticas avançadas", "Destaque no mercado", "Ranking detalhado"] },
  { id: "club_pro", name: "Clube Pro", audience: "Para organizar e competir", monthlyLabel: "R$ 49,90/mês", entitlement: "club_pro", features: ["Gestão e recrutamento", "Amistosos destacados", "Analytics do clube"] },
];

export const checkoutEnabled = false;
