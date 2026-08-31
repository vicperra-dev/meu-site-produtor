# QE-01 — Auditoria da Jornada do Novo Cliente

**Modo:** READ ONLY  
**Gerado:** 2026-07-10  
**Branch:** `pr03-clean` @ `66a8e5c`

---

## Veredito

| Item | Resultado |
|------|-----------|
| **Jornada do Novo Cliente** | **REPROVADA** |
| **Pode iniciar QE-01 (Functional Testing)?** | **NÃO** (corrigir gap de registro/sessão antes) |

---

## Modelo de autenticação

| Aspecto | Implementação |
|---------|---------------|
| Tipo | **Sessão server-side** (não JWT) |
| Cookie | `session_id` (httpOnly, sameSite=lax, secure em produção) |
| Persistência | `Prisma.Session` — expira em **7 dias** |
| Lib central | `src/app/lib/auth.ts` |
| Cliente | `src/app/context/AuthContext.tsx` |

---

## Fluxograma textual

```
Home (src/app/page.tsx)                                    🟢 OK
    ↓ Header → Entrar / Registrar
Registro (src/app/registro/page.tsx)                       🟡 ATENÇÃO
    ↓ POST /api/registro
Validação Zod (registroSchema)                             🟢 OK
    ↓
Prisma user.create (bcrypt, role USER)                     🟢 OK
    ↓ ⚠️ SEM criação de Session / cookie
Redirect → /conta                                          🟡 ATENÇÃO
    ↓ user=null (AuthContext)
Redirect → /login                                          🟡 fluxo morto parcial
Login (src/app/login/page.tsx)                             🟢 OK
    ↓ POST /api/login
Validação Zod + bcrypt + blocked check                     🟢 OK
    ↓
Prisma session.create + cookie session_id                  🟢 OK
    ↓
GET /api/me → AuthContext.user                             🟢 OK
Middleware (src/app/middleware.ts)                         🟡 só manutenção
    ↓
Minha Conta (src/app/minha-conta/page.tsx)                 🟢 OK
    ↓ GET /api/meus-dados (requireAuth)
Prisma — agendamentos, planos, cupons, FAQ (userId)        🟢 OK
```

---

## Etapas detalhadas

### 1. Home 🟢

| Campo | Valor |
|-------|-------|
| Arquivo | `src/app/page.tsx` |
| API | — |
| Middleware | Pass-through (exceto manutenção) |
| Sessão | AuthProvider hidrata via `/api/me` no mount |

### 2. Registro 🟡

| Campo | Valor |
|-------|-------|
| Arquivo | `src/app/registro/page.tsx` |
| API | `POST /api/registro` |
| Validação | `registroSchema` (Zod) |
| Prisma | `user.create` |
| Sessão | **Não cria** — gap crítico da jornada |
| Proteções | Email único, hash bcrypt |

**Gap:** Após registro bem-sucedido, `AuthContext.registro()` chama `refresh()`, mas `/api/me` retorna `user: null`. A página redireciona para `/conta`, que exige login → usuário volta para `/login`.

### 3. Login 🟢

| Campo | Valor |
|-------|-------|
| Arquivo | `src/app/login/page.tsx` |
| API | `POST /api/login` |
| Validação | `loginSchema` |
| Prisma | `session.create`, `loginLog.create` |
| Cookie | `session_id` httpOnly |
| Redirect | `/conta` (default) ou `?redirect=` |

### 4. Sessão autenticada 🟢

| Campo | Valor |
|-------|-------|
| Cliente | `AuthContext` — `refresh()` → `GET /api/me` |
| Servidor | `getSessionUser()` — valida `expiresAt` |
| Logout | `POST /api/logout` — deleta Session + cookie |

### 5. Minha Conta 🟢

| Campo | Valor |
|-------|-------|
| Arquivo | `src/app/minha-conta/page.tsx` |
| API | `GET /api/meus-dados` |
| Auth | `requireAuth()` server-side |
| Proteção client | `!user` → `router.push("/login")` |
| Prisma | Queries com `where: { userId: user.id }` |

### Conta (Perfil) 🟡 — legado paralelo

| Campo | Valor |
|-------|-------|
| Arquivo | `src/app/conta/page.tsx` |
| API | `GET /api/conta`, `POST /api/conta/update` |
| Nota | Login/registro redirecionam aqui, **não** para `/minha-conta` |

---

## Confirmações (item 3)

| Verificação | Status |
|-------------|--------|
| Registro cria usuário | **SIM** — `prisma.user.create` |
| Login autentica | **SIM** — Session + cookie |
| Sessão persiste | **SIM** — 7 dias, revalidada em `/api/me` |
| Logout limpa sessão | **SIM** — DB + cookie |
| Minha Conta recebe dados corretos | **SIM** — após login, escopo `user.id` |

---

## Cenários de proteção (item 4)

| Cenário | Comportamento | Classificação |
|---------|---------------|---------------|
| Rotas protegidas | **Client-side** redirect; middleware **não** bloqueia | 🟡 |
| Sem login | APIs → 401; páginas → redirect `/login` | 🟢 |
| Credenciais inválidas | 401 genérico | 🟢 |
| Cookie expirado | `user: null`; cookie não auto-removido | 🟡 |
| JWT inválido | N/A — não usa JWT | — |
| `session_id` inválido | `user: null`, APIs 401 | 🟢 |

---

## Riscos (item 5)

| Pergunta | Resposta |
|----------|----------|
| Fluxo morto? | **SIM** — registro → `/conta` sem sessão → `/login` |
| Código legado? | **SIM** — `/conta` vs `/minha-conta`; email admin hardcoded |
| API duplicada? | **Parcial** — `/api/me`, `/api/conta`, `/api/meus-dados` (papéis distintos) |
| Auth paralela? | **NÃO** — único modelo session |
| Risco cross-user? | **Baixo** — APIs usam `requireAuth()` + `user.id` da sessão |

---

## Classificação por etapa

| Etapa | Status |
|-------|--------|
| Home | 🟢 OK |
| Registro (API) | 🟢 OK |
| Registro (fluxo UX) | 🟡 ATENÇÃO |
| Login | 🟢 OK |
| Sessão | 🟢 OK |
| Middleware | 🟡 ATENÇÃO |
| Minha Conta | 🟢 OK |
| Gap registro→sessão | 🔴 Crítico (jornada incompleta) |

---

## Bloqueio para QE-01

Antes do Functional Testing, resolver:

1. **Registro deve criar sessão** (ou redirecionar explicitamente para `/login` com mensagem)
2. **Alinhar destino pós-login** com `/minha-conta` se essa for a jornada alvo
3. **Documentar** `/conta` (perfil) vs `/minha-conta` (dashboard)

---

Restrições respeitadas: sem alteração de código, commits, migrate ou banco.
