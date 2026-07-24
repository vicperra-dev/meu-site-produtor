import { NextResponse } from "next/server";
import { requireAuth } from "@/app/lib/auth";
import { goLiveBlockIfNeeded } from "@/app/lib/go-live-maintenance";
import { repairDomainIntegrity } from "@/app/lib/domain/integrity-repair";

/**
 * POST /api/admin/integridade/reparar — reparo sob demanda.
 */
export async function POST() {
  try {
    const user = await requireAuth();
    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }
    const blocked = goLiveBlockIfNeeded(user.role);
    if (blocked) return blocked;

    const report = await repairDomainIntegrity();
    return NextResponse.json({ ok: true, report });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === "Não autenticado" || msg === "Acesso negado") {
      return NextResponse.json({ error: msg }, { status: 401 });
    }
    console.error("[admin/integridade/reparar]", err);
    return NextResponse.json({ error: msg || "Erro no reparo." }, { status: 500 });
  }
}
