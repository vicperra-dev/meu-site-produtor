import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/auth";

export async function GET() {
  try {
    await requireAdmin();

    const usuarios = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        nomeCompleto: true,
        nomeArtistico: true,
        email: true,
        telefone: true,
        cpf: true,
        pais: true,
        estado: true,
        cidade: true,
        bairro: true,
        dataNascimento: true,
        estilosMusicais: true,
        nacionalidade: true,
        foto: true,
        role: true,
        blocked: true,
        blockedAt: true,
        blockedReason: true,
        createdAt: true,
        _count: {
          select: {
            appointments: true,
            payments: true,
            userPlans: true,
            services: true,
          },
        },
      },
    });

    // Buscar planos e cupons de cada usuário (com fallback se subscription/loginLog falhar em produção)
    let usuariosComPlanosECupons: any[];
    try {
      usuariosComPlanosECupons = await Promise.all(
        usuarios.map(async (user) => {
          try {
            const planos = await prisma.userPlan.findMany({
              where: { userId: user.id },
              orderBy: { createdAt: "desc" },
              include: {
                subscription: {
                  select: {
                    id: true,
                    status: true,
                    paymentMethod: true,
                    billingDay: true,
                    nextBillingDate: true,
                    lastBillingDate: true,
                  },
                },
              },
            });
            const agendamentosDoUsuario = await prisma.appointment.findMany({
              where: { userId: user.id },
              select: { id: true },
            });
            const agendamentosIds = agendamentosDoUsuario.map((a) => a.id);
            const cupons = await prisma.coupon.findMany({
              where: {
                OR: [
                  { usedBy: user.id },
                  { userPlanId: { in: planos.map((p) => p.id) } },
                  { appointmentId: { in: agendamentosIds.length > 0 ? agendamentosIds : [-1] } },
                ],
              },
              orderBy: { createdAt: "desc" },
            });
            return { ...user, planos, cupons };
          } catch (_e) {
            return { ...user, planos: [], cupons: [] };
          }
        })
      );
    } catch (e) {
      console.error("[Admin Usuarios] Erro ao buscar planos/cupons:", e);
      usuariosComPlanosECupons = usuarios.map((u) => ({ ...u, planos: [], cupons: [] }));
    }

    // Buscar últimos logins de cada usuário
    const usuariosComLogins = await Promise.all(
      usuariosComPlanosECupons.map(async (user: any) => {
        try {
          const lastLogin = await prisma.loginLog.findFirst({
            where: { userId: user.id, success: true },
            orderBy: { createdAt: "desc" },
            select: {
              ipAddress: true,
              userAgent: true,
              createdAt: true,
            },
          });

          const loginCount = await prisma.loginLog.count({
            where: { userId: user.id, success: true },
          });

          const failedLoginCount = await prisma.loginLog.count({
            where: { userId: user.id, success: false },
          });

          return {
            ...user,
            lastLogin,
            loginCount,
            failedLoginCount,
          };
        } catch (e) {
          return { ...user, lastLogin: null, loginCount: 0, failedLoginCount: 0 };
        }
      })
    );

    return NextResponse.json({ usuarios: usuariosComLogins });
  } catch (err: any) {
    if (err.message === "Acesso negado" || err.message === "Não autenticado") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }
    console.error("[Admin Usuarios] GET error:", err?.message || err);
    return NextResponse.json(
      { error: err?.message || "Erro ao buscar usuários" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID é obrigatório" }, { status: 400 });
    }

    const body = await req.json();
    const { role, blocked, blockedReason } = body;

    const updateData: any = {};
    if (role !== undefined) updateData.role = role;
    if (blocked !== undefined) {
      updateData.blocked = blocked;
      if (blocked) {
        updateData.blockedAt = new Date();
        updateData.blockedReason = blockedReason || "Bloqueado pelo admin";
      } else {
        updateData.blockedAt = null;
        updateData.blockedReason = null;
      }
    }

    const usuario = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        nomeArtistico: true,
        email: true,
        role: true,
        blocked: true,
        blockedAt: true,
        blockedReason: true,
      },
    });

    return NextResponse.json({ usuario });
  } catch (err: any) {
    if (err.message === "Acesso negado" || err.message === "Não autenticado") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }
    return NextResponse.json({ error: "Erro ao atualizar usuário" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();

    const body = await req.json();
    const { userId, action } = body;

    if (!userId || action !== "reset-password") {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    // Gerar senha temporária aleatória
    const senhaTemporaria = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8).toUpperCase();
    const hash = await bcrypt.hash(senhaTemporaria, 10);

    // Atualizar senha do usuário
    await prisma.user.update({
      where: { id: userId },
      data: { senha: hash },
    });

    // Invalidar todas as sessões ativas
    await prisma.session.deleteMany({
      where: { userId },
    });

    return NextResponse.json({
      message: "Senha resetada com sucesso!",
      senhaTemporaria,
    });
  } catch (err: any) {
    if (err.message === "Acesso negado" || err.message === "Não autenticado") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }
    return NextResponse.json({ error: "Erro ao resetar senha" }, { status: 500 });
  }
}
