/**
 * GO-02A — Financial Smoke environment readiness (read-only, redacted).
 * Does not call Asaas, webhooks, payments, refunds, deploy or migrate.
 */
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

function loadEnvFile(filePath: string): Record<string, string> {
  if (!fs.existsSync(filePath)) return {};
  const out: Record<string, string> = {};
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    out[m[1]] = v;
  }
  return out;
}

const env = {
  ...loadEnvFile(path.join(process.cwd(), ".env")),
  ...loadEnvFile(path.join(process.cwd(), ".env.local")),
  ...process.env,
} as Record<string, string | undefined>;

const key = String(env.ASAAS_API_KEY || "");
const wh = String(env.ASAAS_WEBHOOK_ACCESS_TOKEN || "");
const db = String(env.DATABASE_URL || "");
const siteUrl = String(env.NEXT_PUBLIC_SITE_URL || "");
const skipTls = String(env.ASAAS_SKIP_TLS_VERIFY || "");
const storage = String(env.STORAGE_PROVIDER || "local");

function redactDb(u: string) {
  try {
    const x = new URL(u);
    return {
      protocol: x.protocol.replace(":", ""),
      host: x.host,
      db: x.pathname,
      hasUser: Boolean(x.username),
    };
  } catch {
    return { status: u ? "present_unparseable" : "missing" };
  }
}

