/**
 * POST /api/planos/cancelar — DESCONTINUADO (GO-H11A).
 * Fluxo canônico: POST /api/assinatura/cancel (GO-H10C).
 */
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json(
    {
      error:
        "Esta API foi descontinuada. Use POST /api/assinatura/cancel (arquitetura GO-H10C).",
      code: "LEGACY_CANCEL_DEPRECATED",
      successor: "/api/assinatura/cancel",
    },
    { status: 410 }
  );
}
