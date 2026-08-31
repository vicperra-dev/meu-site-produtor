import { NextResponse } from "next/server";
import { requireAuth } from "@/app/lib/auth";
import { goLiveBlockIfNeeded } from "@/app/lib/go-live-maintenance";
import { auditDomainIntegrity } from "@/app/lib/domain/integrity-audit";

/**
 * GET /api/admin/integridade — auditoria somente leitura.
 */
export async function GET() {
  try {
    const user = await requireAuth();
    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }
    const blocked = goLiveBlockIfNeeded(user.role);
    if (blocked) return blocked;

    const report = await auditDomainIntegrity();
    return NextResponse.json({ ok: true, report });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === "Não autenticado" || msg === "Acesso negado") {
      return NextResponse.json({ error: msg }, { status: 401 });
    }
    console.error("[admin/integridade]", err);
    return NextResponse.json({ error: msg || "Erro na auditoria." }, { status: 500 });
  }
}
