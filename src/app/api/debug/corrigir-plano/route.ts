import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/auth";

// Endpoint para corrigir o endDate do plano (apenas admin)
export async function POST() {
  try {
    await requireAdmin();

    // Buscar o plano mais recente
    const plano = await prisma.userPlan.findFirst({
      orderBy: { createdAt: "desc" },
    });

    if (!plano) {
      return NextResponse.json({ error: "Nenhum plano encontrado" }, { status: 404 });
    }

    // Calcular endDate correto baseado no startDate
    const startDate = new Date(plano.startDate);
    const endDate = new Date(startDate);
    
    if (plano.modo === "mensal") {
      // Adicionar 1 mês de forma segura
      const ano = startDate.getFullYear();
      const mes = startDate.getMonth();
      const dia = startDate.getDate();
      
      // Calcular próximo mês
      let novoMes = mes + 1;
      let novoAno = ano;
      
      if (novoMes > 11) {
        novoMes = 0;
        novoAno++;
      }
      
      // Criar nova data com o mesmo dia do mês seguinte
      // Se o dia não existir no mês seguinte (ex: 31/01 -> 31/02), usar o último dia do mês
      const ultimoDiaDoMes = new Date(novoAno, novoMes + 1, 0).getDate();
      const diaFinal = Math.min(dia, ultimoDiaDoMes);
      
      endDate.setFullYear(novoAno, novoMes, diaFinal);
      endDate.setHours(startDate.getHours(), startDate.getMinutes(), startDate.getSeconds(), startDate.getMilliseconds());
    } else {
      endDate.setFullYear(startDate.getFullYear() + 1);
    }

    // Atualizar o plano
    const planoAtualizado = await prisma.userPlan.update({
      where: { id: plano.id },
      data: { endDate },
    });

    return NextResponse.json({
      success: true,
      plano: {
        id: planoAtualizado.id,
        planId: planoAtualizado.planId,
        startDate: planoAtualizado.startDate instanceof Date ? planoAtualizado.startDate.toISOString() : planoAtualizado.startDate,
        endDate: planoAtualizado.endDate instanceof Date ? planoAtualizado.endDate.toISOString() : planoAtualizado.endDate,
        modo: planoAtualizado.modo,
      },
      mensagem: "EndDate corrigido com sucesso",
    });
  } catch (err: any) {
    console.error("[Debug Corrigir Plano] Erro:", err);
    return NextResponse.json(
      { 
        error: err.message || "Erro ao corrigir plano",
        stack: err.stack
      },
      { status: 500 }
    );
  }
}
