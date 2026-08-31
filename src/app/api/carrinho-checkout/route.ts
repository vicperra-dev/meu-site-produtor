import { NextResponse } from "next/server";

const retired = () =>
  NextResponse.json(
    {
      error:
        "Endpoint legado desativado. Use /api/asaas/checkout-carrinho, com cálculo financeiro no servidor.",
    },
    { status: 410 }
  );

export async function POST() {
  return retired();
}

export async function GET() {
  return retired();
}
