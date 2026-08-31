/**
 * EC-01 — Knowledge Graph Audit
 */

import fs from "fs";
import path from "path";
import {
  listGraphEntityIds,
  DOMAIN_GRAPH_NODES,
  entitiesDependingOn,
  surfacesConsumingEvent,
  testsCoveringEntity,
} from "../src/app/lib/domain/graph";

const ROOT = path.resolve(__dirname, "..");

async function main() {
  const issues: { type: string; severity: "error" | "warning"; message: string }[] = [];
  const ids = listGraphEntityIds();

  if (ids.length < 10) {
    issues.push({ type: "insufficient_nodes", severity: "error", message: `esperava ≥10 entidades, got ${ids.length}` });
  }

  const required: (typeof ids)[number][] = [
    "User",
    "Payment",
    "Appointment",
    "Service",
    "Coupon",
    "Plan",
    "Synchronization",
    "Workflow",
  ];
  for (const r of required) {
    if (!ids.includes(r)) issues.push({ type: "missing_entity", severity: "error", message: `entidade ${r} ausente` });
  }

  for (const id of ids) {
    const node = DOMAIN_GRAPH_NODES[id];
    if (!node.producesEvents.length && !node.consumesEvents.length && id !== "Statistics" && id !== "Dashboard") {
      issues.push({ type: "no_events", severity: "warning", message: `${id} sem eventos mapeados` });
    }
  }

  const couponDeps = entitiesDependingOn("Coupon");
  if (!couponDeps.includes("Appointment")) {
    issues.push({ type: "graph_integrity", severity: "error", message: "Coupon→Appointment dependência esperada" });
  }

  const paymentSurfaces = surfacesConsumingEvent("PaymentConfirmed");
  if (paymentSurfaces.length < 3) {
    issues.push({ type: "surface_routing", severity: "warning", message: "PaymentConfirmed com poucas superfícies" });
  }

  const planTests = testsCoveringEntity("Plan");
  if (planTests.length < 3) {
    issues.push({ type: "test_coverage", severity: "warning", message: "Plan com poucos testes mapeados" });
  }

  const errors = issues.filter((i) => i.severity === "error");
  const report = {
    ok: errors.length === 0,
    generatedAt: new Date().toISOString(),
    entities: ids.length,
    edges: ids.reduce((a, id) => a + DOMAIN_GRAPH_NODES[id].dependsOn.length + DOMAIN_GRAPH_NODES[id].affects.length, 0),
    issues,
    counts: { errors: errors.length, warnings: issues.filter((i) => i.severity === "warning").length },
  };

  const outDir = path.join(ROOT, "reports/domain-guardian");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "ec01-knowledge-graph-audit-latest.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  console.log(report.ok ? "\n[knowledge-graph-audit] PASS" : "\n[knowledge-graph-audit] FAIL");
  process.exit(report.ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
