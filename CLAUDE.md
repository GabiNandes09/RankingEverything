# Ranking Everything — CLAUDE.md

Ver [DOCUMENTO_DE_PRODUTO.md](DOCUMENTO_DE_PRODUTO.md) pro escopo/roadmap completo e [DEPLOY.md](DEPLOY.md) pro passo a passo de deploy. Este arquivo documenta a implementação atual (arquitetura, convenções, estado do código).

## Stack

- Next.js 16 (App Router, TypeScript, Tailwind), tudo client-side (`"use client"` em toda página — não há Server Components com dados, só CSR + Firestore realtime).
- Firebase: Auth (Google only) + Firestore. Sem Storage, sem Cloud Functions.
- Deploy: Vercel (ainda não configurado — ver DEPLOY.md).

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

**Se for mexer em "Minhas Salas" ou no fluxo de criar/entrar em sala:** lembre de manter `users/{uid}/rooms/{roomId}` sincronizado (hoje só é escrito em `createRoom`/`joinRoomByCode` — não há sync em edição de sala, remoção de membro ou saída da sala, porque essas features ainda não existem).

Pela mesma razão, o ranking (`useAllItemVotes` em `src/lib/items.ts`) também evita `collectionGroup` nos votos: assina uma sub-coleção `votes` por item individualmente (um `onSnapshot` por item), em vez de uma query cruzando todas as sub-coleções `votes`.

## `subscribeWithRetry` (`src/lib/firebase.ts`)

Logo após login (ou reload que restaura sessão persistida), existe uma race entre a sessão do Firebase Auth ser restaurada e o token ficar de fato anexado ao canal do Firestore — a primeira tentativa de `onSnapshot` pode falhar com `permission-denied` mesmo com regras corretas, e o Firestore **não tenta de novo sozinho** depois de um erro. Todo `onSnapshot` do projeto passa por esse helper, que faz até 2 retries com 400ms de delay antes de propagar o erro de verdade. Use-o pra qualquer novo listener.

## Regras do Firestore (`firestore.rules`)

- `isMember`/`isMaster` usam `exists()`, nunca `get(...).data != null` — chamar `.data` num `get()` de documento inexistente lança erro na regra em vez de retornar falso, o que quebra até condições que deveriam ser curto-circuitadas por um `||` anterior.
- Entrar numa sala sempre cria o próprio doc de membro; só pode se auto-atribuir `role: "owner"` se for de fato o `ownerId` da sala (checado contra o doc da sala já commitado). Promoção a admin só acontece via `update` feito pelo dono.
- Deploy: `npx firebase-tools deploy --only firestore:rules` (e `firestore:indexes` se mexer em índices). O CLI já está autenticado nesta máquina (`npx firebase-tools login` foi rodado uma vez).

## Escala de nota

`ratingScale` da sala é `"0-10"` (passo 0.5) ou `"0-5-stars"` (passo 0.5, meia estrela). `scoreOptions()`/`formatScore()` em `src/app/rooms/[roomId]/items/[itemId]/page.tsx` tratam as duas escalas — se adicionar uma nova escala, mexer nessas duas funções e em `formatAverage()` na página da sala.

## Estado atual (V1 do roadmap)

Implementado: login Google, criar/entrar em sala (código ou link), papéis dono/admin/membro (sem UI de promover/remover ainda), adicionar/editar/excluir item, votar/abster, ranking compartilhado e pessoal, filtro por nome/data, tela de membros (somente leitura).

Faltando pro V1: promover/remover admin, dono remover membro, membro sair da sala, dono excluir sala (soft delete), editar config da sala, acesso de moderação do Master pela UI (hoje só via Firestore Console), manifest/service worker do PWA.

## Ambiente local

- `.env.local` tem as chaves do Firebase (não versionado). Ver `.env.local.example`.
- `.claude/launch.json` **não existe nesta pasta** — a config do dev server (`ranking-everything-dev`, porta 3000) fica em `C:\Rogue\.claude\launch.json` (raiz do workspace), porque é onde a ferramenta de preview do Claude Code lê.
