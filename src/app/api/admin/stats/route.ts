import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/auth";

export async function GET() {
  try {
    await requireAdmin();

    // Contar estatísticas (com tratamento de erro se modelos não existirem ainda)
    let appointments = 0;
    let appointmentsPendente = 0;
    let appointmentsAceitos = 0;
    let appointmentsCancelados = 0;
    let appointmentsRecusados = 0;
    let appointmentsEmAndamento = 0;
    let appointmentsConcluidos = 0;
    let users = 0;
    let payments = 0;
    let activePlans = 0;
    let services = 0;
    let pendingChats = 0;
    let pendingFaqs = 0;

    try {
      const [
        total,
        pendente,
        aceitos,
        cancelados,
        recusados,
        emAndamento,
        concluidos,
      ] = await Promise.all([
        prisma.appointment.count(),
        prisma.appointment.count({ where: { status: "pendente" } }),
        prisma.appointment.count({
          where: { status: { in: ["aceito", "confirmado"] } },
        }),
        prisma.appointment.count({ where: { status: "cancelado" } }),
        prisma.appointment.count({ where: { status: "recusado" } }),
        prisma.appointment.count({ where: { status: "em_andamento" } }),
        prisma.appointment.count({ where: { status: "concluido" } }),
      ]);
      appointments = total;
      appointmentsPendente = pendente;
      appointmentsAceitos = aceitos;
      appointmentsCancelados = cancelados;
      appointmentsRecusados = recusados;
      appointmentsEmAndamento = emAndamento;
      appointmentsConcluidos = concluidos;
    } catch (e) {}

    try {
      users = await prisma.user.count();
    } catch (e) {}

    try {
      payments = await prisma.payment.count({
        where: { status: "approved" },
      });
    } catch (e) {}

    try {
      activePlans = await prisma.userPlan.count({
        where: { status: "active" },
      });
    } catch (e) {}

    try {
      services = await prisma.service.count();
    } catch (e) {}

    try {
      pendingChats = await prisma.chatSession.count({
        where: { humanRequested: true, adminAccepted: false },
      });
    } catch (e) {}

    try {
      pendingFaqs = await prisma.userQuestion.count({
        where: { status: "pendente" },
      });
    } catch (e) {}

    return NextResponse.json(
      {
        appointments,
        appointmentsPendente,
        appointmentsAceitos,
        appointmentsCancelados,
        appointmentsRecusados,
        appointmentsEmAndamento,
        appointmentsConcluidos,
        users,
        payments,
        activePlans,
        services,
        pendingChats,
        pendingFaqs,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
          Pragma: "no-cache",
        },
      }
    );
  } catch (err: any) {
    console.error("Erro ao buscar stats:", err);
    if (err.message === "Acesso negado" || err.message === "Não autenticado") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }
    return NextResponse.json({ error: "Erro ao buscar estatísticas" }, { status: 500 });
  }
}
