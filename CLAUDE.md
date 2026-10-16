# Ranking Everything — CLAUDE.md

Ver [DOCUMENTO_DE_PRODUTO.md](DOCUMENTO_DE_PRODUTO.md) pro escopo/roadmap completo e [DEPLOY.md](DEPLOY.md) pro passo a passo de deploy. Este arquivo documenta a implementação atual (arquitetura, convenções, estado do código).

## Stack

- Next.js 16 (App Router, TypeScript, Tailwind), tudo client-side (`"use client"` em toda página — não há Server Components com dados, só CSR + Firestore realtime).
- Firebase: Auth (Google only) + Firestore. Sem Storage, sem Cloud Functions.
- Deploy: Vercel, auto-deploy no push pra `main` (https://ranking-everything.vercel.app).
- Design system em `src/components/ui/` (tema cinema/ouro-prata-bronze, ver seção abaixo).

## Estrutura de dados (Firestore)

- `users/{uid}` — perfil (displayName/email/photoURL do Google, `globalRole`).
- `users/{uid}/rooms/{roomId}` — **índice denormalizado** das salas do usuário (nome, categoria, escala, code, ownerId, role). É o que a tela "Minhas Salas" lê. Ver nota abaixo sobre por que isso existe em vez de uma `collectionGroup` query.
- `rooms/{roomId}` — dados da sala.
- `rooms/{roomId}/members/{uid}` — papel do membro na sala.
- `rooms/{roomId}/items/{itemId}` — itens da sala.
- `rooms/{roomId}/items/{itemId}/votes/{uid}` — voto de cada membro num item.
- `roomCodes/{code}` — mapeia código de convite (6 chars) → `roomId`, pra resolver o código sem precisar de `list`/`query` na coleção `rooms`.

## Por que `users/{uid}/rooms` em vez de `collectionGroup(members)`

A primeira implementação de "Minhas Salas" usava `collectionGroup(db, "members").where("uid","==",uid)`. Isso deu `permission-denied` persistente em produção mesmo com:
- regras corretas (confirmado no Simulador de Regras do Firebase Console);
- índice collection-group publicado (`firestore.indexes.json` → `fieldOverrides`);
- `exists()` em vez de `get().data` nas funções de regra (bug real que foi corrigido no caminho, mas não resolveu sozinho o problema de fundo).

A causa raiz não foi 100% isolada (parece ser uma divergência entre o simulador e a avaliação real de `list` em collection group), mas o fix foi trocar de abordagem: cada sala escreve uma cópia resumida de si mesma em `users/{uid}/rooms/{roomId}` (no `createRoom` e no `joinRoomByCode`). A leitura de "Minhas Salas" vira uma query trivial dentro do próprio documento do usuário, com regra `request.auth.uid == uid` — sem `get()`/`exists()` cruzado, sem collection group, sem índice especial.

**Se for mexer em "Minhas Salas" ou no fluxo de sala/membros:** lembre de manter `users/{uid}/rooms/{roomId}` sincronizado. Hoje é escrito/atualizado em `createRoom`, `joinRoomByCode`, `setMemberRole` (role) e limpo (delete, best-effort) em `removeMember`/`leaveRoom` — todas em `src/lib/rooms.ts`. Não há sync ainda pra edição do nome/categoria/escala da sala (essa feature nem existe).

Pela mesma razão, o ranking (`useAllItemVotes` em `src/lib/items.ts`) também evita `collectionGroup` nos votos: assina uma sub-coleção `votes` por item individualmente (um `onSnapshot` por item), em vez de uma query cruzando todas as sub-coleções `votes`.

## `subscribeWithRetry` (`src/lib/firebase.ts`)

Logo após login (ou reload que restaura sessão persistida), existe uma race entre a sessão do Firebase Auth ser restaurada e o token ficar de fato anexado ao canal do Firestore — a primeira tentativa de `onSnapshot` pode falhar com `permission-denied` mesmo com regras corretas, e o Firestore **não tenta de novo sozinho** depois de um erro. Todo `onSnapshot` do projeto passa por esse helper, que faz até 2 retries com 400ms de delay antes de propagar o erro de verdade. Use-o pra qualquer novo listener.

## Regras do Firestore (`firestore.rules`)

- `isMember`/`isMaster` usam `exists()`, nunca `get(...).data != null` — chamar `.data` num `get()` de documento inexistente lança erro na regra em vez de retornar falso, o que quebra até condições que deveriam ser curto-circuitadas por um `||` anterior.
- Entrar numa sala sempre cria o próprio doc de membro; só pode se auto-atribuir `role: "owner"` se for de fato o `ownerId` da sala (checado contra o doc da sala já commitado). Promoção a admin/rebaixamento só acontece via `update` feito pelo dono (e só pra `"admin"`/`"member"` — nunca `"owner"`, que fica travado na criação).
- `users/{uid}/rooms/{roomId}`: além do dono do próprio índice (`request.auth.uid == uid`), o dono da sala (ou master) também pode `update`/`delete` a entrada de OUTRO usuário — é o que permite sincronizar o badge de papel ou limpar o índice de quem foi removido.
- Deploy: `npx firebase-tools deploy --only firestore:rules` (e `firestore:indexes` se mexer em índices). O CLI já está autenticado nesta máquina (`npx firebase-tools login` foi rodado uma vez).

## Escala de nota e StarRating

`ratingScale` da sala é `"0-10"` (passo 0.5, 2 pontos por estrela) ou `"0-5-stars"` (passo 0.5, 1:1 com a estrela). O componente `StarRating` (`src/components/ui/StarRating.tsx`) é sempre um widget de 5 estrelas (clique ou arraste via Pointer Events, half-star); as páginas convertem entre "estrelas exibidas" (0–5) e "nota real" (`toStars`/`fromStars` em cada página que vota/mostra nota — duplicado em `[roomId]/page.tsx` e `items/[itemId]/page.tsx`, não extraído pra lib ainda). `onChange` do `StarRating` só dispara no release do gesto (drag não grava a cada pixel) — na tela de votação isso já vota automaticamente (`castVote` direto no `onChange`, sem botão "Votar" separado).

## Design system (`src/components/ui/`)

Tema cinema escuro com acento dourado (ouro/prata/bronze pro pódio), definido em `globals.css` (`--gold`, `--silver`, `--bronze`, `--background-elevated`, etc., expostos via `@theme inline` como `bg-gold`, `text-muted`, `border-border`...). Fonte `font-marquee` (Bebas Neue, `layout.tsx`) pra títulos estilo cartaz de cinema. Componentes: `Button` (variants primary/secondary/ghost/danger, aceita `href` pra virar `Link`), `Card`, `Input`/`Field`, `PageHeader` (`BackLink`, `PageTitle`), `EmptyState`, `Avatar` (anel colorido por `MemberRole`), `RoleBadge`, `RankBadge` (medalha 1º/2º/3º), `StarRating`. Reaproveite esses componentes em telas novas em vez de estilizar na mão.

## Estado atual (V1 do roadmap)

Implementado: login Google, criar/entrar em sala (código ou link), papéis dono/admin/membro com promover/rebaixar/remover (dono) e sair da sala (membro/admin), adicionar/editar/excluir item, votar/abster (estrelas interativas), ranking compartilhado e pessoal, filtro por nome/data, tela de membros com ações, redesign visual completo.

Faltando pro V1: dono excluir a sala (soft delete), editar config da sala (nome/categoria/escala), acesso de moderação do Master pela UI (hoje só via Firestore Console), manifest/service worker do PWA.

## Ambiente local

- `.env.local` tem as chaves do Firebase (não versionado). Ver `.env.local.example`.
- `.claude/launch.json` **não existe nesta pasta** — a config do dev server (`ranking-everything-dev`, porta 3000) fica em `C:\Rogue\.claude\launch.json` (raiz do workspace), porque é onde a ferramenta de preview do Claude Code lê.
