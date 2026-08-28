/**
 * Smoke de cupom promocional/parceria + identidade canônica + financeiro.
 * Sem banco, sem Asaas, sem dados de produção.
 */
import assert from "node:assert/strict";
import {
  resolveCanonicalServiceId,
  isCanonicalServiceId,
  CHECKOUT_CATALOG,
} from "../src/app/lib/service-catalog";
import {
  applicableSubtotal,
  computePartnershipDiscount,
  couponHasRemainingUses,
  isPromotionalPartnershipCoupon,
  parseApplicableServiceTypes,
  partnershipAppliesToAllStudioServices,
  partnershipCheckoutError,
  recordApprovedPaymentCouponUse,
  serializeApplicableServiceTypes,
  PARTNERSHIP_ALL_SERVICES,
} from "../src/app/lib/promotional-coupon";
import { resolveCouponCheckoutMode } from "../src/app/lib/checkout-coupon-gates";

function ok(label: string) {
  console.log("PASS", label);
}

const partnershipSessao = {
  assignedUserId: "artist-1",
  userPlanId: null,
  parentCouponId: null,
  originAppointmentId: null,
  couponType: "desconto",
  discountType: "fixed" as const,
  discountValue: 50,
  applicableServiceTypes: JSON.stringify(["sessao"]),
  applicableDomain: "STUDIO",
  used: false,
  useCount: 0,
  maxUses: 1,
  isActive: true,
};

const partnershipAll = {
  ...partnershipSessao,
  applicableServiceTypes: serializeApplicableServiceTypes(null),
};

assert.equal(resolveCanonicalServiceId("sessao"), "sessao");
assert.equal(resolveCanonicalServiceId("Sessão"), "sessao");
assert.equal(resolveCanonicalServiceId("SESSAO"), "sessao");
assert.equal(resolveCanonicalServiceId("captação"), "captacao");
assert.equal(resolveCanonicalServiceId("Captação"), "captacao");
assert.equal(resolveCanonicalServiceId(""), null);
assert.equal(resolveCanonicalServiceId("nao-existe"), null);
assert.equal(isCanonicalServiceId("sessao"), true);
assert.equal(CHECKOUT_CATALOG.sessao.preco, 40);
assert.equal(CHECKOUT_CATALOG.captacao.preco, 55);
ok("1/5 identidade canônica por id, não por label");

{
  const a = computePartnershipDiscount({
    coupon: partnershipSessao,
    services: [{ id: "sessao", preco: 40, quantidade: 1 }],
    beats: [],
    cartTotal: 40,
  });
  assert.equal(a.discount, 40);
  assert.equal(a.finalTotal, 0);
  assert.equal(partnershipCheckoutError(partnershipSessao, "artist-1", [{ id: "sessao", preco: 40, quantidade: 1 }], []), null);
  ok("1 cupom Sessão + Sessão => válido; 40+50 => desconto 40 total 0");
}

{
  const err = partnershipCheckoutError(
    partnershipSessao,
    "artist-1",
    [{ id: "captacao", preco: 55, quantidade: 1 }],
    []
  );
  assert.ok(err);
  ok("2 cupom Sessão + Captação => rejeitado");
}

{
  assert.equal(partnershipAppliesToAllStudioServices(partnershipAll.applicableServiceTypes), true);
  assert.deepEqual(parseApplicableServiceTypes(JSON.stringify([PARTNERSHIP_ALL_SERVICES])), null);
  assert.equal(
    partnershipCheckoutError(partnershipAll, "artist-1", [{ id: "sessao", preco: 40, quantidade: 1 }], []),
    null
  );
  assert.equal(
    partnershipCheckoutError(partnershipAll, "artist-1", [{ id: "captacao", preco: 55, quantidade: 1 }], []),
    null
  );
  ok("3/4 cupom todos + Sessão e Captação => válido");
}

{
  const b = computePartnershipDiscount({
    coupon: { ...partnershipAll, discountValue: 50 },
    services: [{ id: "captacao", preco: 55, quantidade: 1 }],
    beats: [],
    cartTotal: 55,
  });
  assert.equal(b.discount, 50);
  assert.equal(b.finalTotal, 5);
  ok("6 serviço 55 + cupom 50 => 5");
}

{
  const c = computePartnershipDiscount({
    coupon: { ...partnershipSessao, discountValue: 40 },
    services: [{ id: "sessao", preco: 40, quantidade: 1 }],
    beats: [],
    cartTotal: 40,
  });
  assert.equal(c.finalTotal, 0);
  assert.equal(c.discount, 40);
  ok("7 serviço 40 + cupom 40 => 0");
}

