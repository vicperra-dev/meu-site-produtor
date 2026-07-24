import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/auth";
import { repairOrphanAppointmentServices } from "@/app/lib/ensure-appointment-services";
import { updateServiceFields } from "@/app/lib/domain/workflow";
import { z } from "zod";

const updateSchema = z.object({
  status: z.string().optional(),
  deliveryAudioUrl: z.string().optional(),
  deliveryAudioFormat: z.enum(["wav", "mp3", "zip"]).optional(),
});

const NO_STORE = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
};

/**
 * GET puro da autoridade Service.
 * Repair opcional via ?repair=1 (usa ensureServices — sem lógica duplicada de create).
 */
export async function GET(req: Request) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(req.url);
    let repaired = 0;
    if (searchParams.get("repair") === "1") {
      repaired = await repairOrphanAppointmentServices();
    }

    const servicos = await prisma.service.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            nomeArtistico: true,
            email: true,
          },
        },
        appointment: {
          select: {
            id: true,
            data: true,
            status: true,
            tipo: true,
            observacoes: true,
          },
        },
      },
    });

    const aptIds = [
      ...new Set(
        servicos
          .map((s) => s.appointmentId)
          .filter((id): id is number => id != null)
      ),
    ];
    const payments =
      aptIds.length > 0
        ? await prisma.payment.findMany({
            where: {
              OR: [
                { appointmentId: { in: aptIds } },
                // carrinho: appointmentIds JSON — filtrado em memória abaixo
              ],
            },
            select: {
              id: true,
              amount: true,
              status: true,
              paymentMethod: true,
              appointmentId: true,
              appointmentIds: true,
            },
          })
        : [];

    const paymentByApt = new Map<number, (typeof payments)[number]>();
    for (const p of payments) {
      if (p.appointmentId != null && !paymentByApt.has(p.appointmentId)) {
        paymentByApt.set(p.appointmentId, p);
      }
      let ids: unknown = p.appointmentIds;
      if (typeof ids === "string") {
        try {
          ids = JSON.parse(ids);
        } catch {
          ids = null;
        }
      }
      if (Array.isArray(ids)) {
        for (const raw of ids) {
          const id = Number(raw);
          if (Number.isFinite(id) && !paymentByApt.has(id)) {
            paymentByApt.set(id, p);
          }
        }
      }
    }

    const paymentIds = [...new Set([...paymentByApt.values()].map((p) => p.id))];
    const coupons =
      paymentIds.length > 0
        ? await prisma.coupon.findMany({
            where: { paymentId: { in: paymentIds } },
            select: {
              id: true,
              code: true,
              couponType: true,
              serviceType: true,
              used: true,
              paymentId: true,
            },
          })
        : [];
    const couponsByPayment = new Map<string, typeof coupons>();
    for (const c of coupons) {
      if (!c.paymentId) continue;
      const list = couponsByPayment.get(c.paymentId) || [];
      list.push(c);
      couponsByPayment.set(c.paymentId, list);
    }

    const enriched = servicos.map((s) => {
      const payment =
        s.appointmentId != null ? paymentByApt.get(s.appointmentId) || null : null;
      const rawCoupons = payment ? couponsByPayment.get(payment.id) || [] : [];
      return {
        ...s,
        payment,
        coupons: rawCoupons.map((c) => ({
          id: c.id,
          code: c.code,
          type: c.serviceType || c.couponType,
          status: c.used ? "utilizado" : "criado",
        })),
        observacoes: s.appointment?.observacoes || s.description || null,
      };
    });

    return NextResponse.json({ servicos: enriched, repaired }, { headers: NO_STORE });
  } catch (err: any) {
    if (err.message === "Acesso negado" || err.message === "Não autenticado") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }
    return NextResponse.json({ error: "Erro ao buscar serviços" }, { status: 500 });
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
    const validation = updateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    const result = await updateServiceFields({
      serviceId: id,
      status: validation.data.status,
      deliveryAudioUrl: validation.data.deliveryAudioUrl,
      deliveryAudioFormat: validation.data.deliveryAudioFormat,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.httpStatus });
    }

    return NextResponse.json({
      servico: result.data.servico,
      alreadyProcessed: result.alreadyProcessed,
    });
  } catch (err: any) {
    if (err.message === "Acesso negado" || err.message === "Não autenticado") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }
    return NextResponse.json({ error: "Erro ao atualizar serviço" }, { status: 500 });
  }
}

/**
 * GO-H8B — exclusão isolada de Service removida.
 * Service não é entidade raiz; use cancelamento (status) ou purgeOrderTree do Pedido Raiz.
 */
export async function DELETE() {
  try {
    await requireAdmin();
    return NextResponse.json(
      {
        error:
          "Exclusão isolada de Service não é permitida. Interrompa via status (cancelado) ou limpe o Pedido Raiz (purgeOrderTree / Homologação).",
        code: "SERVICE_NOT_ROOT",
      },
      { status: 409 }
    );
  } catch (err: any) {
    if (err.message === "Acesso negado" || err.message === "Não autenticado") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }
    return NextResponse.json({ error: "Erro ao excluir serviço" }, { status: 500 });
  }
}
