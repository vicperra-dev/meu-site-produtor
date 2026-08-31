/**
 * GO-H11A — Rotas Mercado Pago descontinuadas.
 * PSP oficial: Asaas (`/api/asaas/*`).
 */
import { NextResponse } from "next/server";

const BODY = {
  error: "Mercado Pago descontinuado. Use /api/asaas/* (processador oficial).",
  code: "LEGACY_GATEWAY_DEPRECATED",
  successor: "/api/asaas",
};

export async function POST() {
  return NextResponse.json(BODY, { status: 410 });
}

export async function GET() {
  return NextResponse.json(BODY, { status: 410 });
}
