/**
 * GO-H11A — Webhook Mercado Pago inativo (legado).
 * Webhook oficial: /api/webhooks/asaas
 */
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  return NextResponse.json(
    {
      received: false,
      error: "Webhook Mercado Pago descontinuado. Use /api/webhooks/asaas.",
      code: "LEGACY_GATEWAY_DEPRECATED",
    },
    { status: 410 }
  );
}
