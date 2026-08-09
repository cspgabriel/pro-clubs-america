# 🛡️ Estrutura Mestre do Discord — Pro Clubs América (Gestão Continental & Hubs por País)

**Servidor Oficial:** `Pro Clubs América`  
**Plataforma Web:** [proclubsamerica.com](https://proclubsamerica.com)  
**Integração:** EA Sports FC 26 — Modo 11v11 Competitivo  

---

## 1. 👥 Hierarquia de Cargos (Roles & Permissões)

### 🥇 Alta Gestão (Continental)
- `👑 Direção Pro Clubs América` — Administradores Globais do Servidor.
- `🏆 Staff Libertadores / Torneios` — Moderadores e Organizadores dos Campeonatos Continentais.
- `🤖 Bot / Automação EA` — Bots de integração com EA API, Placar, Ligas e Notificações.

### 🌎 Gestores & Embaixadores por País
- `🇧🇷 Capataz / Mod Brasil` — Moderador da comunidade Brasileira.
- `🇦🇷 Mod Argentina` — Moderador da comunidade Argentina.
- `🇨🇴 Mod Colômbia` — Moderador da comunidade Colombiana.
- `🇨🇱 Mod Chile` — Moderador da comunidade Chilena.
- `🇺🇾 Mod Uruguai` — Moderador da comunidade Uruguaia.
- `🇵🇪 Mod Peru` — Moderador da comunidade Peruana.

### ⚽ Competitivo & Elencos
- `👑 Capitão de Equipe (DT)` — Donos/Capitães de times cadastrados no site `proclubsamerica.com`.
- `⚽ Pro Player 11v11` — Jogadores com time vinculado e perfil verificado.
- `🔍 Jogador Livre (Free Agent)` — Jogadores em busca de contrato / clube.
- `📺 Streamer / Caster` — Narradores e transmissores de jogos oficiais.

---

## 2. 📁 Árvore de Canais e Categorias do Discord

```text
PRO CLUBS AMÉRICA
├── 📢 BEM-VINDO & INFORMAÇÕES
│   ├── 📜│regras-e-diretrizes
│   ├── 📢│anuncios-oficiais
│   ├── 🔗│site-e-cadastro-ea (Link obrigatório do time EA)
│   ├── 🎫│suporte-e-tickets
│   └── 🌐│escolha-seu-pais (Reaction Roles por bandeira)
│
├── 🏆 COMPETIÇÃO CONTINENTAL (AMÉRICA DO SUL)
│   ├── 🏆│copa-libertadores-11v11
│   ├── 🥇│copa-sul-americana
│   ├── 📅│calendario-de-jogos
│   ├── ⚔️│marcar-amistoso-aberto (Integrado com proclubsamerica.com)
│   └── 📊│ranking-de-times-ea
│
├── 🇧🇷 COMUNIDADE BRASIL
│   ├── 💬│chat-brasil
│   ├── ⚽│liga-nacional-br
│   ├── 🔄│mercado-vagas-br (Procura-se Jogador / Time)
│   ├── ⚔️│amistosos-br
│   └── 🔊│Voz Brasil #1 / #2
│
├── 🇦🇷 COMUNIDAD ARGENTINA
│   ├── 💬│chat-argentina
│   ├── ⚽│liga-nacional-arg
│   ├── 🔄│mercado-fichajes-arg
│   ├── ⚔️│amistosos-arg
│   └── 🔊│Voz Argentina #1 / #2
│
├── 🇨🇴 COMUNIDAD COLOMBIA
│   ├── 💬│chat-colombia
│   ├── ⚽│liga-nacional-col
│   ├── 🔄│mercado-fichajes-col
│   ├── ⚔️│amistosos-col
│   └── 🔊│Voz Colombia #1
│
├── 🇨🇱 COMUNIDAD CHILE
│   ├── 💬│chat-chile
│   ├── ⚽│liga-nacional-chi
│   ├── 🔄│mercado-fichajes-chi
│   ├── ⚔️│amistosos-chi
│   └── 🔊│Voz Chile #1
│
├── 🇺🇾 COMUNIDAD URUGUAY
│   ├── 💬│chat-uruguay
│   ├── ⚽│liga-nacional-uru
│   ├── 🔄│mercado-fichajes-uru
│   └── ⚔️│amistosos-uru
│
├── 🇵🇪 COMUNIDAD PERÚ & OUTROS PAÍSES
│   ├── 💬│chat-peru-e-sulamerica
│   ├── 🔄│mercado-fichajes-sulamerica
│   └── ⚔️│amistosos-sulamerica
│
├── 📺 TRANSMISSÕES & CONTEÚDO
│   ├── 🔴│lives-e-coberturas
│   ├── 🎬│melhores-momentos-gols
│   └── 🏆│top-artilheiros-e-stats
│
└── 🛠️ GESTÃO INTERNA (STAFF ONLY)
    ├── 🔒│painel-administracao
    ├── 🔒│log-de-amistosos-ea
    └── 🔒│integracao-web-bot
```

---

## 3. 🤖 Fluxo de Automação & Bot Discord <-> Web

1. **Cadastro Obrigatório de Time:**
   - O capitão informa a URL do seu time na EA (`proclubs.ea.com/api/fc/clubs/info?clubIds=XXXX`) no canal `#site-e-cadastro-ea`.
   - O bot valida a URL da EA, associa ao usuário e atribui o cargo `@Capitão de Equipe (DT)`.
2. **Marcador de Amistoso Inteligente:**
   - Um time posta no canal `#marcar-amistoso-aberto`: `!desafio @TimeInimigo 22:00`.
   - O bot cria a partida na plataforma `proclubsamerica.com/partida/[id]` com status *"Aguardando publicação oficial da EA"*.
   - Assim que o jogo acaba no console/PC, a EA API confirma e o bot envia o card com o placar final no Discord.
3. **Mural de Artilharia Automático:**
   - Todo domingo o bot puxa a API e lista os 5 maiores artilheiros e garçons da América do Sul no canal `#top-artilheiros-e-stats`.
