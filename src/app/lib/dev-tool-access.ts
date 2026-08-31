/**
 * GO-04A.3 RC-05 — acesso a ferramentas de teste/debug (server components / API).
 */
import { notFound } from "next/navigation";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/auth";

export async function requireDevToolPageAccess(): Promise<void> {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") {
    notFound();
  }
}

/** Para rotas API de debug/teste: 404 em produção sem admin (não revela existência). */
export function devToolApiDeniedResponse() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
}
