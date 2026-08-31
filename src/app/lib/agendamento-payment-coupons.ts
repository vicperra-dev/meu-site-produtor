import { Prisma } from "@prisma/client";
import { prisma } from "@/app/lib/prisma";
import { expandPurchaseToServiceOrders } from "@/app/lib/service-orders";
import type { Coupon } from "@prisma/client";
import {
  isSymbolicAgendamentoCouponStyle,
  SYMBOLIC_AGENDAMENTO_BRL,
} from "@/app/lib/symbolic-payment";
import { createDomainCoupon } from "@/app/lib/domain/coupon-domain";
import { createServiceOrdersWithCoupons } from "@/app/lib/service-orders/persist";

export { SYMBOLIC_AGENDAMENTO_BRL, isSymbolicAgendamentoCouponStyle };

type ItemLine = { id?: string; nome?: string; quantidade?: number };

/** GO-H5: tipos atômicos = Ordens de Serviço a emitir como cupons. */
export function listCouponServiceTypesForAgendamentoItems(
  services: ItemLine[],
  beats: ItemLine[]
): string[] {
  const types = expandPurchaseToServiceOrders(services, beats).map((o) => o.serviceType);
  if (types.length === 0) {
    throw new Error("Nenhum serviço no pagamento para gerar cupons");
  }
  return types;
}

/**
 * Cria um cupom + Ordem de Serviço por tipo atômico liberado pelo pagamento.
 * Pipeline único (real = simbólico). Idempotente por paymentId.
 */
export async function createCouponsForAgendamentoItems(params: {
  userId: string;
  paymentId: string;
  appointmentId?: number | null;
  services: ItemLine[];
  beats: ItemLine[];
  isTestPayment: boolean;
}): Promise<Coupon[]> {
  const { userId, paymentId, services, beats, isTestPayment } = params;
  const serviceTypesToCreate = listCouponServiceTypesForAgendamentoItems(services, beats);

  const expiresAtBase = new Date();
  expiresAtBase.setDate(expiresAtBase.getDate() + (isTestPayment ? 30 : 365));

  try {
    return await prisma.$transaction(
      async (tx) => {
        const jaExistentes = await tx.coupon.findMany({
          where: { paymentId },
          orderBy: { createdAt: "asc" },
        });
        if (jaExistentes.length > 0) {
          await createServiceOrdersWithCoupons({
            db: tx,
            userId,
            paymentId,
            services,
            beats,
            coupons: jaExistentes,
          });
          return jaExistentes;
        }

        const coupons: Coupon[] = [];
        for (const serviceType of serviceTypesToCreate) {
          const c = await createDomainCoupon(tx, {
            canonicalType: isTestPayment ? "TEST" : "SERVICE",
            discountType: "service",
            discountValue: 0,
            serviceType,
            paymentId,
            assignedUserId: userId,
            expiresAt: new Date(expiresAtBase),
          });
          coupons.push(c);
        }

        await createServiceOrdersWithCoupons({
          db: tx,
          userId,
          paymentId,
          services,
          beats,
          coupons,
        });

        return coupons;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        timeout: 20_000,
      }
    );
  } catch (e) {
    const fallback = await prisma.coupon.findMany({
      where: { paymentId },
      orderBy: { createdAt: "asc" },
    });
    if (fallback.length > 0) return fallback;
    throw e;
  }
}
