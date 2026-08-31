import { NextResponse } from "next/server";
import { requireAuth } from "@/app/lib/auth";
import { canUseSymbolicSimulation } from "@/app/lib/symbolic-payment";
import { runHomologationSimulation } from "@/app/lib/homologation/engine";
import { HOMOLOGATION_SCENARIOS } from "@/app/lib/homologation/scenarios";
import { goLiveBlockIfNeeded } from "@/app/lib/go-live-maintenance";
import type { RefundLifecycleStatus } from "@/app/lib/payment-provider/types";

/**
 * POST /api/admin/homologation/run
 * Simulação gratuita (SimulationProvider) — sem Asaas.
 * Body: { scenarioId } OU campos legados (tipo/servicos/…).
 */
export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    if (!canUseSymbolicSimulation(user) || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }
    const blocked = goLiveBlockIfNeeded(user.role);
    if (blocked) return blocked;

    const body = await req.json().catch(() => ({}));
    const refundOutcome = body.refundOutcome as RefundLifecycleStatus | undefined;

    const run = await runHomologationSimulation({
      userId: user.id,
      userEmail: user.email,
      userName: user.nomeArtistico || user.email,
      scenarioId: typeof body.scenarioId === "string" ? body.scenarioId : undefined,
      tipo: body.tipo === "plano" ? "plano" : "agendamento",
      servicos: body.servicos,
      beats: body.beats,
      data: body.data,
      hora: body.hora,
      duracaoMinutos: body.duracaoMinutos,
      observacoes: body.observacoes,
      planId: body.planId,
      modo: body.modo === "anual" ? "anual" : "mensal",
      runRefund: Boolean(body.runRefund),
      refundOutcome,
      expectedServiceCoupons:
        typeof body.expectedServiceCoupons === "number" ? body.expectedServiceCoupons : undefined,
      freeLab: Boolean(body.freeLab),
      paymentOutcome:
        body.paymentOutcome === "pending" || body.paymentOutcome === "refused"
          ? body.paymentOutcome
          : body.paymentOutcome === "approved"
            ? "approved"
            : undefined,
    });

    return NextResponse.json({ run, scenarios: HOMOLOGATION_SCENARIOS.map((s) => s.id) });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === "Não autenticado" || msg === "Acesso negado") {
      return NextResponse.json({ error: msg }, { status: 401 });
    }
    console.error("[homologation/run]", err);
    return NextResponse.json({ error: msg || "Erro na homologação." }, { status: 500 });
  }
}

/** GET — lista cenários disponíveis. */
export async function GET() {
  try {
    const user = await requireAuth();
    if (!canUseSymbolicSimulation(user) || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }
    return NextResponse.json({
      scenarios: HOMOLOGATION_SCENARIOS.map((s) => ({
        id: s.id,
        label: s.label,
        description: s.description,
        refundOutcome: s.refundOutcome ?? null,
        expectedServiceCoupons: s.expectedServiceCoupons ?? null,
      })),
      presets: (await import("@/app/lib/homologation/presets")).LAB_PRESETS,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 401 });
  }
}
