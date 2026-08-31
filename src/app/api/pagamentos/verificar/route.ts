import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getAsaasApiKey } from "@/app/lib/env";
import { getSessionUser } from "@/app/lib/auth";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function publicPending(operationId: string) {
  return NextResponse.json({
    status: "pending",
    processed: false,
    effectsReady: false,
    operationId,
  });
}

/**
 * Verifica status de pagamento.
 * GO-04A.2 RC-09: operationId para página de sucesso.
 * GO-04A.3 RC-07:
 *  - operationId: capability token temporário (PaymentMetadata + expiresAt); resposta mínima.
 *  - paymentId: exige autenticação; usuário só o próprio; admin todos.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const paymentId = searchParams.get("paymentId");
    const operationId = searchParams.get("operationId");

    if (!paymentId && !operationId) {
      return NextResponse.json(
        { error: "ID do pagamento ou operationId é obrigatório" },
        { status: 400 }
      );
    }

    const sessionUser = await getSessionUser();
    const isAdmin = sessionUser?.role === "ADMIN";

    if (operationId) {
      if (!UUID_RE.test(operationId)) {
        return publicPending(operationId);
      }

      const meta = await prisma.paymentMetadata.findUnique({
        where: { id: operationId },
        select: {
          id: true,
          asaasId: true,
          userId: true,
          metadata: true,
          expiresAt: true,
        },
      });

      if (!meta) {
        return publicPending(operationId);
      }

      // Token temporário expirado — não vazar detalhes
      if (meta.expiresAt < new Date()) {
        return publicPending(operationId);
      }

      // Sem sessão: apenas capability operationId (não expirado) → payload mínimo
      // Com sessão: owner ou admin podem ver um pouco mais; outros → mínimo
      const isOwner = Boolean(sessionUser && sessionUser.id === meta.userId);
      const canSeeDetails = isAdmin || isOwner;

      let tipo = "agendamento";
      try {
        const parsed = JSON.parse(meta.metadata || "{}") as { tipo?: string };
        if (
          parsed.tipo === "plano" ||
          parsed.tipo === "carrinho" ||
          parsed.tipo === "agendamento"
        ) {
          tipo = parsed.tipo;
        }
      } catch {
        // metadata inválido — manter default
      }

      const payment = meta.asaasId
        ? await prisma.payment.findFirst({
            where: {
              OR: [{ asaasId: meta.asaasId }, { mercadopagoId: meta.asaasId }],
            },
            orderBy: { createdAt: "desc" },
          })
        : null;

      if (!payment || payment.status !== "approved") {
        const base = {
          status: payment?.status || "pending",
          processed: false,
          effectsReady: false,
          operationId,
        };
        if (!canSeeDetails) return NextResponse.json(base);
        return NextResponse.json({
          ...base,
          paymentId: payment?.id ?? null,
          tipo,
        });
      }

      let effectsReady = false;
      if (tipo === "plano") {
        const userPlan = await prisma.userPlan.findFirst({
          where: {
            userId: payment.userId,
            status: { in: ["active", "pending"] },
            ...(payment.planId ? { planId: payment.planId } : {}),
          },
          orderBy: { createdAt: "desc" },
        });
        effectsReady = Boolean(userPlan);
      } else {
        effectsReady = Boolean(
          payment.appointmentId ||
            (payment.appointmentIds != null &&
              (Array.isArray(payment.appointmentIds)
                ? payment.appointmentIds.length > 0
                : String(payment.appointmentIds).length > 2))
        );
      }

      // Público / não-owner: só o necessário para a página de sucesso
      if (!canSeeDetails) {
        return NextResponse.json({
          status: payment.status,
          processed: true,
          effectsReady,
          operationId,
        });
      }

      return NextResponse.json({
        status: payment.status,
        processed: true,
        effectsReady,
        operationId,
        paymentId: payment.id,
        amount: payment.amount,
        tipo,
      });
    }

    // --- paymentId: autenticação obrigatória ---
    if (!sessionUser) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const payment = await prisma.payment.findFirst({
      where: {
        OR: [{ asaasId: paymentId! }, { mercadopagoId: paymentId! }],
      },
    });

    if (payment) {
      if (!isAdmin && payment.userId !== sessionUser.id) {
        return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
      }

      const userPlan = await prisma.userPlan.findFirst({
        where: {
          userId: payment.userId,
          planId: payment.planId || undefined,
          status: { in: ["active", "pending"] },
        },
        orderBy: { createdAt: "desc" },
      });

      return NextResponse.json({
        status: payment.status,
        paymentId: payment.id,
        amount: payment.amount,
        processed: true,
        effectsReady: Boolean(
          userPlan || payment.appointmentId || payment.appointmentIds
        ),
        userPlan: userPlan
          ? {
              id: userPlan.id,
              planId: userPlan.planId,
              planName: userPlan.planName,
              status: userPlan.status,
            }
          : null,
      });
    }

    // Lookup Asaas remoto: somente admin (evita uso como proxy aberto)
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Pagamento não encontrado" },
        { status: 404 }
      );
    }

    const apiKey = getAsaasApiKey();
    if (!apiKey) {
      return NextResponse.json(
        { error: "API key não configurada" },
        { status: 500 }
      );
    }

    const isProduction = apiKey.startsWith("$aact_prod_");
    const apiUrl = isProduction
      ? "https://www.asaas.com/api/v3"
      : "https://sandbox.asaas.com/api/v3";

    try {
      const response = await fetch(`${apiUrl}/payments/${paymentId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          access_token: apiKey,
        },
      });

      if (response.ok) {
        const data = await response.json();
        return NextResponse.json({
          status: data.status,
          paymentId: data.id,
          amount: data.value,
          processed: false,
          effectsReady: false,
        });
      }
      return NextResponse.json(
        { error: "Pagamento não encontrado" },
        { status: 404 }
      );
    } catch (error: unknown) {
      console.error("[Verificar Pagamento] Erro ao buscar no Asaas:", error);
      return NextResponse.json(
        { error: "Erro ao verificar pagamento" },
        { status: 500 }
      );
    }
  } catch (err: unknown) {
    console.error("[Verificar Pagamento] Erro:", err);
    return NextResponse.json(
      { error: "Erro interno ao verificar pagamento" },
      { status: 500 }
    );
  }
}
