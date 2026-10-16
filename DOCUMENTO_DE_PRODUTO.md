# Ranking Everything — Documento de Produto

Oct 16, 2026 · @Nandes

App para criar salas de ranking colaborativo entre amigos (ex: notas de filmes depois de cada ida ao cinema), com ranking pessoal e ranking compartilhado por média.

---

## 1. Visão Geral

Ranking Everything é um PWA para grupos de amigos criarem salas de ranking colaborativo (ex: notas de filmes após cada ida ao cinema), com ranking pessoal e um ranking compartilhado por média.

- **Plataforma**: PWA instalável, build em Next.js, deploy na Vercel (plano Hobby, grátis para uso pessoal)
- **Backend**: Firebase — Firestore como banco de dados, Firebase Auth para login
- **Autenticação**: único método é login com Google; nome e foto de perfil vêm da conta Google e são salvos para usar como perfil do usuário no app
- **Imagens**: armazenadas como URL externa, sem upload de arquivo e sem Firebase Storage
- **Papéis**: Master (acesso global, é quem criou o app), Dono (criador de uma sala), Admin (promovido pelo dono), Membro (convidado pra sala)
- **Entrada em sala**: qualquer usuário autenticado entra automaticamente ao abrir o link ou digitar o código, sem aprovação prévia

## 2. Roadmap por Versão

### V1 — MVP

- Login com Google
- Criar sala (nome, categoria fixa como "Filmes", escolha da escala: 0–10 com decimais ou 0–5 estrelas com meio ponto)
- Entrar em sala via código/link, com entrada automática
- Papéis dono / admin / membro, dono promove e remove admins
- Dono ou admin adiciona itens (título, imagem por URL opcional, data do evento opcional)
- Votação na escala da sala, ou abstenção ("não participei" / "não quero votar")
- Voto sempre editável e visível para todos os membros da sala
- Ranking compartilhado por média, ignora abstenções, desempate por número de votos
- Ranking pessoal, ordenado pela nota de cada usuário
- Item aparece na lista desde a criação, mesmo com 0 votos
- Dono/admin pode editar ou excluir qualquer item, mesmo com votos existentes
- Membro pode sair da sala voluntariamente
- Dono pode remover qualquer membro, inclusive admins
- Master (o criador do app) acessa e modera qualquer sala
- Filtro de itens por nome e por data do evento, dentro da sala

### V2

- Agrupamento de itens por sessão/evento (ex: separar filmes por data da ida ao cinema, dentro da mesma sala)
- Notificações quando um novo item é adicionado ou quando todos já votaram
- Nome de exibição próprio por sala, diferente do nome do Google
- Estatísticas da sala (quem vota mais alto/baixo em média, quem mais participa)

### V3

- Comentários nos itens
- Temas/customização visual por sala
- Exportar ranking como imagem compartilhável ou PDF

## 3. Papéis e Permissões

| Ação | Master | Dono | Admin | Membro |
| --- | --- | --- | --- | --- |
| Criar uma nova sala (torna-se dono dela) | Sim | Sim | Sim | Sim |
| Editar configuração da sala (nome, escala de nota) | Sim | Sim | Não | Não |
| Excluir a sala | Sim | Sim | Não | Não |
| Promover ou remover admins | Sim | Sim | Não | Não |
| Remover qualquer membro, inclusive admins | Sim | Sim | Não | Não |
| Adicionar item | Sim | Sim | Sim | Não |
| Editar ou excluir item, mesmo com votos | Sim | Sim | Sim | Não |
| Votar ou se abster | Sim\* | Sim | Sim | Sim |
| Ver o voto de todos os outros membros | Sim | Sim | Sim | Sim |
| Sair da sala voluntariamente | Não se aplica | Não (só pode excluir a sala, que é arquivada para todos) | Sim | Sim |

\*Master só vota se também estiver participando da sala como membro — o acesso irrestrito dele é pra suporte/moderação, não implica participação automática no ranking.

## 4. Modelo de Dados

Convenções: toda entidade tem `createdAt`/`updatedAt` (Firestore Timestamp); sala usa soft delete (campo `deletedAt`): dono só pode excluir a sala, nunca sair dela, e a exclusão arquiva/remove o acesso pra todos os membros; demais entidades seguem sem soft delete, exclusão definitiva; campos em camelCase; sala tem um `code` próprio (6 caracteres alfanuméricos, único) separado do ID do documento, usado no link de convite.

### users/{uid}

| Campo | Tipo | Descrição |
| --- | --- | --- |
| displayName | string | Nome vindo do Google |
| email | string | Email da conta Google |
| photoURL | string | Foto de perfil do Google |
| globalRole | "master" \| "user" | Define se tem acesso irrestrito global |
| createdAt | timestamp | — |

### rooms/{roomId}

