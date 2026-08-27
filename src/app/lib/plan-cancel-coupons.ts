/**

 * GO-H12A — Benefícios efetivamente usufruídos + invalidação de cupons derivados.

 *

 * Regra (preserva direito do cliente):

 * - Cupom de plano usado + derivado (remarcação/reembolso) ainda disponível

 *   → NÃO conta como benefício usufruído; derivado é invalidado no cancelamento.

 * - Cupom de plano usado + derivado já utilizado (sem crédito aberto na cadeia)

 *   → conta como usufruído e entra no cálculo do reembolso.

 * - Cupom de plano usado + agendamento cancelado/recusado sem derivado ativo

 *   → NÃO conta (benefício revertido).

 * - Cupom de plano nunca usado → NÃO desconta.

 */

import { prisma } from "@/app/lib/prisma";

import { PLAN_CYCLE_SUBSTITUTED_REASON } from "@/app/lib/plan-definitions";



export const PLAN_CANCELLED_UNUSED_REASON = "plano_cancelado_cupom_nao_usado";

export const PLAN_CANCELLED_DERIVED_REASON = "plano_cancelado_derivado_nao_usado";



const TERMINAL_REVERTED = new Set(["cancelado", "recusado"]);

const ACTIVE_CONSUMED = new Set([

  "aceito",

  "confirmado",

  "em_andamento",

  "concluido",

]);



type CouponAvailRow = {

  id: string;

  used: boolean;

  expiresAt: Date | null;

  cancelReason: string | null;

  userRemovedAt: Date | null;

  couponCategory: string | null;

  couponType: string | null;

  appointmentId: number | null;

  originAppointmentId: number | null;

  parentCouponId: string | null;

};



function isDerivedCoupon(c: {

  couponCategory: string | null;

  couponType: string | null;

}): boolean {

  if (c.couponCategory === "reembolso") return true;

  const t = String(c.couponType || "").toLowerCase();

  return ["rebook", "refund", "remarcacao", "reembolso"].includes(t);

}



function isCouponStillAvailable(c: {

  used: boolean;

  expiresAt: Date | null;

  cancelReason: string | null;

  userRemovedAt: Date | null;

}): boolean {

  if (c.used) return false;

  if (c.userRemovedAt) return false;

  if (c.cancelReason === PLAN_CYCLE_SUBSTITUTED_REASON) return false;

  if (c.cancelReason === PLAN_CANCELLED_UNUSED_REASON) return false;

  if (c.cancelReason === PLAN_CANCELLED_DERIVED_REASON) return false;

  if (c.expiresAt && c.expiresAt.getTime() <= Date.now()) return false;

  return true;

}



async function loadDirectDerived(parentIds: string[]): Promise<CouponAvailRow[]> {

  if (parentIds.length === 0) return [];

  const rows = await prisma.coupon.findMany({

    where: { parentCouponId: { in: parentIds } },

    select: {

      id: true,

      used: true,

      expiresAt: true,

      cancelReason: true,

      userRemovedAt: true,

      couponCategory: true,

      couponType: true,

      appointmentId: true,

      originAppointmentId: true,

      parentCouponId: true,

    },

  });

  return rows.filter(isDerivedCoupon);

}



/** Todos os derivados na árvore (BFS via parentCouponId). */

export async function collectDerivedDescendants(

  rootCouponIds: string[]

): Promise<CouponAvailRow[]> {

  const found: CouponAvailRow[] = [];

  const seen = new Set<string>();

  let frontier = [...rootCouponIds];

  while (frontier.length > 0) {

    const children = await loadDirectDerived(frontier);

    frontier = [];

    for (const c of children) {

      if (seen.has(c.id)) continue;

      seen.add(c.id);

      found.push(c);

      frontier.push(c.id);

    }

  }

  return found;

}



async function appointmentIndicatesConsumption(

  aptId: number | null | undefined

): Promise<"consumed" | "reverted" | "unknown"> {

  if (aptId == null) return "unknown";

  const apt = await prisma.appointment.findUnique({

    where: { id: aptId },

    select: { status: true },

  });

  if (!apt) return "unknown";

  if (TERMINAL_REVERTED.has(apt.status)) return "reverted";

  if (ACTIVE_CONSUMED.has(apt.status)) return "consumed";

  return "unknown";

}



/**

 * Um benefício de plano conta como usufruído apenas se o valor foi efetivamente aproveitado.

 */

