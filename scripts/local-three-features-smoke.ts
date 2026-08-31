/**
 * Smokes locais sem banco: analytics path + desconto de parceria por SKU.
 */
import assert from "node:assert/strict";
import {
  normalizePublicPagePath,
  shouldSkipTrackerPath,
  pagePathLabel,
  shouldRecordPageView,
  canPurgeVisitacaoStats,
  deleteAllPageViews,
} from "../src/app/lib/analytics-pageview";
import {
  applicableSubtotal,
  computePartnershipDiscount,
  couponHasRemainingUses,
  isPromotionalPartnershipCoupon,
  partnershipAppliesToAllStudioServices,
  parseApplicableServiceTypes,
  parsePartnershipFixedAmount,
  partnershipExpiryError,
  serializeApplicableServiceTypes,
  userMatchesPartnershipQuery,
} from "../src/app/lib/promotional-coupon";

function ok(label: string) {
  console.log("PASS", label);
}

assert.equal(normalizePublicPagePath("/planos?x=1"), "/planos");
assert.equal(normalizePublicPagePath("https://thouse-rec.com.br/agendamento"), "/agendamento");
assert.equal(normalizePublicPagePath("/planos/"), "/planos");
assert.equal(normalizePublicPagePath("/"), "/");
assert.equal(normalizePublicPagePath("/admin/estatisticas"), null);
assert.equal(normalizePublicPagePath("/api/analytics/pageview"), null);
assert.equal(normalizePublicPagePath("/icon.svg"), null);
assert.equal(shouldSkipTrackerPath("/admin"), true);
assert.equal(pagePathLabel("/"), "Home");
assert.equal(pagePathLabel("/planos"), "Planos");
ok("analytics: path por página, sem query, sem admin/api");

{
  const anonHome = shouldRecordPageView({ path: "/", userRole: null });
  assert.equal(anonHome.record, true);
  if (anonHome.record) assert.equal(anonHome.path, "/");

  const userPlanos = shouldRecordPageView({ path: "/planos", userRole: "USER" });
  assert.equal(userPlanos.record, true);
  if (userPlanos.record) assert.equal(userPlanos.path, "/planos");

  const adminHome = shouldRecordPageView({ path: "/", userRole: "ADMIN" });
  assert.equal(adminHome.record, false);
  if (!adminHome.record) assert.equal(adminHome.reason, "admin");

  const adminPlanos = shouldRecordPageView({ path: "/planos", userRole: "ADMIN" });
  assert.equal(adminPlanos.record, false);

  const adminPanel = shouldRecordPageView({
    path: "/admin/estatisticas",
    userRole: "USER",
  });
  assert.equal(adminPanel.record, false);
  if (!adminPanel.record) assert.equal(adminPanel.reason, "path");

  assert.equal(canPurgeVisitacaoStats({ role: "ADMIN" }), true);
  assert.equal(canPurgeVisitacaoStats({ role: "USER" }), false);
  assert.equal(canPurgeVisitacaoStats(null), false);
  ok("analytics: anônimo/USER registram; ADMIN e /admin não");
}

const partnership = {
  assignedUserId: "artist-1",
  userPlanId: null,
  parentCouponId: null,
  originAppointmentId: null,
  couponType: "desconto",
  discountType: "percent",
  discountValue: 20,
  applicableServiceTypes: JSON.stringify(["mix", "master"]),
  applicableDomain: "STUDIO",
  used: false,
  useCount: 0,
  maxUses: 3,
  isActive: true,
};

assert.equal(isPromotionalPartnershipCoupon(partnership), true);
assert.equal(
  isPromotionalPartnershipCoupon({ ...partnership, userPlanId: "plan-1" }),
  false
);
assert.equal(couponHasRemainingUses(partnership), true);
assert.equal(couponHasRemainingUses({ ...partnership, useCount: 3 }), false);
assert.equal(couponHasRemainingUses({ ...partnership, used: true }), false);
assert.equal(couponHasRemainingUses({ ...partnership, isActive: false }), false);
assert.equal(
  couponHasRemainingUses({ ...partnership, maxUses: null, useCount: 99 }),
  true
);
ok("parceria isolada de plano; usos 3 e ilimitado");