| Campo | Tipo | Descrição |
| --- | --- | --- |
| name | string | Nome da sala, ex: "Clube do Cinema" |
| category | string | Categoria fixa definida na criação, ex: "Filmes" |
| ratingScale | "0-10" \| "0-5-stars" | Escala de nota escolhida ao criar a sala |
| code | string | Código único de 6 caracteres pra entrar via link |
| ownerId | string (uid) | Dono atual da sala |
| createdAt / updatedAt | timestamp | — |
| deletedAt | timestamp (opcional) | Soft delete: quando preenchido, a sala está excluída/arquivada pra todos os membros |

### rooms/{roomId}/members/{uid}

| Campo | Tipo | Descrição |
| --- | --- | --- |
| role | "owner" \| "admin" \| "member" | Papel do usuário dentro dessa sala |
| displayName | string | Cópia do nome, pra listar membros sem join |
| joinedAt | timestamp | — |

### rooms/{roomId}/items/{itemId}

| Campo | Tipo | Descrição |
| --- | --- | --- |
| title | string | Nome do item, ex: nome do filme |
| imageUrl | string (opcional) | URL externa da imagem |
| eventDate | date (opcional) | Data do evento, ex: data da ida ao cinema |
| addedBy | string (uid) | Quem adicionou o item |
| createdAt / updatedAt | timestamp | — |

### rooms/{roomId}/items/{itemId}/votes/{uid}

| Campo | Tipo | Descrição |
| --- | --- | --- |
| status | "voted" \| "abstained_no_participation" \| "abstained_no_vote" | Votou, não participou do evento, ou não quis votar |
| score | number ou null | Nota na escala da sala; null se abstido |
| votedAt / updatedAt | timestamp | — |

O ranking compartilhado considera apenas votos com status "voted", ignorando abstenções; o desempate é feito pelo número de votos recebidos.

## 5. Navegação

Fluxo principal entre as telas do app (6 telas):

```
Login → Minhas Salas → Criar Sala → Sala (principal) → Item / Votação
                     ↘ Entrar com código ↗        ↘ Membros da Sala
```

## 6. Telas — Descrição Detalhada

### 6.1 Login

Tela única com botão "Entrar com Google". Sem outro método de autenticação.

### 6.2 Minhas Salas

Lista as salas que o usuário participa, como dono, admin ou membro. Botões para "Criar sala" e "Entrar com código".

### 6.3 Criar Sala

Formulário com nome da sala, categoria (texto livre, ex: "Filmes") e escolha da escala de nota (0–10 ou 0–5 estrelas). Ao salvar, o usuário se torna dono e é redirecionado pra sala criada.

### 6.4 Sala (principal)

Mostra o ranking compartilhado (média) e alterna pra "Meu ranking" (ordenado pela nota do próprio usuário). Lista os itens com imagem, nota média e status de votação, com filtro por nome do item e por data do evento. Botão "Adicionar item" visível só pra dono/admin. Acesso à lista de membros e ao código/link de convite.

### 6.5 Item / Votação

Detalhe de um item: imagem, título, campo pra votar na escala da sala, opções "não participei" / "não quero votar", e lista dos votos de todos os membros, sempre visível. Dono/admin tem botões de editar e excluir o item.

### 6.6 Membros da Sala

Lista de todos os membros com seu papel. Dono pode promover/demover admin e remover qualquer membro. Membro comum pode sair da sala por aqui.

## 7. Pontos de Atenção Técnica

- **PWA**: precisa de `manifest.json` e service worker configurados; a Vercel já serve com HTTPS automático, requisito pra instalação e funcionamento do service worker
- **Tempo real**: o `onSnapshot` do Firestore entrega atualização em tempo real de votos e ranking, sem precisar de WebSocket próprio — resolve a limitação de funções serverless da Vercel pra multiplayer leve como esse
- **Regras de segurança** (`firestore.rules`): crítico validar o papel (dono/admin/membro) nas regras do Firestore antes de permitir escrita, não dá pra confiar só na checagem feita na UI
- **Geração do código de convite**: ao criar a sala, gerar um código de 6 caracteres e checar se já existe antes de salvar, pra evitar colisão
- **Cálculo da média**: por enquanto fica client-side, recalculada a cada leitura a partir dos votos — mais simples de implementar. Migrar pra uma Cloud Function com campo `averageScore` cacheado no item fica como otimização futura, se a sala crescer muito (a cota gratuita do plano Blaze já cobriria isso: 2 milhões de invocações e 400.000 GB-segundos de computação por mês)
- **Imagens via URL**: sem validação de que o link aponta pra uma imagem válida; um link quebrado ou alterado depois mostra um placeholder genérico no lugar da imagem
- **Filtro por nome e data**: filtro por data do evento pode ser feito via query direta no campo `eventDate`; filtro por nome provavelmente precisa ser client-side, já que o Firestore não busca por substring nativamente — considerar Algolia/Typesense só se a lista de itens crescer muito
- **Papel de Master**: sem interface de administração no V1 — Nandes vai se cadastrar normalmente no app e setar `globalRole: "master"` manualmente direto no Firestore

## 8. Itens em Aberto

- Formato exato do agrupamento por sessão/evento na V2: tag livre (`eventDate`) ou uma entidade própria "Sessão" com seus próprios itens
