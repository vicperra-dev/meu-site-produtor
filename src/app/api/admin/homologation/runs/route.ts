import { NextResponse } from "next/server";
import { requireAuth } from "@/app/lib/auth";
import { canUseSymbolicSimulation } from "@/app/lib/symbolic-payment";
import {
  listHomologationRuns,
  loadHomologationRun,
  loadLatestHomologationRun,
} from "@/app/lib/homologation/store";

export async function GET(req: Request) {
  try {
    const user = await requireAuth();
    if (!canUseSymbolicSimulation(user) || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const runId = searchParams.get("runId");
    if (runId) {
      const run = await loadHomologationRun(runId);
      if (!run) return NextResponse.json({ error: "Run não encontrado." }, { status: 404 });
      return NextResponse.json({ run });
    }

    const latest = await loadLatestHomologationRun();
    const runs = await listHomologationRuns(30);
    return NextResponse.json({ latest, runs });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === "Não autenticado" || msg === "Acesso negado") {
      return NextResponse.json({ error: msg }, { status: 401 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