assert.deepEqual(parseApplicableServiceTypes('["mix","master"]'), ["mix", "master"]);
assert.equal(partnershipAppliesToAllStudioServices(JSON.stringify(["*"])), true);
assert.equal(serializeApplicableServiceTypes(null), JSON.stringify(["*"]));
const services = [
  { id: "sessao", preco: 40, quantidade: 1 },
  { id: "mix", preco: 110, quantidade: 1 },
  { id: "master", preco: 80, quantidade: 1 },
];
assert.equal(applicableSubtotal(partnership, services, []), 190);
const pct = computePartnershipDiscount({
  coupon: partnership,
  services,
  beats: [],
  cartTotal: 230,
});
assert.equal(pct.base, 190);
assert.equal(pct.discount, 38);
assert.equal(pct.finalTotal, 192);
ok("20% só em Mix+Master; sessão permanece integral");

const fixed = computePartnershipDiscount({
  coupon: {
    ...partnership,
    discountType: "fixed",
    discountValue: 100,
    applicableServiceTypes: JSON.stringify(["producao_completa"]),
  },
  services: [],
  beats: [{ id: "producao_completa", preco: 450, quantidade: 1 }],
  cartTotal: 450,
});
assert.equal(fixed.discount, 100);
assert.equal(fixed.finalTotal, 350);

const floor = computePartnershipDiscount({
  coupon: {
    ...partnership,
    discountType: "fixed",
    discountValue: 999,
    applicableServiceTypes: JSON.stringify(["mix"]),
  },
  services: [{ id: "mix", preco: 110, quantidade: 1 }],
  beats: [],
  cartTotal: 110,
});
assert.equal(floor.finalTotal, 0);
ok("R$ fixo e total nunca negativo");

{
  const ra = {
    id: "u1",
    nomeArtistico: "Raul Vits",
    nomeCompleto: "Raul Completo",
    email: "raul@example.com",
  };
  assert.equal(userMatchesPartnershipQuery(ra, "ra"), true);
  assert.equal(userMatchesPartnershipQuery(ra, "RAUL"), true);
  assert.equal(userMatchesPartnershipQuery(ra, "example.com"), true);
  assert.equal(userMatchesPartnershipQuery(ra, "zzz"), false);
  ok("autocomplete: artístico, completo e e-mail, case-insensitive");
}

{
  assert.equal(parsePartnershipFixedAmount("50").ok, true);
  assert.equal(parsePartnershipFixedAmount("50,00").ok, true);
  assert.equal(parsePartnershipFixedAmount("0").ok, false);
  assert.equal(parsePartnershipFixedAmount("-10").ok, false);
  assert.equal(parsePartnershipFixedAmount("10.999").ok, false);
  ok("valor fixo: >0, 2 casas, sem negativo");
}

{
  const now = new Date("2026-08-27T15:00:00.000-03:00");
  assert.ok(partnershipExpiryError("2026-08-27", now));
  assert.ok(partnershipExpiryError("2026-08-26", now));
  assert.equal(partnershipExpiryError("2026-08-28", now), null);
  assert.ok(partnershipExpiryError("2027-02-31", now));
  assert.ok(partnershipExpiryError("2027-04-31", now));
  assert.ok(partnershipExpiryError("2025-12-31", now));
  assert.ok(partnershipExpiryError("2027-02-29", now));
  ok("validade: futuro, ano>=2026, dia civil real");
}

assert.equal(
  couponHasRemainingUses({
    ...partnership,
    isActive: false,
    discountType: "fixed",
  }),
  false
);
ok("cupom desativado não tem usos restantes (checkout rejeita)");

assert.equal(
  isPromotionalPartnershipCoupon({
    ...partnership,
    discountType: "percent",
    userPlanId: "plan-1",
  }),
  false
);
ok("cupom de plano percentual não é parceria");

const purgeCalls: string[] = [];
const fakeDb = {
  pageView: {
    deleteMany: async () => {
      purgeCalls.push("pageView");
      return { count: 187 };
    },
  },
  user: {
    deleteMany: async () => {
      purgeCalls.push("user");
      return { count: 0 };
    },
  },
  payment: {
    deleteMany: async () => {
      purgeCalls.push("payment");
      return { count: 0 };
    },
  },
  appointment: {
    deleteMany: async () => {
      purgeCalls.push("appointment");
      return { count: 0 };
    },
  },
  coupon: {
    deleteMany: async () => {
      purgeCalls.push("coupon");
      return { count: 0 };
    },
  },
};

deleteAllPageViews(fakeDb)
  .then((deleted) => {
    assert.equal(deleted, 187);
    assert.deepEqual(purgeCalls, ["pageView"]);
    ok("limpar visitação chama só pageView.deleteMany");
    console.log(JSON.stringify({ reportId: "local-three-features-smoke", pass: true }, null, 2));
  })
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