const gitStatus = execSync("git status --porcelain", { encoding: "utf8" }).trim();
const gitHead = execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim();
let migrateStatus = "";
let migrationStatusExitCode = 0;
try {
  migrateStatus = execSync("npx prisma migrate status", {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
} catch (error) {
  const failure = error as {
    status?: number;
    stdout?: string | Buffer;
    stderr?: string | Buffer;
  };
  migrationStatusExitCode = Number(failure.status ?? 1);
  migrateStatus = `${String(failure.stdout || "")}\n${String(failure.stderr || "")}`.trim();
}

const isProdToken = key.startsWith("$aact_prod_") || key.startsWith("aact_prod_");
const isSandboxish =
  !isProdToken &&
  (key.startsWith("$aact_") || key.startsWith("aact_") || key.length > 20);

type GateStatus = "OK" | "PENDENTE" | "AUSENTE";
type Gate = {
  item: string;
  status: GateStatus;
  motivo: string;
  comoResolver: string;
};

const pendingMigration =
  migrateStatus.includes("20260718120000_go01_payment_provider_coupon_service") ||
  migrateStatus.includes("have not yet been applied");
const isHttpsSite = /^https:\/\//i.test(siteUrl);
const expectedEnvironment =
  env.GO02_ASAAS_ENV === "sandbox" || env.GO02_ASAAS_ENV === "production"
    ? env.GO02_ASAAS_ENV
    : "";
const keyMatchesEnvironment =
  expectedEnvironment === "sandbox"
    ? isSandboxish
    : expectedEnvironment === "production"
      ? isProdToken
      : false;

function confirmed(name: string): boolean {
  return env[name] === "1";
}

const gates: Gate[] = [
  {
    item: "Git limpo",
    status: gitStatus === "" ? "OK" : "PENDENTE",
    motivo: gitStatus === "" ? `HEAD ${gitHead}` : `Há alterações locais: ${gitStatus}`,
    comoResolver: "Revisar e commitá-las ou removê-las conscientemente antes do GO-02.",
  },
  {
    item: "Architecture Freeze ativo",
    status: fs.existsSync("docs/architecture/architecture-freeze.md") ? "OK" : "AUSENTE",
    motivo: "Declaração oficial do freeze.",
    comoResolver: "Restaurar docs/architecture/architecture-freeze.md.",
  },
  {
    item: "Migration pronta",
    status: fs.existsSync(
      "prisma/migrations/20260718120000_go01_payment_provider_coupon_service/migration.sql"
    )
      ? "OK"
      : "AUSENTE",
    motivo: "Migration versionada para provider, providerPaymentId e Coupon.serviceId.",
    comoResolver: "Restaurar a migration GO-01.1 versionada; não usar db push.",
  },
  {
    item: "Migration aplicada no ambiente alvo",
    status:
      migrationStatusExitCode === 0 && !pendingMigration && confirmed("GO02_CONFIRM_MIGRATE")
        ? "OK"
        : "PENDENTE",
    motivo: pendingMigration
      ? "prisma migrate status informa migration GO-01.1 pendente no DATABASE_URL atual."
      : !confirmed("GO02_CONFIRM_MIGRATE")
        ? "Aplicação no ambiente alvo não foi confirmada."
        : `migrate status terminou com código ${migrationStatusExitCode}.`,
    comoResolver:
      "Após backup/restore validado, executar npx prisma migrate deploy no alvo, validar npx prisma migrate status e definir GO02_CONFIRM_MIGRATE=1.",
  },
  {
    item: "DATABASE_URL",
    status: db ? "OK" : "AUSENTE",
    motivo: db ? JSON.stringify(redactDb(db)) : "Variável não definida.",
    comoResolver: "Configurar DATABASE_URL do ambiente correto sem registrar credenciais no Git.",
  },
  {
    item: "GO02_ASAAS_ENV",
    status: expectedEnvironment ? "OK" : "AUSENTE",
    motivo: expectedEnvironment || "Ambiente Asaas não declarado.",
    comoResolver: "Definir explicitamente GO02_ASAAS_ENV=sandbox ou production.",
  },
  {
    item: "ASAAS_API_KEY",
    status: !key ? "AUSENTE" : keyMatchesEnvironment ? "OK" : "PENDENTE",
    motivo: !key
      ? "Variável não definida."
      : `Chave ${isProdToken ? "production" : isSandboxish ? "sandbox" : "não reconhecida"}; ambiente esperado ${expectedEnvironment || "não definido"}.`,
    comoResolver:
      "Configurar a chave do mesmo ambiente declarado em GO02_ASAAS_ENV; nunca copiar chave production para sandbox.",
  },
  {
    item: "ASAAS_WEBHOOK_ACCESS_TOKEN",
    status: wh ? "OK" : "AUSENTE",
    motivo: wh ? `Token presente (len=${wh.length}; valor omitido).` : "Token ausente.",
    comoResolver:
      "Criar token forte, configurar no ambiente alvo e usar exatamente o mesmo token no painel Asaas.",
  },
  {
    item: "NEXT_PUBLIC_SITE_URL",
    status: !siteUrl ? "AUSENTE" : isHttpsSite ? "OK" : "PENDENTE",
    motivo: siteUrl || "Variável ausente.",
    comoResolver:
      "Configurar a URL HTTPS pública do ambiente; localhost não recebe webhook público.",
  },
  {
    item: "Webhook configurado e acessível",
    status:
      wh && isHttpsSite && confirmed("GO02_CONFIRM_WEBHOOK") ? "OK" : "PENDENTE",
    motivo: confirmed("GO02_CONFIRM_WEBHOOK")
      ? "Confirmação humana registrada."
      : "URL, token e resposta HTTP ainda não foram confirmados no painel Asaas.",
    comoResolver:
      "Configurar <NEXT_PUBLIC_SITE_URL>/api/webhooks/asaas no painel, igualar o token, validar resposta HTTP sem evento financeiro e definir GO02_CONFIRM_WEBHOOK=1.",
  },
  {
    item: "TLS Asaas seguro",
    status: !skipTls || skipTls === "false" || skipTls === "0" ? "OK" : "PENDENTE",
    motivo: skipTls ? `ASAAS_SKIP_TLS_VERIFY=${skipTls}` : "Relaxamento TLS não definido.",
    comoResolver: "Remover ASAAS_SKIP_TLS_VERIFY ou definir false no ambiente do smoke.",
  },
  {
    item: "Storage operacional",
    status: storage === "local" ? "OK" : "PENDENTE",
    motivo: `STORAGE_PROVIDER=${storage}.`,
    comoResolver: "GO-02 usa local; definir STORAGE_PROVIDER=local e validar upload não financeiro.",
  },
  {
    item: "Backup confirmado e restore validado",
    status: confirmed("GO02_CONFIRM_BACKUP") ? "OK" : "PENDENTE",
    motivo: confirmed("GO02_CONFIRM_BACKUP")
      ? "Confirmação humana registrada."
      : "Nenhuma evidência local de backup/restore e GO02_CONFIRM_BACKUP != 1.",
    comoResolver:
      "Criar backup do DB alvo, restaurar em instância isolada, validar integridade e definir GO02_CONFIRM_BACKUP=1.",
  },
  {
    item: "GO-02 Ready Checklist assinado",
    status: confirmed("GO02_CONFIRM_CHECKLIST") ? "OK" : "PENDENTE",
    motivo: confirmed("GO02_CONFIRM_CHECKLIST")
      ? "Confirmação humana registrada."
      : "Checklist ainda não confirmado.",
    comoResolver:
      "Preencher docs/operations/go02-ready-checklist.md com responsável/evidências e definir GO02_CONFIRM_CHECKLIST=1.",
  },
  {
    item: "Checkout/refund/webhook infra",
    status:
      fs.existsSync("src/app/api/asaas/checkout-agendamento/route.ts") &&
      fs.existsSync("src/app/api/webhooks/asaas/route.ts") &&
      fs.existsSync("src/app/lib/asaas-refund.ts")
        ? "OK"
        : "AUSENTE",
    motivo: "Rotas e adaptadores financeiros presentes; nenhuma chamada executada.",
    comoResolver: "Restaurar arquivos certificados da RC; não modificar domínio no GO-02A.",
  },
  {
    item: "Assinaturas e logs",
    status:
      fs.existsSync("src/app/lib/asaas-subscriptions.ts") &&
      fs.existsSync("src/app/lib/asaas-fetch.ts")
        ? "OK"
        : "AUSENTE",
    motivo: "Infraestrutura certificada presente; execução fora do escopo GO-02A.",
    comoResolver: "Restaurar arquivos certificados se ausentes.",
  },
];

const blockers = gates.filter((gate) => gate.status !== "OK");

const result = {
  reportId: "GO-02A-environment-readiness",
  executedAt: new Date().toISOString(),
  verdict: blockers.length === 0 ? "READY" : "STOP",
  target: {
    database: redactDb(db),
    asaasEnvironment: expectedEnvironment || null,
    migrationStatusExitCode,
    pendingMigration,
  },
  blockers,
  gates,
};

const outDir = path.join("reports", "domain-guardian");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(
  path.join(outDir, "go02-presmoke-checklist.json"),
  JSON.stringify(result, null, 2)
);

if (blockers.length) {
  console.log("STOP");
  for (const blocker of blockers) {
    console.log(`- item: ${blocker.item}`);
    console.log(`  motivo: ${blocker.motivo}`);
    console.log(`  como resolver: ${blocker.comoResolver}`);
  }
  process.exit(1);
}
console.log("READY");
