import { NextResponse } from "next/server";
import { requireAuth } from "@/app/lib/auth";
import { canUseSymbolicSimulation } from "@/app/lib/symbolic-payment";
import { SimulationProvider } from "@/app/lib/payment-provider/simulation-provider";
import { loadHomologationRun, saveHomologationRun } from "@/app/lib/homologation/store";

/**
 * POST /api/admin/homologation/refund
 * Body: { providerPaymentId } | { runId }
 */
export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    if (!canUseSymbolicSimulation(user) || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    let providerPaymentId = typeof body.providerPaymentId === "string" ? body.providerPaymentId : "";
    const runId = typeof body.runId === "string" ? body.runId : "";

    let run = runId ? await loadHomologationRun(runId) : null;
    if (!providerPaymentId && run?.providerPaymentId) {
      providerPaymentId = run.providerPaymentId;
    }
    if (!providerPaymentId) {
      return NextResponse.json(
        { error: "Informe providerPaymentId ou runId com pagamento simulado." },
        { status: 400 }
      );
    }

    const provider = new SimulationProvider();
    const outcome = body.outcome as
      | "APPROVED"
      | "PENDING"
      | "FAILED"
      | "TIMEOUT"
      | undefined;
    const refund = await provider.refundPayment(providerPaymentId, {
      description: `Homologação refund manual ${runId || providerPaymentId}`,
      outcome: outcome || "APPROVED",
    });

    if (run) {
      run.refund = { status: refund.status, reason: refund.reason };
      run.timeline.push({
        at: new Date().toISOString(),
        step: "refundPayment:manual",
        ok: refund.status !== "FAILED",
        detail: refund.reason,
        data: refund,
      });
      const refundCheck = run.checks.find((c) => c.key === "refundResolved");
      const reqCheck = run.checks.find((c) => c.key === "refundRequested");
      if (reqCheck) {
        reqCheck.ok = true;
        reqCheck.detail = "solicitado manualmente";
      }
      if (refundCheck) {
        refundCheck.ok = refund.status === "APPROVED" || refund.status === "PENDING";
        refundCheck.detail = `${refund.status}${refund.reason ? ` — ${refund.reason}` : ""}`;
      }
      run.finishedAt = new Date().toISOString();
      await saveHomologationRun(run);
    }

    return NextResponse.json({ refund, run });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === "Não autenticado" || msg === "Acesso negado") {
      return NextResponse.json({ error: msg }, { status: 401 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
