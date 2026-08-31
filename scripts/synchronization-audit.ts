/**
 * SYNC-01A — Synchronization Audit
 * Detecta: events sem rota, polling fora do inventário, reload, gaps.
 */

import fs from "fs";
import path from "path";
import { listRoutedEventNames } from "../src/app/lib/synchronization/routing";
import { POLLING_INVENTORY } from "../src/app/lib/synchronization/polling-inventory";

const ROOT = path.resolve(__dirname, "..");

type Issue = {
  type: string;
  severity: "error" | "warning" | "info";
  message: string;
  evidence?: unknown;
};

function walk(dir: string, acc: string[] = []): string[] {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".next" || entry.name === ".git") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) acc.push(full);
  }
  return acc;
}

function rel(p: string) {
  return path.relative(ROOT, p).replace(/\\/g, "/");
}

async function main() {
  const issues: Issue[] = [];
  const appFiles = walk(path.join(ROOT, "src", "app"));

  // 1) window.location.reload
  for (const file of appFiles) {
    const text = fs.readFileSync(file, "utf8");
    if (text.includes("window.location.reload")) {
      issues.push({
        type: "forbidden_reload",
        severity: "error",
        message: `window.location.reload() encontrado em ${rel(file)}`,
      });
    }
  }

  // 2) setInterval inventory
  const intervalRe = /setInterval\s*\(/g;
  const domainSurfacesRemoved = new Set([
    "src/app/minha-conta/page.tsx",
    "src/app/admin/servicos-aceitos/page.tsx",
    "src/app/admin/servicos-solicitados/page.tsx",
    "src/app/admin/estatisticas/page.tsx",
    "src/app/admin/planos/page.tsx",
    "src/app/hooks/useUnreadAppointmentCount.ts",
    "src/app/hooks/useUnreadPlanCount.ts",
  ]);

  for (const file of appFiles) {
    const r = rel(file);
    const text = fs.readFileSync(file, "utf8");
    const matches = text.match(intervalRe);
    if (!matches) continue;

    if (domainSurfacesRemoved.has(r)) {
      issues.push({
        type: "polling_should_be_removed",
        severity: "error",
        message: `Polling setInterval ainda presente em superfície migrada: ${r}`,
      });
      continue;
    }

    const known = POLLING_INVENTORY.find((i) => i.file === r);
    if (!known) {
      // DomainSyncProvider e chat/faq allowed via inventario or warning
      if (
        r.includes("DomainSyncProvider") ||
        r.includes("chat") ||
        r.includes("faq") ||
        r.includes("useIntelligentRefresh") ||
        r.includes("sucesso")
      ) {
        issues.push({
          type: "polling_unlisted",
          severity: "warning",
          message: `setInterval em ${r} — revisar inventário`,
        });
      } else {
        issues.push({
          type: "polling_unlisted",
          severity: "warning",
          message: `setInterval em ${r} sem item no inventário`,
        });
      }
    } else if (known.classification === "desnecessario" && matches.length > 0) {
      // only error if code still has setInterval AND classification says removed
      if (known.intervalMs === 0) {
        // already handled by domainSurfacesRemoved
      }
    }
  }

  // 3) Route coverage
  const routed = listRoutedEventNames();
  const required = [
    "AppointmentAccepted",
    "AppointmentRejected",
    "AppointmentCancelled",
    "AppointmentRebooked",
    "ServiceStarted",
    "ServiceCompleted",
    "PaymentConfirmed",
    "PaymentRefunded",
    "CouponGenerated",
    "CouponConsumed",
    "PlanCancelled",
    "PlanRenewed",
    "AppointmentReserved",
  ];
  for (const name of required) {
    if (!routed.includes(name as any)) {
      issues.push({
        type: "event_without_route",
        severity: "error",
        message: `Evento sem rota: ${name}`,
      });
    }
  }

  // 4) Engine / SSE presence
  const enginePath = path.join(ROOT, "src/app/lib/synchronization/engine.ts");
  const ssePath = path.join(ROOT, "src/app/api/sync/events/route.ts");
  const providerPath = path.join(ROOT, "src/app/lib/synchronization/DomainSyncProvider.tsx");
  if (!fs.existsSync(enginePath)) {
    issues.push({ type: "missing_engine", severity: "error", message: "engine.ts ausente" });
  }
  if (!fs.existsSync(ssePath)) {
    issues.push({ type: "missing_sse", severity: "error", message: "SSE route ausente" });
  }
  if (!fs.existsSync(providerPath)) {
    issues.push({ type: "missing_provider", severity: "error", message: "DomainSyncProvider ausente" });
  }

  // 5) Transition publishes sync
  const transitionPath = path.join(ROOT, "src/app/lib/domain/state-machine/transition.ts");
  const transitionText = fs.readFileSync(transitionPath, "utf8");
  if (!transitionText.includes("publishFromDomainEvent")) {
    issues.push({
      type: "transition_not_wired",
      severity: "error",
      message: "transition() não publica no Synchronization Engine",
    });
  }

  // 6) Subscriber surfaces used
  const subscriberSurfaces = [
    "minha-conta",
    "dashboard",
    "servicos-gerais",
    "servicos-selecionados",
    "pagamentos",
    "estatisticas",
    "planos",
    "admin-agendamentos",
    "agenda",
  ];
  for (const surface of subscriberSurfaces) {
    const found = appFiles.some((f) => {
      const t = fs.readFileSync(f, "utf8");
      return t.includes(`"${surface}"`) || t.includes(`'${surface}'`);
    });
    if (!found) {
      issues.push({
        type: "orphan_surface",
        severity: "warning",
        message: `Superfície sem referência encontrada: ${surface}`,
      });
    }
  }

  const errors = issues.filter((i) => i.severity === "error");
  const report = {
    ok: errors.length === 0,
    generatedAt: new Date().toISOString(),
    routedEvents: routed.length,
    inventoryItems: POLLING_INVENTORY.length,
    issues,
    counts: {
      errors: errors.length,
      warnings: issues.filter((i) => i.severity === "warning").length,
      info: issues.filter((i) => i.severity === "info").length,
    },
  };

  const outDir = path.join(ROOT, "reports", "domain-guardian");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(outDir, "sync01a-synchronization-audit-latest.json"),
    JSON.stringify(report, null, 2),
    "utf8"
  );

  console.log(JSON.stringify(report, null, 2));
  console.log(report.ok ? "\n[sync-audit] PASS" : "\n[sync-audit] FAIL");
  process.exit(report.ok ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
