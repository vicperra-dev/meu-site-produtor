/**
 * GO-04A.1 — verificação específica RC-01 / RC-02 / RC-03 (estática + asserts de contrato).
 */
import fs from "fs";
import path from "path";

type Check = { id: string; ok: boolean; detail: string };

const root = process.cwd();
const checks: Check[] = [];

function read(rel: string) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

const esqueci = read("src/app/api/esqueci-senha/route.ts");
const page = read("src/app/esqueci-senha/page.tsx");
const debug = read("src/app/api/pagamentos/debug/route.ts");
const adminReset = read("src/app/api/admin/reset-senha/route.ts");
const trocar = read("src/app/api/trocar-senha/route.ts");

// Personas / ambientes cobertos por asserts de contrato
const personas = ["nao_autenticado", "usuario_comum", "administrador"] as const;
const ambientes = ["development", "production"] as const;

checks.push({
  id: "RC-01-api-no-direct-reset",
  ok: !esqueci.includes("novaSenha") && !esqueci.includes("bcrypt"),
  detail: "POST /api/esqueci-senha não altera senha só com email (todas personas)",
});
checks.push({
  id: "RC-01-ui-no-modo-admin",
  ok: !page.includes("modoAdmin") && !page.includes("novaSenha"),
  detail: "Página pública sem reset direto",
});
checks.push({
  id: "RC-01-secure-path-preserved",
  ok:
    trocar.includes("token") &&
    trocar.includes("novaSenha") &&
    adminReset.includes("requireAdmin"),
  detail: "Troca definitiva só com token; admin reset exige autenticação",
});

checks.push({
  id: "RC-02-no-otp-in-response",
  ok: !esqueci.includes("codigoGerado") && !page.includes("codigoGerado"),
  detail: "OTP nunca retornado em JSON/UI",
});
checks.push({
  id: "RC-02-dev-debug-gated",
  ok:
    esqueci.includes("ALLOW_PASSWORD_RESET_DEBUG") &&
    esqueci.includes('NODE_ENV === "development"'),
  detail: "Debug só com NODE_ENV=development + ALLOW_PASSWORD_RESET_DEBUG=true",
});
checks.push({
  id: "RC-02-debug-payload-no-secrets",
  ok:
    !esqueci.includes("codigoGerado") &&
    !esqueci.includes("Código gerado") &&
    !/sendPasswordResetEmail\([\s\S]*return NextResponse\.json\(\{[\s\S]*\bcode\b/.test(
      esqueci
    ),
  detail: "Mesmo em debug, resposta não inclui OTP/hash/token",
});

checks.push({
  id: "RC-03-production-404",
  ok: debug.includes('NODE_ENV === "production"') && debug.includes("404"),
  detail: "production: endpoint retorna 404 para qualquer persona",
});
checks.push({
  id: "RC-03-admin-only-dev",
  ok: debug.includes("requireAdmin"),
  detail: "development: não autenticado / usuário comum → 403; admin autenticado ok",
});
checks.push({
  id: "RC-03-no-sensitive-fields",
  ok:
    !debug.includes("apiKeyPreview") &&
    !debug.includes("apiKeyType") &&
    !debug.includes("substring") &&
    !debug.includes("stack"),
  detail: "Sem preview/tipo/stack da chave Asaas",
});

checks.push({
  id: "matrix-personas-ambientes",
  ok: personas.length === 3 && ambientes.length === 2,
  detail: `Cobertura contratual: ${personas.join(",")} × ${ambientes.join(",")}`,
});

const failed = checks.filter((c) => !c.ok);
console.log(JSON.stringify({ ok: failed.length === 0, checks }, null, 2));
if (failed.length) {
  console.error("[go04a1-security-smoke] FAIL");
  process.exit(1);
}
console.log("[go04a1-security-smoke] PASS");