{
  const d = computePartnershipDiscount({
    coupon: partnershipSessao,
    services: [{ id: "sessao", preco: 40, quantidade: 1 }],
    beats: [],
    cartTotal: 40,
  });
  assert.equal(d.discount, 40);
  assert.equal(d.finalTotal, 0);
  assert.ok(d.finalTotal >= 0);
  ok("8/9 40+50 => desconto efetivo 40, nunca negativo");
}

{
  const mixed = computePartnershipDiscount({
    coupon: partnershipSessao,
    services: [
      { id: "sessao", preco: 40, quantidade: 1 },
      { id: "captacao", preco: 55, quantidade: 1 },
    ],
    beats: [{ id: "beat1", preco: 100, quantidade: 1 }],
    cartTotal: 195,
  });
  assert.equal(applicableSubtotal(partnershipSessao, [
    { id: "sessao", preco: 40, quantidade: 1 },
    { id: "captacao", preco: 55, quantidade: 1 },
  ], [{ id: "beat1", preco: 100, quantidade: 1 }]), 40);
  assert.equal(mixed.discount, 40);
  assert.equal(mixed.finalTotal, 155);
  ok("10 desconto só no SKU elegível");
}

{
  const mode = resolveCouponCheckoutMode(partnershipSessao);
  assert.equal(mode, "discount");
  const serviceCoupon = {
    couponType: "agendamento",
    discountType: "service",
    serviceType: "sessao",
  };
  assert.equal(resolveCouponCheckoutMode(serviceCoupon), "service-redemption");
  ok("parceria não usa resgate de serviço; cupom de plano/serviço exclusivo permanece");
}

{
  assert.ok(partnershipCheckoutError(partnershipSessao, "other", [{ id: "sessao", preco: 40, quantidade: 1 }], []));
  assert.ok(
    partnershipCheckoutError(
      { ...partnershipSessao, isActive: false },
      "artist-1",
      [{ id: "sessao", preco: 40, quantidade: 1 }],
      []
    )
  );
  assert.equal(couponHasRemainingUses({ ...partnershipSessao, used: true }), false);
  assert.equal(couponHasRemainingUses({ ...partnershipSessao, useCount: 1, maxUses: 1 }), false);
  ok("21/23/24 outro usuário, inativo e esgotado rejeitam (expiração é gate de validate-coupon-checkout)");
}

{
  const planPercent = {
    assignedUserId: "artist-1",
    userPlanId: "plan-1",
    parentCouponId: null,
    originAppointmentId: null,
    couponType: "plano",
    discountType: "percent",
    discountValue: 10,
  };
  assert.equal(isPromotionalPartnershipCoupon(planPercent), false);
  assert.equal(resolveCouponCheckoutMode(planPercent), "discount");
  ok("25 cupom percentual de plano não é parceria e continua no checkout de desconto");
}

{
  const pct = computePartnershipDiscount({
    coupon: {
      ...partnershipAll,
      discountType: "percent",
      discountValue: 100,
    },
    services: [{ id: "sessao", preco: 40, quantidade: 1 }],
    beats: [],
    cartTotal: 40,
  });
  assert.equal(pct.finalTotal, 0);
  assert.equal(pct.discount, 40);
  ok("26 percentual 100% zera sem negativo");
}

{
  assert.equal(isPromotionalPartnershipCoupon(partnershipSessao), true);
  ok("H12/H12A isolados: parceria não tem userPlanId/parent/origin");
}

void (async () => {
  const stored: Record<string, unknown>[] = [];
  const couponRow = {
    id: "c1",
    ...partnershipSessao,
    isActive: true,
    used: false,
    useCount: 0,
    maxUses: 3,
  };
  const fakeDb = {
    coupon: {
      findUnique: async () => ({ ...couponRow, useCount: stored.length ? 1 : 0 }),
      updateMany: async ({ data }: { data: Record<string, unknown> }) => {
        stored.push(data);
        return { count: 1 };
      },
      update: async () => ({}),
    },
  };
  await recordApprovedPaymentCouponUse(fakeDb as never, {
    couponId: "c1",
    userId: "artist-1",
    appointmentId: 77,
    serviceId: "svc-sessao",
  });
  assert.equal(stored[0]?.appointmentId, 77);
  assert.equal(stored[0]?.serviceId, "svc-sessao");
  assert.equal(stored[0]?.useCount && typeof stored[0].useCount === "object", true);
  ok("consumo de parceria persiste appointmentId e serviceId (rastreio admin)");
  console.log(JSON.stringify({ reportId: "promotional-coupon-checkout-smoke", pass: true }, null, 2));
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
