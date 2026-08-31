import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/auth";

/**
 * Endpoint para forçar a liberação de um cupom específico
 * Útil para testes e correção de cupons que não foram liberados corretamente
 */
export async function POST(req: Request) {
  try {
    await requireAdmin();

    const body = await req.json();
    const { cupomCode } = body;

    if (!cupomCode) {
      return NextResponse.json(
        { error: "Código do cupom é obrigatório" },
        { status: 400 }
      );
    }

    // Buscar cupom pelo código
    const cupom = await prisma.coupon.findUnique({
      where: { code: cupomCode.toUpperCase() },
    });

    if (!cupom) {
      return NextResponse.json(
        { error: "Cupom não encontrado" },
        { status: 404 }
      );
    }

    console.log(`[Admin Liberar Cupom] Cupom encontrado: ${cupom.code}`);
    console.log(`[Admin Liberar Cupom] Estado atual: usado=${cupom.used}, appointmentId=${cupom.appointmentId}`);

    // Forçar liberação do cupom
    const cupomAtualizado = await prisma.coupon.update({
      where: { id: cupom.id },
      data: {
        appointmentId: null, // Remover associação
        used: false, // Marcar como não usado
        usedAt: null, // Limpar data de uso
        usedBy: null, // Limpar usuário que usou
      },
    });

    console.log(`[Admin Liberar Cupom] ✅ Cupom ${cupom.code} liberado com sucesso`);
    console.log(`[Admin Liberar Cupom] Novo estado: usado=${cupomAtualizado.used}, appointmentId=${cupomAtualizado.appointmentId}`);

    return NextResponse.json({
      success: true,
      message: `Cupom ${cupom.code} liberado com sucesso`,
      cupom: {
        code: cupomAtualizado.code,
        used: cupomAtualizado.used,
        appointmentId: cupomAtualizado.appointmentId,
        usedAt: cupomAtualizado.usedAt,
        usedBy: cupomAtualizado.usedBy,
      },
    });
  } catch (err: any) {
    if (err.message === "Acesso negado" || err.message === "Não autenticado") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }
    console.error("[Admin Liberar Cupom] Erro:", err);
    return NextResponse.json({ error: "Erro ao liberar cupom" }, { status: 500 });
  }
}
