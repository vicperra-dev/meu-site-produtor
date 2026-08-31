// src/app/api/pagamentos/debug/route.ts
// GO-04A.1 RC-03: sem exposição pública de chave/ambiente Asaas.
// Disponível apenas em development, para administradores autenticados.
import { NextResponse } from "next/server";
import { getAsaasApiKey } from "@/app/lib/env";
import { requireAdmin } from "@/app/lib/auth";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  try {
    const apiKey = getAsaasApiKey();

    return NextResponse.json({
      apiKeyConfigured: Boolean(apiKey),
      nodeEnv: process.env.NODE_ENV,
    });
  } catch {
    return NextResponse.json(
      { error: "Erro ao verificar configuração" },
      { status: 500 }
    );
  }
}
