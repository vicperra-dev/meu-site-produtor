import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/auth";
import { loadEngineeringReports } from "@/app/lib/engineering-reports";

export async function GET() {
  try {
    await requireAdmin();
    const reports = await loadEngineeringReports();
    return NextResponse.json(reports);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao carregar relatórios";
    if (message.includes("Não autenticado")) {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    if (message.includes("Acesso negado")) {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
