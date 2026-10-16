# Ranking Everything — Passo a Passo de Deploy (Firebase + Git + Vercel)

Guia pra sair do zero até ter o PWA no ar em produção.

---

## 1. Firebase

1. Acesse [console.firebase.google.com](https://console.firebase.google.com) e crie um novo projeto (ex: `ranking-everything`).
2. Desative o Google Analytics na criação (não é necessário pro MVP) — opcional, pode deixar ligado se preferir.
3. **Authentication**:
   - Vá em *Build → Authentication → Sign-in method*.
   - Habilite o provedor **Google**.
   - Em *Authorized domains*, adicione o domínio que a Vercel vai gerar (ex: `ranking-everything.vercel.app`) — você pode voltar aqui depois do primeiro deploy pra adicionar o domínio real.
4. **Firestore**:
   - Vá em *Build → Firestore Database → Create database*.
   - Escolha o modo **produção** (não "test mode") — as regras de segurança vão controlar o acesso.
   - Escolha a região (ex: `southamerica-east1` se quiser menor latência no Brasil).
5. **Regras do Firestore** (`firestore.rules`): escreva as regras validando papel (dono/admin/membro) antes de liberar escrita — isso é crítico, não dá pra confiar só na checagem da UI. Vamos escrever esse arquivo junto com o código do app.
6. **Registrar o app Web**:
   - Em *Project settings → General → Your apps*, clique em "Web" (`</>`) e registre um app.
   - Copie o objeto `firebaseConfig` gerado (apiKey, authDomain, projectId, etc.) — vai virar variáveis de ambiente do Next.js.
7. **Plano**: o plano gratuito (Spark) já cobre Firestore + Auth pro MVP. Só migre pra Blaze se decidir usar Cloud Functions (ex: pro cálculo de média cacheado, mencionado como otimização futura) — Blaze ainda tem cota gratuita generosa (2M invocações/mês).

## 2. Git

1. Dentro de `C:\Rogue\RankingEverything`, depois de criar o projeto Next.js (`npx create-next-app@latest .`), inicialize o repositório:
   ```bash
   git init
   ```
2. Crie um `.gitignore` (o `create-next-app` já gera um bom padrão, mas confirme que `.env*.local` está incluído — as chaves do Firebase não devem ir pro repositório).
3. Primeiro commit:
   ```bash
   git add .
   git commit -m "chore: scaffold inicial do Ranking Everything"
   ```
4. Crie um repositório no GitHub (via [github.com/new](https://github.com/new) ou `gh repo create`) — pode ser privado, já que é um app pessoal entre amigos.
5. Conecte e envie:
   ```bash
   git remote add origin https://github.com/<seu-usuario>/ranking-everything.git
   git branch -M main
   git push -u origin main
   ```

## 3. Vercel

1. Acesse [vercel.com](https://vercel.com) e faça login (pode usar a mesma conta GitHub).
2. Clique em **Add New → Project** e importe o repositório `ranking-everything` do GitHub.
3. A Vercel detecta automaticamente que é um projeto Next.js — não precisa mudar build command nem output directory.
4. **Variáveis de ambiente**: antes do primeiro deploy (ou depois, em *Settings → Environment Variables*), adicione as chaves do `firebaseConfig` copiadas no passo 1.6, prefixadas com `NEXT_PUBLIC_` pra ficarem acessíveis no client:
   - `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - `NEXT_PUBLIC_FIREBASE_APP_ID`
5. Clique em **Deploy**. A Vercel builda e publica — você recebe uma URL do tipo `ranking-everything.vercel.app`, já com HTTPS automático (requisito pro PWA/service worker funcionar).
6. Volte ao Firebase Console (*Authentication → Settings → Authorized domains*) e adicione esse domínio da Vercel, senão o login com Google vai falhar em produção.
7. A partir daqui, todo `git push` pra `main` gera um deploy automático de produção; pushes em outras branches/PRs geram preview deployments.

## 4. Checklist final antes de considerar "em produção"

- [ ] `firestore.rules` publicado (`firebase deploy --only firestore:rules`, via Firebase CLI) validando papéis — não deixar em modo de teste
- [ ] Domínio da Vercel autorizado no Firebase Auth
- [ ] Variáveis de ambiente configuradas na Vercel (e nunca commitadas no `.env.local`)
- [ ] `manifest.json` e service worker configurados pro PWA instalável
- [ ] Testar login com Google, criação de sala e voto end-to-end na URL de produção
