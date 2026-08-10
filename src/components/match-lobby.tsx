"use client";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { Bot, LockKeyhole, MessageCircle, Send, Sparkles } from "lucide-react";
import { observeAuth, type AuthUserSnapshot } from "@/lib/auth-client";
import { getCommunityProfile, sendLobbyMessage, watchLobbyMessages, type CommunityProfile, type LobbyMessageRecord } from "@/lib/community-service";
import type { FriendlyRequest } from "@/lib/friendlies";
export function MatchLobby({ match }: { match: FriendlyRequest }) {
  const [messages, setMessages] = useState<LobbyMessageRecord[]>([]); const [text, setText] = useState(""); const [user, setUser] = useState<AuthUserSnapshot | null>(null); const [profile, setProfile] = useState<CommunityProfile | null>(null); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const participant = Boolean(profile?.clubId && [match.hostClubId, match.opponentClubId].includes(profile.clubId));
  useEffect(() => observeAuth(async (value) => { setUser(value); setProfile(value ? await getCommunityProfile().catch(() => null) : null); }), []);
  useEffect(() => { if (!user || !participant) return; return watchLobbyMessages(match.id, setMessages, () => setError("O lobby está disponível apenas para os dois clubes do confronto.")); }, [match.id, participant, user]);
  async function submit(event: FormEvent) { event.preventDefault(); if (!participant || !text.trim()) return; setBusy(true); setError(""); try { await sendLobbyMessage(match.id, text); setText(""); } catch { setError("Não foi possível enviar a mensagem."); } finally { setBusy(false); } }
  const visibleMessages = participant ? messages : [];
  return <section className="match-community-tools lobby-only"><article className="match-lobby"><header><MessageCircle /><div><small>LOBBY DO JOGO</small><h2>Combinar sala</h2></div><span>{visibleMessages.length} mensagens</span></header><div className="lobby-messages">{visibleMessages.length ? visibleMessages.map((message) => <p key={message.id}><strong>{message.author}</strong>{message.text}<small>{new Date(message.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</small></p>) : <div><MessageCircle /> {participant ? "Nenhuma mensagem. Combine servidor e nome da sala." : "Lobby privado para os clubes participantes."}</div>}</div>{participant ? <form onSubmit={submit}><input value={text} onChange={(event) => setText(event.target.value)} placeholder="Escreva para o adversário" aria-label="Mensagem do lobby" /><button disabled={busy} aria-label="Enviar mensagem"><Send /></button></form> : user ? <p className="challenge-notice"><LockKeyhole /> Sua conta não representa um dos clubes desta partida.</p> : <Link href="/entrar"><LockKeyhole /> Entre para acessar o lobby</Link>}{error && <p className="challenge-notice">{error}</p>}<footer><Bot /> Mensagens sincronizadas e protegidas por clube.</footer></article><Link className="vip-match-banner" href="/planos"><Sparkles /><span>DESTAQUE PRO/VIP<strong>Fixar desafio, histórico completo e estatísticas avançadas</strong></span></Link></section>;
}
