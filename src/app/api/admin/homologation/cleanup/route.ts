import { NextResponse } from "next/server";
import { requireAuth } from "@/app/lib/auth";
import { canUseSymbolicSimulation } from "@/app/lib/symbolic-payment";
import { cleanupHomologationData } from "@/app/lib/homologation/cleanup";
import { goLiveBlockIfNeeded } from "@/app/lib/go-live-maintenance";

/**
 * DELETE /api/admin/homologation/cleanup
 * Remove apenas artefatos SimulationProvider / Homologação.
 */
export async function DELETE() {
  try {
    const user = await requireAuth();
    if (!canUseSymbolicSimulation(user) || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }
    const blocked = goLiveBlockIfNeeded(user.role);
    if (blocked) return blocked;

    const result = await cleanupHomologationData();
    return NextResponse.json({ ok: true, result });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === "Não autenticado" || msg === "Acesso negado") {
      return NextResponse.json({ error: msg }, { status: 401 });
    }
    console.error("[homologation/cleanup]", err);
    return NextResponse.json({ error: msg || "Erro na limpeza." }, { status: 500 });
  }
}

/** POST alias — alguns clientes preferem POST. */
export async function POST() {
  return DELETE();
}
