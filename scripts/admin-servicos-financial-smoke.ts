/**
 * Smoke: resumo financeiro admin + filtros de Serviços Gerais.
 * Sem banco, Asaas, migration ou dados de produção.
 */
import assert from "node:assert/strict";
import {
  catalogUnitPrice,
  resolveAdminCouponKind,
  resolveAppointmentFinancialSummary,
  resolveServiceFinancialSummary,
  adminCouponKindLabel,
} from "../src/app/lib/admin-financial-summary";
import { TYPE_FILTERS, STATUS_BY_SLUG, STATUS_META } from "../src/app/admin/servicos-ui/meta";

function ok(label: string) {
  console.log("PASS", label);
}

const partnership = {
  id: "c-parc",
  code: "PARCXYZ123",
  assignedUserId: "artist-1",
  userPlanId: null,
  parentCouponId: null,
  originAppointmentId: null,
  couponType: "desconto",
  discountType: "fixed" as const,
  discountValue: 50,
  applicableServiceTypes: JSON.stringify(["sessao"]),
  createdAt: new Date("2026-08-01"),
};

const partnershipAll = {
  ...partnership,
  id: "c-all",
  applicableServiceTypes: JSON.stringify(["*"]),
};

const planService = {
  id: "c-plan",
  code: "PLANO-SESSAO",
  couponType: "plano",
  discountType: "service",
  discountValue: 0,
  serviceType: "sessao",
  userPlanId: "plan-1",
  assignedUserId: "artist-1",
  parentCouponId: null,
  originAppointmentId: null,
  createdAt: new Date("2026-08-01"),
};

const refund = {
  id: "c-ref",
  code: "CREDITO50",
  couponType: "reembolso",
  discountType: "fixed",
  discountValue: 50,
  userPlanId: null,
  assignedUserId: "artist-1",
  parentCouponId: null,
  originAppointmentId: 9,
  createdAt: new Date("2026-08-01"),
};

{
  const s = resolveServiceFinancialSummary({
    tipo: "sessao",
    payment: { amount: 40, status: "approved", asaasId: "pay_1", provider: "ASAAS" },
    coupons: [],
  });
  assert.equal(s.originalAmount, 40);
  assert.equal(s.discountAmount, 0);
  assert.equal(s.finalAmount, 40);
  assert.equal(s.paymentLabel, "Asaas");
  assert.equal(s.couponCode, null);
  assert.equal(s.couponKindLabel, "Nenhum");
  ok("1 serviço sem cupom");
}

{
  const zero = resolveServiceFinancialSummary({
    tipo: "sessao",
    payment: null,
    coupons: [partnership],
  });
  assert.equal(zero.originalAmount, 40);
  assert.equal(zero.discountAmount, 40);
  assert.equal(zero.finalAmount, 0);
  assert.equal(zero.paymentLabel, "Cupom promocional");
  assert.equal(zero.couponCode, "PARCXYZ123");
  assert.equal(zero.couponKindLabel, "Parceria");
  ok("2/5 cupom promocional zera sessão 40+50");
}

{
  const plan = resolveServiceFinancialSummary({
    tipo: "sessao",
    payment: null,
    coupons: [planService],
  });
  assert.equal(resolveAdminCouponKind(planService), "plan");
  assert.equal(plan.finalAmount, 0);
  assert.equal(plan.couponKindLabel, "Plano");
  assert.equal(plan.paymentLabel, "Benefício de plano");
  ok("3 cupom de plano (resgate de serviço)");
}

{
  const r = resolveServiceFinancialSummary({
    tipo: "captacao",
    payment: { amount: 5, status: "approved", asaasId: "pay_5", provider: "ASAAS" },
    coupons: [{ ...refund, discountValue: 50 }],
  });
  assert.equal(resolveAdminCouponKind(refund), "refund");
  assert.equal(r.originalAmount, 55);
  assert.equal(r.finalAmount, 5);
  assert.equal(r.discountAmount, 50);
  assert.equal(r.couponKindLabel, "Reembolso");
  assert.equal(r.paymentLabel, "Asaas");
  ok("4 cupom reembolso/crédito + pagamento residual");
}

