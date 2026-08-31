/**
 * GO-H11A — Checkout legado Mercado Pago descontinuado.
 * Use /api/asaas/checkout (planos) ou fluxos Asaas equivalentes.
 */
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  return NextResponse.json(
    {
      error: "Endpoint legado Mercado Pago descontinuado. Use /api/asaas/*.",
      code: "LEGACY_GATEWAY_DEPRECATED",
      successor: "/api/asaas",
    },
    { status: 410 }
  );
}
