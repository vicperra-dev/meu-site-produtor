import { NextResponse } from "next/server";
import { PLAN_PRICES } from "@/app/lib/plan-prices";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const planId = searchParams.get("planId");
    const modo = searchParams.get("modo");

    if (!planId || !modo) {
      return NextResponse.json(
        { error: "planId e modo são obrigatórios" },
        { status: 400 }
      );
    }

    const plano = PLAN_PRICES.find((p) => p.id === planId);
    if (!plano) {
      return NextResponse.json(
        { error: "Plano não encontrado" },
        { status: 404 }
      );
    }

    const valor = modo === "mensal" ? plano.mensal : plano.anual;

    return NextResponse.json(
      {
        nome: plano.nome,
        valor,
        modo,
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  } catch (err: any) {
    console.error("Erro ao buscar plano:", err);
    return NextResponse.json(
      { error: "Erro ao buscar plano" },
      { status: 500 }
    );
  }
}
