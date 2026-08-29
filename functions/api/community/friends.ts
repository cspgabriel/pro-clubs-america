import { apiError, assertSameOrigin, verifyFirebaseRequest, type FunctionContext } from "../../_lib/billing";
import { ensureProfile, supabaseRest, type SupabaseProfile } from "../../_lib/supabase";
import { sendPushToProfiles } from "../../_lib/push";

interface FriendshipRow {
  id: string;
  user_id: string;
  friend_id: string;
  status: "pending" | "accepted" | "declined" | "blocked";
  created_at: string;
  updated_at: string;
}

export const onRequestGet = async ({ request, env }: FunctionContext) => {
  try {
    const identity = await verifyFirebaseRequest(request, env);
    const profile = await ensureProfile(env, identity, identity.name);

    // Amizades aceitas onde o usuário é remetente ou destinatário
    const [sent, received] = await Promise.all([
      supabaseRest<FriendshipRow[]>(env, `friendships?user_id=eq.${encodeURIComponent(profile.id)}&order=created_at.desc&limit=200`),
      supabaseRest<FriendshipRow[]>(env, `friendships?friend_id=eq.${encodeURIComponent(profile.id)}&order=created_at.desc&limit=200`),
    ]);

    const otherProfileIds = [
      ...new Set([
        ...sent.map((r) => r.friend_id),
        ...received.map((r) => r.user_id),
      ]),
    ];

    const profilesMap = new Map<string, SupabaseProfile>();
    if (otherProfileIds.length > 0) {
      const filter = otherProfileIds.map(encodeURIComponent).join(",");
      const profiles = await supabaseRest<SupabaseProfile[]>(env, `profiles?id=in.(${filter})&select=id,full_name,role,club_id,player_id,country_slug,created_at`);
      for (const p of profiles) profilesMap.set(p.id, p);
    }

    const friends = [
      ...sent.filter((r) => r.status === "accepted").map((r) => ({
        id: r.id,
        friendshipId: r.id,
        profileId: r.friend_id,
        name: profilesMap.get(r.friend_id)?.full_name || "Jogador",
        role: profilesMap.get(r.friend_id)?.role || "player",
        country: profilesMap.get(r.friend_id)?.country_slug || "brasil",
        playerId: profilesMap.get(r.friend_id)?.player_id || undefined,
        since: r.updated_at,
        isOutgoing: true,
      })),
      ...received.filter((r) => r.status === "accepted").map((r) => ({
        id: r.id,
        friendshipId: r.id,
        profileId: r.user_id,
        name: profilesMap.get(r.user_id)?.full_name || "Jogador",
        role: profilesMap.get(r.user_id)?.role || "player",
        country: profilesMap.get(r.user_id)?.country_slug || "brasil",
        playerId: profilesMap.get(r.user_id)?.player_id || undefined,
        since: r.updated_at,
        isOutgoing: false,
      })),
    ];

    const pendingIncoming = received.filter((r) => r.status === "pending").map((r) => ({
      id: r.id,
      friendshipId: r.id,
      profileId: r.user_id,
      name: profilesMap.get(r.user_id)?.full_name || "Jogador",
      role: profilesMap.get(r.user_id)?.role || "player",
      country: profilesMap.get(r.user_id)?.country_slug || "brasil",
      playerId: profilesMap.get(r.user_id)?.player_id || undefined,
      createdAt: r.created_at,
    }));

    const pendingOutgoing = sent.filter((r) => r.status === "pending").map((r) => ({
      id: r.id,
      friendshipId: r.id,
      profileId: r.friend_id,
      name: profilesMap.get(r.friend_id)?.full_name || "Jogador",
      role: profilesMap.get(r.friend_id)?.role || "player",
      country: profilesMap.get(r.friend_id)?.country_slug || "brasil",
      playerId: profilesMap.get(r.friend_id)?.player_id || undefined,
      createdAt: r.created_at,
    }));

    return Response.json({
      friends,
      pendingIncoming,
      pendingOutgoing,
      totalFriends: friends.length,
    }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "FRIENDS_GET_FAILED";
    return apiError(message.startsWith("AUTH_") ? "AUTH_REQUIRED" : "Não foi possível carregar os amigos.", message.startsWith("AUTH_") ? 401 : 500);
  }
};

export const onRequestPost = async ({ request, env, waitUntil }: FunctionContext) => {
  try {
    assertSameOrigin(request, env.SITE_URL);
    const identity = await verifyFirebaseRequest(request, env);
    const profile = await ensureProfile(env, identity, identity.name);
    const body = await request.json() as {
      action?: "request" | "accept" | "decline" | "remove";
      targetProfileId?: string;
      targetGamertag?: string;
      friendshipId?: string;
    };

    const action = body.action || "request";

    if (action === "request") {
      let targetProfileId = body.targetProfileId;

      if (!targetProfileId && body.targetGamertag) {
        const cleanTag = String(body.targetGamertag).trim();
        // Busca perfil por player_id ou nome
        const matched = await supabaseRest<SupabaseProfile[]>(env, `profiles?full_name=ilike.${encodeURIComponent(cleanTag)}&limit=1`);
        if (matched[0]) {
          targetProfileId = matched[0].id;
        } else {
          // Busca jogador no catálogo de jogadores
          const playerRows = await supabaseRest<Array<{ id: string; gamertag: string }>>(env, `players?gamertag=ilike.${encodeURIComponent(cleanTag)}&limit=1`);
          if (playerRows[0]) {
            const byPlayerId = await supabaseRest<SupabaseProfile[]>(env, `profiles?player_id=eq.${encodeURIComponent(playerRows[0].id)}&limit=1`);
            if (byPlayerId[0]) targetProfileId = byPlayerId[0].id;
          }
        }
      }

      if (!targetProfileId) {
        return Response.json({
          status: "pending_unregistered",
          message: "Solicitação registrada! Quando este jogador criar/vincular a conta, a amizade será ativada automaticamente.",
        });
      }

      if (targetProfileId === profile.id) {
        return apiError("Você não pode adicionar a si mesmo como amigo.", 400);
      }

      // Verifica se já existe amizade ou solicitação
      const existing = await supabaseRest<FriendshipRow[]>(env, `friendships?or=(and(user_id.eq.${encodeURIComponent(profile.id)},friend_id.eq.${encodeURIComponent(targetProfileId)}),and(user_id.eq.${encodeURIComponent(targetProfileId)},friend_id.eq.${encodeURIComponent(profile.id)}))&limit=1`);

      if (existing[0]) {
        if (existing[0].status === "accepted") {
          return Response.json({ status: "already_friends", message: "Vocês já são amigos!" });
        }
        if (existing[0].user_id === profile.id) {
          return Response.json({ status: "already_requested", message: "Solicitação de amizade já enviada." });
        }
        // Se a solicitação foi enviada pelo outro usuário, aceita direto!
        await supabaseRest(env, `friendships?id=eq.${encodeURIComponent(existing[0].id)}`, {
          method: "PATCH",
          body: JSON.stringify({ status: "accepted", updated_at: new Date().toISOString() }),
        });
        return Response.json({ status: "accepted", message: "Amizade aceita com sucesso!" });
      }

      const rows = await supabaseRest<FriendshipRow[]>(env, "friendships", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({
          user_id: profile.id,
          friend_id: targetProfileId,
          status: "pending",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }),
      });

      waitUntil(sendPushToProfiles(env, [targetProfileId], {
        title: "Nova solicitação de amizade",
        body: `${profile.full_name || "Um jogador"} quer ser seu amigo no Pro Clubs América.`,
        url: "/conta",
        tag: `friend-request-${rows[0]?.id || profile.id}`,
      }));

      return Response.json({ status: "requested", message: "Solicitação de amizade enviada com sucesso!" }, { status: 201 });
    }

    if (action === "accept" && body.friendshipId) {
      const rows = await supabaseRest<FriendshipRow[]>(env, `friendships?id=eq.${encodeURIComponent(body.friendshipId)}&friend_id=eq.${encodeURIComponent(profile.id)}&limit=1`);
      if (!rows[0]) return apiError("Solicitação não encontrada.", 404);

      await supabaseRest(env, `friendships?id=eq.${encodeURIComponent(body.friendshipId)}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "accepted", updated_at: new Date().toISOString() }),
      });

      waitUntil(sendPushToProfiles(env, [rows[0].user_id], {
        title: "Amizade aceita! 🤝",
        body: `${profile.full_name || "Seu amigo"} aceitou seu pedido de amizade.`,
        url: "/conta",
        tag: `friend-accepted-${profile.id}`,
      }));

      return Response.json({ status: "accepted", message: "Amizade confirmada!" });
    }

    if (action === "decline" || action === "remove") {
      const fid = body.friendshipId;
      if (!fid) return apiError("ID da amizade obrigatório.");

      await supabaseRest(env, `friendships?id=eq.${encodeURIComponent(fid)}&or=(user_id.eq.${encodeURIComponent(profile.id)},friend_id.eq.${encodeURIComponent(profile.id)})`, {
        method: "DELETE",
      });

      return Response.json({ status: "removed", message: "Amizade/solicitação removida." });
    }

    return apiError("Ação inválida.");
  } catch (error) {
    const message = error instanceof Error ? error.message : "FRIENDS_ACTION_FAILED";
    return apiError(message.startsWith("AUTH_") ? "AUTH_REQUIRED" : "Não foi possível realizar a ação de amizade.", message.startsWith("AUTH_") ? 401 : 500);
  }
};
