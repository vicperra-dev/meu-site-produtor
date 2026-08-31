# QE-01b — Login Automático após Registro

**Modo:** IMPLEMENTAÇÃO CONTROLADA  
**Gerado:** 2026-07-10  
**Branch:** `pr03-clean` @ `66a8e5c` (sem commit)

---

## Respostas

| Pergunta | Resposta |
|----------|----------|
| **Arquivos alterados** | `auth.ts`, `login/route.ts`, `registro/route.ts` |
| **Linhas adicionadas** | **26** |
| **Linhas removidas** | **18** |
| **Duplicação eliminada?** | **SIM** |
| **Login continua igual?** | **SIM** — mesmo TTL, cookie e flags |
| **Registro entra autenticado?** | **SIM** — `createUserSession` após `user.create` |
| **Build** | **PASSOU** (`tsc` exit 0, `npm run build` exit 0) |

---

## Implementação

### 1. Helper `createUserSession(userId)` — `auth.ts`

```typescript
export async function createUserSession(userId: string) {
  const session = await prisma.session.create({
    data: {
      userId,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS), // 7 dias
    },
  });
  cookieStore.set("session_id", session.id, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return session;
}
```

### 2. Login

Substituído bloco inline (17 linhas) por:

```typescript
await createUserSession(user.id);
```

Validação, `loginLog`, `blocked` e response JSON **inalterados**.

### 3. Registro

Após `prisma.user.create`:

```typescript
await createUserSession(user.id);
```

`AuthContext.registro()` → `refresh()` → `/api/me` agora retorna `user`.

---

## Diff por arquivo

| Arquivo | + | − |
|---------|---|---|
| `src/app/lib/auth.ts` | 21 | 0 |
| `src/app/api/login/route.ts` | 2 | 17 |
| `src/app/api/registro/route.ts` | 3 | 1 |
| **Total** | **26** | **18** |

---

## Fluxo pós-implementação

```
Registro → user.create → createUserSession → cookie session_id
    → refresh() → /api/me → user OK → /conta acessível
```

Bounce `registro → conta → login` **eliminado**.

---

## Restrições respeitadas

- Sem alteração de schema Prisma / migrations
- TTL 7 dias inalterado
- Cookie `session_id` e flags inalterados
- **Sem commit** (conforme instruído)

---

Execução parada conforme instruído.
