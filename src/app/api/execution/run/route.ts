/**
 * EC-01 — Execution API (QA Center / Operator Console / StudioOS prep).
 */

import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/auth";
import {
  ExecutionCore,
  assertExecutionAllowed,
  describeExecutionRegistry,
  getExecutionHistory,
  isProductionRuntimeBlocked,
} from "@/app/lib/execution";
import { EXECUTION_PIPELINE } from "@/app/lib/execution/pipeline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (isProductionRuntimeBlocked()) {
    return NextResponse.json({ error: "Execution API bloqueada em production" }, { status: 403 });
  }
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Admin required" }, { status: 401 });
  }
  return NextResponse.json({
    ok: true,
    engine: "EC-01",
    entryPoint: "ExecutionCore.run()",
    pipeline: EXECUTION_PIPELINE,
    scenarios: describeExecutionRegistry(),
    history: getExecutionHistory(20),
  });
}

export async function POST(req: Request) {
  if (isProductionRuntimeBlocked()) {
    return NextResponse.json({ error: "Execution API bloqueada em production" }, { status: 403 });
  }
  const gate = assertExecutionAllowed({});
  if (!gate.allowed) {
    return NextResponse.json({ error: gate.reason }, { status: 403 });
  }
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Admin required" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const suite = body.suite as string | undefined;
  const scenarioIds = body.scenarioIds as string[] | undefined;
  const report = await ExecutionCore.run({
    suite: suite as any,
    scenarioIds,
    print: false,
  });
  return NextResponse.json({ ok: true, report });
}
