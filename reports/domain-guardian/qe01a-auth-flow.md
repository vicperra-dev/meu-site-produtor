# QE-01a — Auditoria do Fluxo de Registro e Autenticação

**Modo:** READ ONLY  
**Gerado:** 2026-07-10  
**Branch:** `pr03-clean` @ `66a8e5c`

---

## 1. API de Registro — fluxo completo

**Arquivo:** `src/app/api/registro/route.ts`

```
POST /api/registro
    ↓
req.json() → body
    ↓
registroSchema.safeParse()          [validations.ts]
    ↓ (400 se inválido)
prisma.user.findUnique({ email })   [duplicado? → 400]
    ↓
bcrypt.hash(senha, 10)
    ↓
prisma.user.create({ ... role: "USER" })
    ↓
return JSON { user: { id, nomeArtistico, email, role } }
    ↓
FIM — sem Session, sem cookie
```

**Cliente:** `registro/page.tsx` → `AuthContext.registro()` → `POST /api/registro` → `refresh()` → `GET /api/me`

---

## 2. Após criar o usuário — o que acontece?

| Camada | Comportamento |
|--------|---------------|
| **Servidor** | Response 200 JSON; request encerra |
| **Banco** | `User` persistido; **nenhuma** `Session` |
| **Cookie** | Nenhum `Set-Cookie` |
| **AuthContext** | `refresh()` → `/api/me` → `{ user: null }` |
| **Página** | `router.push("/conta")` |
| **/conta** | `user === null` → `router.push("/login")` |

---

## 3. Existe função reutilizável que cria Session?

**NÃO.**

`src/app/lib/auth.ts` expõe apenas:

- `getSessionUser()` — leitura
- `requireAuth()` — validação
- `requireAdmin()` — validação admin

A **única** criação de sessão está **inline** em `src/app/api/login/route.ts` (linhas 75–89).

---

## 4. API de Login — como cria a sessão?

**Arquivo:** `src/app/api/login/route.ts`

Pré-condições: Zod OK → user existe → `bcrypt.compare` OK → `!user.blocked`

```typescript
// 1. Registro no banco
const session = await prisma.session.create({
  data: {
    userId: user.id,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  },
});

// 2. Cookie
cookieStore.set("session_id", session.id, {
  httpOnly: true,
  path: "/",
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
});
```

---

## 5. Registro poderia reutilizar exatamente a mesma função?

**SIM.**

Após `user.create`, o `user.id` já está disponível. O mesmo bloco `session.create` + `cookie.set` produziria estado idêntico ao login.

**Ideal:** extrair `createUserSession(userId: string)` em `auth.ts` e chamar de **login** e **registro**.

---

## 6. Existe risco de duplicação?

| Abordagem | Risco |
|-----------|-------|
| Copy-paste do bloco login → registro | **Alto** — TTL, flags, drift futuro |
| Helper compartilhado em `auth.ts` | **Baixo** — fonte única |
| Estado atual | Registro **não** duplica (porque não cria sessão) |

---

## 7. Cookies criados pelo login

| Cookie | Valor | Flags |
|--------|-------|-------|
| `session_id` | UUID da `Session` | `httpOnly`, `path=/`, `sameSite=lax`, `secure` em produção |

**Único cookie de autenticação.** `maxAge` não é setado — expiração real validada no DB (`expiresAt`).

---

## 8. Sessão criada pelo login — passo a passo

1. Cliente `POST /api/login` com `credentials: include`
2. Validação `loginSchema`
3. `user.findUnique` + `bcrypt.compare`
4. `loginLog.create` (auditoria)
5. Checagem `user.blocked`
6. `prisma.session.create` (7 dias)
7. `cookies().set("session_id", ...)`
8. Response JSON `{ user }`
9. `AuthContext.refresh()` → `GET /api/me`
10. `getSessionUser()` lê cookie → valida `expiresAt` → retorna user
11. `setUser(data.user)` — estado autenticado no cliente

---

## 9. Menor alteração para estado idêntico ao login

**Somente servidor** (mínimo obrigatório):

Em `src/app/api/registro/route.ts`, **após** `user.create`, adicionar:

```typescript
const session = await prisma.session.create({
  data: {
    userId: user.id,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
  },
});
const cookieStore = await cookies();
cookieStore.set("session_id", session.id, {
  httpOnly: true,
  path: "/",
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
});
```

**Não precisa alterar:**

- `AuthContext.registro()` — já chama `refresh()`
- Response JSON — já igual ao login
- `auth.ts` leitura — já funciona

**Opcional UX:** `registro/page.tsx` → redirect `/minha-conta` em vez de `/conta`

---

## 10. `/conta` vs `/minha-conta`

| | `/conta` | `/minha-conta` |
|---|----------|----------------|
| **Arquivo** | `conta/page.tsx` | `minha-conta/page.tsx` |
| **API** | `/api/conta`, `/api/conta/update` | `/api/meus-dados` |
| **Função** | **Perfil** — editar cadastro | **Dashboard** — agendamentos, planos, cupons, FAQ |
| **Header** | "Perfil" | "Minha Conta" |

**Motivo:** separação perfil cadastral vs visão operacional do cliente. Login/registro redirecionam para `/conta` (perfil), não para o dashboard.

---

## Melhor solução

### **A) Login automático** ✅

**Justificativa técnica:**

1. `AuthContext.registro()` **já assume** sessão via `refresh()` após sucesso
2. `registro/page.tsx` **já redireciona** para rota protegida (`/conta`)
3. Senha **já validada** no registro — criar sessão é equivalente seguro ao login pós-`bcrypt.compare`
4. **~15 linhas** (ou 1 helper) vs bounce `registro → conta → login`
5. Padrão UX de mercado sem perda de segurança

### B) Redirecionar para Login ❌

Funciona com mudança só no client, mas:

- Mantém fricção desnecessária
- `registro()` retornaria `true` sem `user` até segundo passo
- Não alinha com redirects atuais para `/conta`

**Recomendação de implementação:** Opção A + extrair `createUserSession()` em `auth.ts` para evitar duplicação.

---

Restrições respeitadas: sem alteração de código, commits ou banco.
