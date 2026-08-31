/**
 * GO-04A.3 — smoke estático auth/access (RC-04..RC-07).
 */
import fs from "fs";
import path from "path";
import { sanitizeInternalRedirect, resolvePostLoginRedirect } from "../src/app/lib/safe-redirect";

type Check = { id: string; ok: boolean; detail: string };

const root = process.cwd();
const checks: Check[] = [];

function read(rel: string) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

const login = read("src/app/login/page.tsx");
const middleware = read("src/app/middleware.ts");
const esqueciApi = read("src/app/api/esqueci-senha/route.ts");
const esqueciPage = read("src/app/esqueci-senha/page.tsx");
const verificar = read("src/app/api/pagamentos/verificar/route.ts");
const testarLayout = read("src/app/testar-email/layout.tsx");

// RC-04 runtime asserts
const openRedirectCases: Array<[string, boolean]> = [
  ["/minha-conta", true],
  ["/carrinho", true],
  ["/agendamento?x=1", true],
  ["https://evil.com", false],
  ["//evil.com", false],
  ["/\\evil.com", false],
  ["javascript:alert(1)", false],
  ["http://localhost:3000/minha-conta", false],
];

for (const [input, shouldKeep] of openRedirectCases) {
  const out = sanitizeInternalRedirect(input, "/minha-conta");
  const ok = shouldKeep ? out === input || out.startsWith(input.split("?")[0]!) : out === "/minha-conta";
  checks.push({
    id: `RC-04-sanitize:${input}`,
    ok,
    detail: `in=${input} out=${out}`,
  });
}

const params = new URLSearchParams({ redirect: "https://phish.example/x" });
checks.push({
  id: "RC-04-resolve-external",
  ok: resolvePostLoginRedirect(params) === "/minha-conta",
  detail: "redirect externo → fallback",
});

checks.push({
  id: "RC-04-login-uses-helper",
  ok: login.includes("resolvePostLoginRedirect"),
  detail: "Login usa sanitize",
});

checks.push({
  id: "RC-05-layout-admin",
  ok: testarLayout.includes("requireDevToolPageAccess"),
  detail: "Layout testar-email exige admin",
});
checks.push({
  id: "RC-05-middleware-block",
  ok: middleware.includes("isDevToolPagePath") && middleware.includes("404"),
  detail: "Middleware bloqueia página de teste",
});

checks.push({
  id: "RC-06-no-enumeration-api",
  ok:
    !esqueciApi.includes("email_nao_cadastrado") &&
    esqueciApi.includes("Se existir uma conta vinculada") &&
    esqueciApi.includes("genericOkResponse"),
  detail: "API não revela existência de e-mail",
});
checks.push({
  id: "RC-06-no-enumeration-ui",
  ok: !esqueciPage.includes("email_nao_cadastrado") && !esqueciPage.includes("não possui cadastro"),
  detail: "UI sem mensagem de e-mail inexistente",
});

checks.push({
  id: "RC-07-paymentId-auth",
  ok:
    verificar.includes("Não autenticado") &&
    verificar.includes("Acesso negado") &&
    verificar.includes("getSessionUser"),
  detail: "paymentId exige auth + ownership",
});
checks.push({
  id: "RC-07-operationId-minimal-public",
  ok:
    verificar.includes("expiresAt") &&
    verificar.includes("canSeeDetails") &&
    verificar.includes("UUID_RE"),
  detail: "operationId público: token temporário + payload mínimo",
});
checks.push({
  id: "RC-07-no-asaas-proxy-public",
  ok: verificar.includes("Lookup Asaas remoto"),
  detail: "Lookup Asaas remoto restrito a admin",
});

const failed = checks.filter((c) => !c.ok);
console.log(JSON.stringify({ ok: failed.length === 0, checks }, null, 2));
if (failed.length) {
  console.error("[go04a3-auth-smoke] FAIL");
  process.exit(1);
}
console.log("[go04a3-auth-smoke] PASS");
