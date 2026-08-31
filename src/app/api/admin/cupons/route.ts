import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/auth";

export async function GET() {
  try {
    await requireAdmin();

    const cupons = await prisma.coupon.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        userPlan: {
          select: {
            id: true,
            planId: true,
            planName: true,
            endDate: true,
            status: true,
            userId: true,
            user: {
              select: {
                nomeArtistico: true,
                email: true,
              },
            },
          },
        },
        payment: { select: { userId: true } },
        assignedUser: { select: { id: true, nomeArtistico: true, email: true } },
      },
    });

    // Buscar appointments manualmente para cupons que têm appointmentId
    const appointmentIds = cupons
      .map(c => c.appointmentId)
      .filter((id): id is number => id !== null);
    
    const appointments = appointmentIds.length > 0 ? await prisma.appointment.findMany({
      where: { id: { in: appointmentIds } },
      select: {
        id: true,
        data: true,
        userId: true,
        status: true,
        user: {
          select: {
            nomeArtistico: true,
            email: true,
          },
        },
      },
    }) : [];

    const appointmentsMap = new Map(appointments.map(a => [a.id, a]));

    // Buscar todos os userIds únicos para buscar usuários de uma vez
    const userIds = new Set<string>();
    cupons.forEach(cupom => {
      if (cupom.userPlan?.userId) userIds.add(cupom.userPlan.userId);
      if (cupom.usedBy) userIds.add(cupom.usedBy);
      if (cupom.assignedUserId) userIds.add(cupom.assignedUserId);
      if (cupom.payment?.userId) userIds.add(cupom.payment.userId);
      if (cupom.appointmentId && appointmentsMap.has(cupom.appointmentId)) {
        const appointment = appointmentsMap.get(cupom.appointmentId)!;
        if (appointment.userId) userIds.add(appointment.userId);
      }
    });

    // Buscar todos os usuários de uma vez
    const usuarios = await prisma.user.findMany({
      where: { id: { in: Array.from(userIds) } },
      select: {
        id: true,
        nomeArtistico: true,
        email: true,
      },
    });

    const usuariosMap = new Map(usuarios.map(u => [u.id, u]));

    // Mapear cupons para incluir informações do usuário e appointment
    const cuponsComUsuario = cupons.map(cupom => {
      let user = cupom.assignedUser ? usuariosMap.get(cupom.assignedUser.id) || cupom.assignedUser : null;
      let appointment = null;
      if (!user && cupom.userPlan?.userId && usuariosMap.has(cupom.userPlan.userId)) {
        user = usuariosMap.get(cupom.userPlan.userId)!;
      }
      if (!user && cupom.usedBy && usuariosMap.has(cupom.usedBy)) {
        user = usuariosMap.get(cupom.usedBy)!;
      }
      if (cupom.appointmentId && appointmentsMap.has(cupom.appointmentId)) {
        appointment = appointmentsMap.get(cupom.appointmentId)!;
        if (!user && appointment.userId && usuariosMap.has(appointment.userId)) {
          user = usuariosMap.get(appointment.userId)!;
        }
      }
      if (!user && cupom.payment?.userId && usuariosMap.has(cupom.payment.userId)) {
        user = usuariosMap.get(cupom.payment.userId)!;
      }

      return {
        ...cupom,
        user: user || {
          nomeArtistico: "Não associado",
          email: "N/A",
        },
        appointment: appointment || null,
      };
    });

    return NextResponse.json({ cupons: cuponsComUsuario });
  } catch (err: any) {
    if (err.message === "Acesso negado" || err.message === "Não autenticado") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }
    console.error("[Admin Cupons] Erro:", err);
    console.error("[Admin Cupons] Stack:", err.stack);
    return NextResponse.json({ error: "Erro ao buscar cupons" }, { status: 500 });
  }
}

/**
 * Exclui um cupom do banco (admin). Útil para cupons órfãos ou incorretos.
 */
export async function DELETE(req: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID do cupom é obrigatório" }, { status: 400 });
    }
    await prisma.coupon.delete({ where: { id } });
    return NextResponse.json({ success: true, message: "Cupom excluído do banco." });
  } catch (err: any) {
    if (err.message === "Acesso negado" || err.message === "Não autenticado") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }
    console.error("[Admin Cupons] Erro ao excluir:", err);
    return NextResponse.json(
      { error: err.message || "Erro ao excluir cupom." },
      { status: 500 }
    );
  }
}
