import { NextResponse } from "next/server";
import { requireAuth } from "@/app/lib/auth";
import { canUseSymbolicSimulation } from "@/app/lib/symbolic-payment";
import { goLiveBlockIfNeeded } from "@/app/lib/go-live-maintenance";
import {
  purgeHomologationScope,
  type HomologationPurgeScope,
} from "@/app/lib/homologation/unified-cleanup";

/**
 * POST /api/admin/homologation/purge
 * Body: { scope: "simulation"|"homologation"|"both", dryRun?: boolean }
 * Limpeza unificada via purgeOrderTree (Pedido Raiz).
 */
export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    if (!canUseSymbolicSimulation(user) || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }
    const blocked = goLiveBlockIfNeeded(user.role);
    if (blocked) return blocked;

    const body = (await req.json().catch(() => ({}))) as {
      scope?: string;
      dryRun?: boolean;
    };
    const scope = String(body.scope || "").toLowerCase() as HomologationPurgeScope;
    if (scope !== "simulation" && scope !== "homologation" && scope !== "both") {
      return NextResponse.json(
        { error: 'scope deve ser "simulation", "homologation" ou "both".' },
        { status: 400 }
      );
    }

    const result = await purgeHomologationScope({
      scope,
      dryRun: Boolean(body.dryRun),
    });

    return NextResponse.json({ ok: true, result });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === "Não autenticado" || msg === "Acesso negado") {
      return NextResponse.json({ error: msg }, { status: 401 });
    }
    console.error("[homologation/purge]", err);
    return NextResponse.json({ error: msg || "Erro na limpeza." }, { status: 500 });
  }
}
