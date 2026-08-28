/**
 * Idempotência de efeitos pós-pagamento aprovado (sem banco / Asaas).
 */
import assert from "node:assert/strict";
import {
  decideCouponFulfillmentOp,
  decidePaymentSlotAction,
  isReusableAppointmentStatus,
  missingServiceCount,
  shouldSendFulfillmentEmails,
} from "../src/app/lib/payment-appointment-idempotency";
import { recordApprovedPaymentCouponUse } from "../src/app/lib/promotional-coupon";

function ok(label: string) {
  console.log("PASS", label);
}

{
  assert.equal(decidePaymentSlotAction({ ownReusableId: null, foreignReservingId: null }).action, "create");
  ok("1 pagamento normal sem cupom: slot livre → criar Appointment");
}

{
  const slot = decidePaymentSlotAction({ ownReusableId: null, foreignReservingId: null });
  const coupon = decideCouponFulfillmentOp({
    hasCoupon: true,
    useCount: 0,
    used: false,
    appointmentId: null,
    serviceId: null,
    targetAppointmentId: 10,
    targetServiceId: "svc-1",
  });
  assert.equal(slot.action, "create");
  assert.equal(coupon, "increment");
  ok("2 pagamento com desconto parcial: criar + incrementar cupom uma vez");
}

{
  assert.equal(
    decidePaymentSlotAction({ ownReusableId: null, foreignReservingId: null }).action,
    "create"
  );
  assert.equal(missingServiceCount(0, 1), 1);
  ok("3/4 Payment aprovado cria Appointment e Service faltantes");
}

{
  assert.equal(
    decideCouponFulfillmentOp({
      hasCoupon: true,
      useCount: 0,
      used: false,
      appointmentId: null,
      serviceId: null,
      targetAppointmentId: 1,
      targetServiceId: "s1",
    }),
    "increment"
  );
  ok("5/6 vincula e consome cupom na primeira execução");
}

{
  const secondSlot = decidePaymentSlotAction({
    ownReusableId: 77,
    foreignReservingId: null,
  });
  const secondCoupon = decideCouponFulfillmentOp({
    hasCoupon: true,
    useCount: 1,
    used: true,
    appointmentId: 77,
    serviceId: "s1",
    targetAppointmentId: 77,
    targetServiceId: "s1",
  });
  const emails = shouldSendFulfillmentEmails({
    sendEmailsRequested: true,
    createdAppointmentThisRun: false,
  });
  assert.equal(secondSlot.action, "reuse");
  assert.equal(secondCoupon, "none");
  assert.equal(emails, false);
  assert.equal(missingServiceCount(1, 1), 0);
  ok("7/8 segunda execução e webhook duplicado: reuse, sem serviço extra, sem email, sem novo uso");
}

{
  assert.equal(missingServiceCount(0, 1), 1);
  const afterApt = decidePaymentSlotAction({ ownReusableId: 5, foreignReservingId: null });
  assert.equal(afterApt.action, "reuse");
  assert.equal(missingServiceCount(0, 1), 1);
  ok("9/10 falha após Appointment: retry reutiliza e cria só Service faltante");
}

{
  const bind = decideCouponFulfillmentOp({
    hasCoupon: true,
    useCount: 1,
    used: true,
    appointmentId: null,
    serviceId: null,
    targetAppointmentId: 5,
    targetServiceId: "s1",
  });
  assert.equal(bind, "bind_only");
  ok("11/12 falha após Service antes do vínculo: retry só faz bind, sem novo uso");
}

{
  assert.equal(
    decidePaymentSlotAction({ ownReusableId: 1, foreignReservingId: 99 }).action,
    "reuse"
  );
  assert.equal(
    decidePaymentSlotAction({ ownReusableId: null, foreignReservingId: 99 }).action,
    "skip_foreign"
  );
  assert.equal(isReusableAppointmentStatus("pendente"), true);
  assert.equal(isReusableAppointmentStatus("cancelado"), false);
  ok("14/15 Minha Conta/admin: reuse do próprio slot; não cria segundo registro; estrangeiro não é sobrescrito");
}

const partnership = {
  assignedUserId: "artist-1",
  userPlanId: null,
  parentCouponId: null,
  originAppointmentId: null,
  couponType: "desconto",
  discountType: "fixed" as const,
  discountValue: 50,
  applicableServiceTypes: JSON.stringify(["*"]),
  isActive: true,
  used: false,
  useCount: 0,
  maxUses: 1,
  appointmentId: null as number | null,
  serviceId: null as string | null,
  usedBy: null as string | null,
};

void (async () => {
  const stored: Record<string, unknown>[] = [];
  let row = { id: "c1", ...partnership };
  const fakeDb = {
    coupon: {
      findUnique: async () => ({ ...row }),
      updateMany: async ({
        where,
        data,
      }: {
        where: Record<string, unknown>;
        data: Record<string, unknown>;
      }) => {
        if (data.useCount && typeof data.useCount === "object") {
          if (row.used) return { count: 0 };
          stored.push({ ...data, kind: "increment" });
          row = {
            ...row,
            used: true,
            useCount: 1,
            appointmentId: (data.appointmentId as number) ?? row.appointmentId,
            serviceId: (data.serviceId as string) ?? row.serviceId,
          };
          return { count: 1 };
        }
        stored.push({ ...data, kind: "bind", where });
        row = {
          ...row,
          appointmentId: (data.appointmentId as number) ?? row.appointmentId,
          serviceId: (data.serviceId as string) ?? row.serviceId,
        };
        return { count: 1 };
      },
      update: async ({ data }: { data: Record<string, unknown> }) => {
        row = { ...row, ...data };
        return row;
      },
    },
  };

  await recordApprovedPaymentCouponUse(fakeDb as never, {
    couponId: "c1",
    userId: "artist-1",
    appointmentId: 9,
    serviceId: "svc-a",
  });
  assert.equal(row.useCount, 1);
  const firstIncrements = stored.filter((s) => s.kind === "increment").length;
  assert.equal(firstIncrements, 1);

  await recordApprovedPaymentCouponUse(fakeDb as never, {
    couponId: "c1",
    userId: "artist-1",
    appointmentId: 9,
    serviceId: "svc-a",
  });
  assert.equal(row.useCount, 1);
  assert.equal(stored.filter((s) => s.kind === "increment").length, 1);
  ok("13 useCount não incrementa duas vezes; retry só faz bind se necessário");

  console.log(JSON.stringify({ reportId: "approved-payment-idempotency-smoke", pass: true }, null, 2));
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