export async function isPlanBenefitEffectivelyConsumed(coupon: {

  id: string;

  used: boolean;

  appointmentId: number | null;

  originAppointmentId: number | null;

  cancelReason: string | null;

}): Promise<boolean> {

  if (!coupon.used) return false;

  if (coupon.cancelReason === PLAN_CYCLE_SUBSTITUTED_REASON) return false;



  const descendants = await collectDerivedDescendants([coupon.id]);



  // Crédito de remarcação/reembolso ainda aberto na cadeia → não usufruído.

  if (descendants.some((c) => isCouponStillAvailable(c))) return false;



  const usedLeaves = descendants.filter((c) => c.used);

  if (usedLeaves.length > 0) {

    for (const leaf of usedLeaves) {

      const leafChildren = descendants.filter((d) => d.parentCouponId === leaf.id);

      if (leafChildren.some((c) => isCouponStillAvailable(c))) continue;

      if (leafChildren.some((c) => c.used)) continue;

      const aptId = leaf.appointmentId ?? leaf.originAppointmentId;

      const state = await appointmentIndicatesConsumption(aptId);

      if (state === "consumed" || state === "unknown") return true;

    }

    // Todos os usos derivados revertidos sem crédito aberto

    return false;

  }



  const aptId = coupon.appointmentId ?? coupon.originAppointmentId;

  const state = await appointmentIndicatesConsumption(aptId);

  if (state === "reverted") return false;

  if (state === "consumed") return true;



  // Usado sem evidência de reversão → considera usufruído

  return true;

}



/**

 * Invalida cupons de plano não usados e derivados (toda a árvore) ainda disponíveis.

 */

export async function invalidatePlanCouponsOnCancel(userPlanId: string): Promise<{

  planCouponsInvalidated: number;

  derivedCouponsInvalidated: number;

}> {

  const now = new Date();

  const planCoupons = await prisma.coupon.findMany({

    where: { userPlanId },

    select: {

      id: true,

      used: true,

      appointmentId: true,

      originAppointmentId: true,

    },

  });

  const planIds = planCoupons.map((c) => c.id);



  const unusedPlan = await prisma.coupon.updateMany({

    where: {

      userPlanId,

      used: false,

      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],

      NOT: {

        cancelReason: {

          in: [

            PLAN_CYCLE_SUBSTITUTED_REASON,

            PLAN_CANCELLED_UNUSED_REASON,

            PLAN_CANCELLED_DERIVED_REASON,

          ],

        },

      },

    },

    data: {

      expiresAt: now,

      cancelReason: PLAN_CANCELLED_UNUSED_REASON,

    },

  });



  const descendants = await collectDerivedDescendants(planIds);



  // Órfãos: remarcação ligada ao mesmo agendamento do cupom de plano, sem parentCouponId.

  const aptIds = planCoupons

    .flatMap((c) => [c.appointmentId, c.originAppointmentId])

    .filter((id): id is number => id != null);

  let orphanDerived: CouponAvailRow[] = [];

  if (aptIds.length > 0) {

    const orphans = await prisma.coupon.findMany({

      where: {

        parentCouponId: null,

        userPlanId: null,

        OR: [

          { originAppointmentId: { in: aptIds } },

          { appointmentId: { in: aptIds } },

        ],

      },

      select: {

        id: true,

        used: true,

        expiresAt: true,

        cancelReason: true,

        userRemovedAt: true,

        couponCategory: true,

        couponType: true,

        appointmentId: true,

        originAppointmentId: true,

        parentCouponId: true,

      },

    });

    orphanDerived = orphans.filter(isDerivedCoupon);

  }



  const toInvalidateIds = [

    ...descendants.filter((c) => isCouponStillAvailable(c)).map((c) => c.id),

    ...orphanDerived.filter((c) => isCouponStillAvailable(c)).map((c) => c.id),

  ];

  const uniqueIds = [...new Set(toInvalidateIds)];



  let derivedCouponsInvalidated = 0;

  if (uniqueIds.length > 0) {

    const updated = await prisma.coupon.updateMany({

      where: { id: { in: uniqueIds }, used: false },

      data: {

        expiresAt: now,

        cancelReason: PLAN_CANCELLED_DERIVED_REASON,

      },

    });

    derivedCouponsInvalidated = updated.count;

  }



  return {

    planCouponsInvalidated: unusedPlan.count,

    derivedCouponsInvalidated,

  };

}



