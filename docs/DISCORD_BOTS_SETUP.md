# 🤖 BOTSFREE & AUTOMAÇÃO PARA O DISCORD — PRO CLUBS AMÉRICA

**Plataforma Oficial:** [proclubsamerica.com](https://proclubsamerica.com)  
**Repositório:** `cspgabriel/pro-clubs-america`

---

## 1. 🛠️ BOTS GRATUITOS RECOMENDADOS (SEM CUSTO NENHUM)

### 1️⃣ Carl-bot (Reaction Roles & Seleção de País)
- **Custo:** 100% Gratuito.
- **Função Principal:** Atribuição de Cargos por País (`#escolha-seu-pais`).
- **Como Funciona:** O usuário clica na reação da bandeira (🇧🇷 🇦🇷 🇨🇴 🇨🇱 🇺🇾 🇵🇪) e o Carl-bot concede automaticamente o cargo do país correspondente, liberando o acesso imediato à categoria e aos chats daquele país.
- **Comando Exemplo:** `?rr make` (Interface interativa no Discord para criar o menu de bandeiras).

---

### 2️⃣ Ticket Tool (Suporte & Atendimento Privado)
- **Custo:** 100% Gratuito & Ilimitado.
- **Função Principal:** Suporte técnico, validação de times e denúncias (`#suporte-e-tickets`).
- **Como Funciona:** Exibe um botão `📩 Abrir Ticket`. Ao clicar, cria um canal privado acessível apenas pelo usuário e pela equipe de suporte (`@Direção Continental` e `@Mod`).

---

### 3️⃣ Apollo Bot (Calendário de Jogos & Confirmação de Presença)
- **Custo:** 100% Gratuito no plano base.
- **Função Principal:** Agendamento de Partidas e Torneios (`#calendario-de-jogos` e `#copa-libertadores-11v11`).
- **Como Funciona:** Cria cards de eventos com botões de presença (`✅ Confirmado`, `❓ Dúvida`, `❌ Ausente`), ideal para capitães confirmarem os 11 titulares para as partidas da noite.

---

### 4️⃣ Dyno Bot ou MEE6 (Boas-Vindas & Moderação Anti-Spam)
- **Custo:** Plano Gratuito Completo.
- **Função Principal:** Mensagem automática de entrada (`#boas-vindas`) e proteção contra spam, links maliciosos e palavrões.
- **Como Funciona:** Envia o card visual de boas-vindas com instruções assim que o pro-player entra no servidor.

---

## 2. ⚡ NOSSO BOT CUSTOMIZADO PRO CLUBS (WEBHOOKS + EA API)

Além dos bots públicos, podemos rodar o nosso próprio bot leve via **Discord Webhooks + GitHub Actions / Render / Python script 100% grátis**.

### 🌟 O que o Nosso Bot Customizado Automatiza:

1. **Notificação Automática de Rankings EA (`#top-artilheiros` & `#ranking-clubes`):**
   - Roda uma rotina semanal (cronjob grátis) que consulta a API da EA FC (`https://proclubs.ea.com/api/fc/members/career/stats...`), gera o ranking formatado e posta o card visual no Discord.
2. **Registro de Time no Site (`#vincular-time-ea`):**
   - Valida se a URL postada pelo capitão é um `clubId` válido da EA Sports FC e confirma a inclusão nos rankings do `proclubsamerica.com`.
3. **Mural de Amistosos em Tempo Real (`#desafios-amistosos`):**
   - Quando um desafio é aceito na plataforma web, um webhook posta o card do confronto no Discord com link direto para acompanhar o placar ao vivo.
