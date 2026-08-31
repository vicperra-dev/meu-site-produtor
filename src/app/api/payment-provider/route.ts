import { NextResponse } from "next/server";

export async function GET() {
  const { getAsaasApiKey } = await import("@/app/lib/env");
  const asaasKey = getAsaasApiKey();
  
  if (!asaasKey) {
    return NextResponse.json({ 
      provider: null,
      error: "ASAAS_API_KEY não configurado",
      available: {
        asaas: false,
      }
    }, { status: 500 });
  }
  
  return NextResponse.json({ 
    provider: "asaas",
    available: {
      asaas: true,
    }
  });
}
