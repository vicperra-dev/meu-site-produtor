import { NextResponse } from "next/server";
import { requireAuth } from "@/app/lib/auth";
import { canUseSymbolicSimulation } from "@/app/lib/symbolic-payment";
import { goLiveBlockIfNeeded } from "@/app/lib/go-live-maintenance";
import {
  createHomologationOrder,
  loadHomologationOrderSnapshot,
} from "@/app/lib/homologation/create-order";

/**
 * POST /api/admin/homologation/order
 * Pedido de Homologação — confirmação interna + processPaymentWebhook oficial.
 */
export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    if (!canUseSymbolicSimulation(user) || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }
    const blocked = goLiveBlockIfNeeded(user.role);
    if (blocked) return blocked;

    const body = await req.json().catch(() => ({}));
    const order = await createHomologationOrder({
      userId: user.id,
      userEmail: user.email,
      userName: user.nomeArtistico || user.email,
      servicos: body.servicos,
      beats: body.beats,
      data: body.data,
      hora: body.hora,
      duracaoMinutos: body.duracaoMinutos,
      tipo: body.tipo,
      observacoes: body.observacoes,
      cupomCode: body.cupomCode,
    });

    return NextResponse.json({ ok: true, order });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === "Não autenticado" || msg === "Acesso negado") {
      return NextResponse.json({ error: msg }, { status: 401 });
    }
    console.error("[homologation/order]", err);
    const status =
      msg.includes("horário") ||
      msg.includes("data") ||
      msg.includes("CARRINHO") ||
      msg.includes("ITEM_CATALOGO") ||
      msg.includes("QUANTIDADE")
        ? 400
        : msg.includes("Já existe")
          ? 409
          : 500;
    return NextResponse.json({ error: msg || "Erro ao criar Pedido de Homologação." }, { status });
  }
}

/**
 * GET /api/admin/homologation/order?paymentId=
 * Estado real no banco (painel Fluxo Real).
 */
export async function GET(req: Request) {
  try {
    const user = await requireAuth();
    if (!canUseSymbolicSimulation(user) || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }

    const url = new URL(req.url);
    const paymentId = url.searchParams.get("paymentId");
    if (!paymentId) {
      // lista recentes HOMOLOGATION do admin
      const { prisma } = await import("@/app/lib/prisma");
      const recent = await prisma.payment.findMany({
        where: {
          userId: user.id,
          OR: [
            { provider: { equals: "HOMOLOGATION", mode: "insensitive" } },
            { providerPaymentId: { startsWith: "homo_pay_" } },
          ],
        },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true, status: true, amount: true, providerPaymentId: true, createdAt: true },
      });
      return NextResponse.json({ ok: true, recent });
    }

    const order = await loadHomologationOrderSnapshot(paymentId);
    if (!order) {
      return NextResponse.json(
        { error: "Pedido de Homologação não encontrado." },
        { status: 404 }
      );
    }
    return NextResponse.json({ ok: true, order });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 401 });
  }
}
