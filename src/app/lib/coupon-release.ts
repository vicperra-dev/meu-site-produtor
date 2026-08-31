import { prisma } from "@/app/lib/prisma";
import { filterBookingCouponsEligibleForRelease, sortCouponsDeterministic } from "@/app/lib/coupon-selection";

/**
 * GO-H8 — Ao cancelar/recusar, NÃO restaurar cupons já resgatados (used=true).
 * O resgate consome definitivamente o cupom; cancelamento emite NOVO cupom REBOOK.
 * Aqui apenas desvincula cupons ainda não consumidos (legado / edge cases).
 */
export async function releaseBookingCouponsForAppointment(appointmentId: number): Promise<number> {
  const list = await prisma.coupon.findMany({
    where: { appointmentId, used: false },
  });
  const eligible = filterBookingCouponsEligibleForRelease(list);
  const sorted = sortCouponsDeterministic(eligible);
  let n = 0;
  for (const c of sorted) {
    // Nunca reverter used — GO-H8 integridade
    await prisma.coupon.update({
      where: { id: c.id },
      data: {
        appointmentId: null,
      },
    });
    n++;
    console.log(`[CupomRelease] Cupom ${c.code} desvinculado sem restaurar (agendamento ${appointmentId})`);
  }
  return n;
}
