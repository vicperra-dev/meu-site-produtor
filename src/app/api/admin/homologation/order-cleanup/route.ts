import { NextResponse } from "next/server";
import { requireAuth } from "@/app/lib/auth";
import { canUseSymbolicSimulation } from "@/app/lib/symbolic-payment";
import { goLiveBlockIfNeeded } from "@/app/lib/go-live-maintenance";
import { cleanupHomologationOrders } from "@/app/lib/homologation/order-cleanup";

/**
 * DELETE/POST /api/admin/homologation/order-cleanup
 * Remove exclusivamente Pedidos de Homologação (origin HOMOLOGATION).
 * Não remove Asaas nem SimulationProvider.
 */
export async function DELETE() {
  try {
    const user = await requireAuth();
    if (!canUseSymbolicSimulation(user) || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }
    const blocked = goLiveBlockIfNeeded(user.role);
    if (blocked) return blocked;

    const result = await cleanupHomologationOrders();
    return NextResponse.json({ ok: true, result });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === "Não autenticado" || msg === "Acesso negado") {
      return NextResponse.json({ error: msg }, { status: 401 });
    }
    console.error("[homologation/order-cleanup]", err);
    return NextResponse.json({ error: msg || "Erro na limpeza." }, { status: 500 });
  }
}

export async function POST() {
  return DELETE();
}
