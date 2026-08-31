import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/auth";

/**
 * Endpoint para corrigir cupons antigos:
 * 1) Cupons marcados como usados associados a agendamentos pendentes/cancelados → liberar
 * 2) Cupons com appointmentId e usedBy null → preencher usedBy com appointment.userId (para aparecer na Minha Conta e no admin)
 */
export async function POST() {
  try {
    await requireAdmin();

    // --- Parte 1: cupons usados com appointmentId ---
    const cuponsComProblema = await prisma.coupon.findMany({
      where: {
        used: true,
        appointmentId: { not: null },
      },
    });

    console.log(`[Corrigir Cupons] Encontrados ${cuponsComProblema.length} cupons com possível problema (usados)`);

    const appointmentIds = cuponsComProblema
      .map(c => c.appointmentId)
      .filter((id): id is number => id !== null);

    const appointments = appointmentIds.length > 0 ? await prisma.appointment.findMany({
      where: { id: { in: appointmentIds } },
      select: {
        id: true,
        status: true,
        userId: true,
      },
    }) : [];

    const appointmentsMap = new Map(appointments.map(a => [a.id, a]));

    let corrigidos = 0;
    let liberados = 0;

    for (const cupom of cuponsComProblema) {
      if (!cupom.appointmentId || !appointmentsMap.has(cupom.appointmentId)) continue;

      const agendamento = appointmentsMap.get(cupom.appointmentId)!;

      if (agendamento.status === "pendente" || agendamento.status === "cancelado" || agendamento.status === "recusado") {
        await prisma.coupon.update({
          where: { id: cupom.id },
          data: {
            used: false,
            usedAt: null,
            usedBy: null,
            appointmentId: agendamento.status === "cancelado" || agendamento.status === "recusado" ? null : cupom.appointmentId,
          },
        });
        liberados++;
        console.log(`[Corrigir Cupons] ✅ Cupom ${cupom.code} liberado (agendamento ${agendamento.status})`);
      } else if (agendamento.status === "aceito" || agendamento.status === "confirmado") {
        corrigidos++;
        console.log(`[Corrigir Cupons] ✓ Cupom ${cupom.code} está correto (agendamento ${agendamento.status})`);
      }
    }

    // --- Parte 2: cupons com appointmentId e usedBy null (ex.: reembolso antigo) → preencher usedBy ---
    const cuponsSemUsedBy = await prisma.coupon.findMany({
      where: {
        appointmentId: { not: null },
        usedBy: null,
      },
    });

    const idsAppointment2 = cuponsSemUsedBy
      .map(c => c.appointmentId)
      .filter((id): id is number => id !== null);
    const appointments2 = idsAppointment2.length > 0 ? await prisma.appointment.findMany({
      where: { id: { in: idsAppointment2 } },
      select: { id: true, userId: true },
    }) : [];
    const mapApp2 = new Map(appointments2.map(a => [a.id, a]));

    let preenchidos = 0;
    for (const cupom of cuponsSemUsedBy) {
      if (!cupom.appointmentId || !mapApp2.has(cupom.appointmentId)) continue;
      const userId = mapApp2.get(cupom.appointmentId)!.userId;
      if (!userId) continue;
      await prisma.coupon.update({
        where: { id: cupom.id },
        data: { usedBy: userId },
      });
      preenchidos++;
      console.log(`[Corrigir Cupons] usedBy preenchido: ${cupom.code} → userId ${userId}`);
    }

    return NextResponse.json({
      success: true,
      message: `Correção concluída: ${liberados} cupons liberados, ${corrigidos} verificados, ${preenchidos} com usedBy preenchido`,
      liberados,
      corrigidos,
      preenchidos,
      total: cuponsComProblema.length,
    });
  } catch (err: any) {
    if (err.message === "Acesso negado" || err.message === "Não autenticado") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }
    console.error("[Corrigir Cupons] Erro:", err);
    return NextResponse.json({ error: "Erro ao corrigir cupons" }, { status: 500 });
  }
}
