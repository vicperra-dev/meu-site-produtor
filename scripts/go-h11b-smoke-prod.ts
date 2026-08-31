/**
 * GO-H11B — Smoke HTTP pós-deploy (superfícies públicas + APIs de saúde).
 * Uso: npx --yes tsx --tsconfig tsconfig.json scripts/go-h11b-smoke-prod.ts [BASE_URL]
 */
import fs from "fs";
import path from "path";

const BASE = (process.argv[2] || process.env.SMOKE_BASE_URL || "https://www.thouse-rec.com.br").replace(
  /\/$/,
  ""
);

type Check = { name: string; path: string; expect?: number[]; method?: string };

const CHECKS: Check[] = [
  { name: "Home", path: "/" },
  { name: "Planos", path: "/planos" },
  { name: "FAQ", path: "/faq" },
  { name: "Shopping", path: "/shopping" },
  { name: "Login", path: "/login" },
  { name: "Cadastro", path: "/registro" },
  { name: "Minha Conta (redirect/auth)", path: "/minha-conta", expect: [200, 307, 302] },
  { name: "Carrinho", path: "/carrinho", expect: [200, 307, 302] },
  { name: "Termos", path: "/termos-contratos" },
  { name: "site-status", path: "/api/site-status" },
  { name: "payment-provider", path: "/api/payment-provider" },
  { name: "legacy planos/cancelar", path: "/api/planos/cancelar", method: "POST", expect: [410, 401, 403] },
  { name: "legacy mercadopago checkout", path: "/api/mercadopago/checkout", method: "POST", expect: [410] },
  { name: "legacy infinitypay checkout", path: "/api/infinitypay/checkout", method: "POST", expect: [410] },
  { name: "entregas proxy unauth", path: "/api/entregas/00000000-0000-0000-0000-000000000000", expect: [401, 404] },
  { name: "admin unauth", path: "/admin", expect: [200, 307, 302] },
];

async function run() {
  const results: Array<Record<string, unknown>> = [];
  let failed = 0;
  for (const c of CHECKS) {
    const url = `${BASE}${c.path}`;
    const expect = c.expect || [200];
    try {
      const res = await fetch(url, {
        method: c.method || "GET",
        redirect: "manual",
        headers: { "content-type": "application/json" },
        body: c.method === "POST" ? "{}" : undefined,
      });
      const ok = expect.includes(res.status);
      if (!ok) failed += 1;
      results.push({
        name: c.name,
        url,
        status: res.status,
        ok,
        expect,
      });
      console.log(`${ok ? "PASS" : "FAIL"} ${c.name} → ${res.status}`);
    } catch (e) {
      failed += 1;
      results.push({
        name: c.name,
        url,
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      });
      console.log(`FAIL ${c.name} → ${e}`);
    }
  }

  const outDir = path.join("reports", "domain-guardian", "go-h11b");
  fs.mkdirSync(outDir, { recursive: true });
  const report = {
    at: new Date().toISOString(),
    base: BASE,
    failed,
    passed: results.length - failed,
    total: results.length,
    ok: failed === 0,
    results,
  };
  fs.writeFileSync(path.join(outDir, "smoke-prod.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ok: report.ok, passed: report.passed, failed: report.failed }, null, 2));
  if (failed > 0) process.exit(1);
}

run();