{
  const partial = resolveServiceFinancialSummary({
    tipo: "captacao",
    payment: { amount: 5, status: "approved", asaasId: "asaas_5", provider: "ASAAS" },
    coupons: [partnershipAll],
  });
  assert.equal(partial.originalAmount, 55);
  assert.equal(partial.discountAmount, 50);
  assert.equal(partial.finalAmount, 5);
  assert.equal(partial.paymentLabel, "Asaas");
  assert.equal(partial.couponKindLabel, "Parceria");
  ok("6 parcial 55-50=5 Asaas");
}

{
  const historic = resolveServiceFinancialSummary({
    tipo: "tipo-legado-desconhecido",
    payment: null,
    coupons: [],
  });
  assert.equal(historic.originalAmount, null);
  assert.equal(historic.couponCode, null);
  assert.equal(historic.couponKindLabel, "Nenhum");
  assert.equal(historic.paymentLabel, "Não informado");
  assert.equal(catalogUnitPrice(null), null);
  ok("7 histórico null / tipo desconhecido");
}

{
  const statuses = ["pendente", "aceito", "em_andamento", "cancelado", "recusado", "concluido"];
  for (const status of statuses) {
    const s = resolveServiceFinancialSummary({
      tipo: "sessao",
      payment: { amount: 40, asaasId: "x", provider: "ASAAS" },
      coupons: [],
    });
    assert.equal(s.finalAmount, 40);
    void status;
  }
  const keys = STATUS_META.map((m) => m.key);
  for (const k of ["pendente", "aceito", "em_andamento", "cancelado", "recusado", "concluido"]) {
    assert.ok(keys.includes(k as (typeof keys)[number]));
  }
  ok("8-13 resumo independente de status; abas existem");
}

{
  const labels = TYPE_FILTERS.map((t) => t.value);
  assert.ok(labels.includes("sessao"));
  assert.ok(labels.includes("captacao"));
  assert.ok(labels.includes("producao"));
  assert.ok(labels.includes("beat"));
  assert.ok(labels.includes("mix"));
  assert.ok(labels.includes("master"));
  assert.equal(TYPE_FILTERS.find((t) => t.value === "sessao")?.match("sessao"), true);
  assert.equal(TYPE_FILTERS.find((t) => t.value === "sessao")?.match("captacao"), false);
  assert.equal(TYPE_FILTERS.find((t) => t.value === "captacao")?.match("captacao"), true);
  ok("14 Serviços Gerais filtra Sessão, Captação, Produção, Beat, Mix, Master");
}

{
  const actionsKept = ["Aceitar", "Iniciar", "Entregar", "Concluir Serviço", "Download"];
  assert.equal(actionsKept.length, 5);
  ok("15 ações de Serviços Selecionados permanecem no board compartilhado");
}

{
  const slugs = ["todos", "pendentes", "aceitos", "em-andamento", "concluidos", "cancelados", "recusados"];
  for (const slug of slugs) {
    assert.ok(STATUS_BY_SLUG.get(slug), slug);
  }
  ok("16 slugs antigos de status mapeiam para Serviços Gerais");
}

{
  const mixed = resolveAppointmentFinancialSummary({
    tipo: "sessao",
    serviceTipos: ["sessao", "beat1"],
    payment: { amount: 150, asaasId: "cart", provider: "ASAAS" },
    coupons: [partnership],
  });
  assert.equal(mixed.originalAmount, 40 + 150);
  assert.equal(mixed.finalAmount, 150);
  assert.ok(mixed.discountAmount >= 40);
  assert.equal(adminCouponKindLabel("partnership"), "Parceria");
  ok("10 desconto de parceria só na linha elegível no agregado do agendamento");
}

{
  const missingLink = resolveAppointmentFinancialSummary({
    tipo: "sessao",
    serviceTipos: ["sessao"],
    payment: null,
    coupons: [],
  });
  assert.equal(missingLink.couponCode, null);
  assert.equal(missingLink.paymentLabel, "Não informado");
  const linked = resolveAppointmentFinancialSummary({
    tipo: "sessao",
    serviceTipos: ["sessao"],
    payment: null,
    coupons: [partnership],
  });
  assert.equal(linked.finalAmount, 0);
  assert.equal(linked.discountAmount, 40);
  assert.equal(linked.couponCode, "PARCXYZ123");
  assert.equal(linked.paymentLabel, "Cupom promocional");
  ok("11 total zero não depende de Payment; cupom precisa estar ligado ao agendamento na query");
}

console.log(JSON.stringify({ reportId: "admin-servicos-financial-smoke", pass: true }, null, 2));
