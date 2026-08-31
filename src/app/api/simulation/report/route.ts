/**
 * SIM-01 — Simulation API (preparação QA Center, sem UI).
 * GET: health + registry. POST: bloqueado em production.
 */

import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/auth";
import {
  assertSimulationAllowed,
  describeSimulationRegistry,
  isProductionRuntimeBlocked,
} from "@/app/lib/simulation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (isProductionRuntimeBlocked()) {
    return NextResponse.json({ error: "Simulation API bloqueada em production" }, { status: 403 });
  }
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Admin required" }, { status: 401 });
  }
  return NextResponse.json({
    ok: true,
    engine: "SIM-01",
    simulations: describeSimulationRegistry(),
    pipeline: [
      "Simulation",
      "ScenarioRunner",
      "OfficialPipelineAdapter",
      "Workflow",
      "StateMachine",
      "DomainEvents",
      "SynchronizationEngine",
      "Assertions",
    ],
  });
}

export async function POST() {
  if (isProductionRuntimeBlocked()) {
    return NextResponse.json({ error: "Simulation API bloqueada em production" }, { status: 403 });
  }
  const gate = assertSimulationAllowed({});
  if (!gate.allowed) {
    return NextResponse.json({ error: gate.reason }, { status: 403 });
  }
  return NextResponse.json({
    ok: true,
    message: "Use CLI npm run sim:batch para execução. API POST reservada para QA Center (SIM-02).",
  });
}
