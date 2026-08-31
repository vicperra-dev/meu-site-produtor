/**
 * GO-04A.2 — smoke estático de resiliência financeira (RC-08..RC-12).
 * Sem pagamentos reais.
 */
import fs from "fs";
import path from "path";

type Check = { id: string; ok: boolean; detail: string };

const root = process.cwd();
const checks: Check[] = [];

function read(rel: string) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

const webhook = read("src/app/api/webhooks/asaas/route.ts");
const sucesso = read("src/app/pagamentos/sucesso/page.tsx");
const verificar = read("src/app/api/pagamentos/verificar/route.ts");
const planoRefund = read("src/app/api/planos/solicitar-reembolso/route.ts");
const escolher = read("src/app/api/agendamentos/escolher-reembolso/route.ts");
const sync = read("src/app/lib/payment-refund-sync.ts");
const cartPartial = read("src/app/lib/cart-partial-refund.ts");
const finLog = read("src/app/lib/financial-ops-log.ts");
const processarManual = read("src/app/api/pagamentos/processar-manual/route.ts");

checks.push({
  id: "RC-08-missing-token-explicit",
  ok:
    webhook.includes("ASAAS_WEBHOOK_ACCESS_TOKEN_MISSING") &&
    webhook.includes("processed: false") &&
    webhook.includes("logFinancialFailure"),
  detail: "Token ausente → processed:false + log operacional",
});
checks.push({
  id: "RC-08-token-mismatch-explicit",
  ok: webhook.includes("ASAAS_WEBHOOK_TOKEN_MISMATCH") && webhook.includes("ignored: true"),
  detail: "Token inválido → ignored explícito",
});
checks.push({
  id: "RC-08-internal-callers-send-token",
  ok: processarManual.includes("asaas-access-token"),
  detail: "Recuperação manual envia asaas-access-token",
});

checks.push({
  id: "RC-09-timeout-retry-button",
  ok:
    sucesso.includes("TIMEOUT_MS") &&
    sucesso.includes("Atualizar status") &&
    sucesso.includes("POLL_INTERVAL_MS") &&
    sucesso.includes("operationId"),
  detail: "Timeout + poll + botão Atualizar status",
});
checks.push({
  id: "RC-09-verificar-operationId",
  ok: verificar.includes("operationId") && verificar.includes("effectsReady"),
  detail: "API verificar aceita operationId",
});

checks.push({
  id: "RC-10-plan-pending-persisted",
  ok:
    planoRefund.includes('refundAsaasStatus: "pending"') &&
    planoRefund.includes('refundAsaasStatus: "failed"') &&
    planoRefund.includes("refundAmount"),
  detail: "Plano persiste pending/failed + amount",
});
checks.push({
  id: "RC-10-sync-accepts-null-pending",
  ok:
    sync.includes("refundAsaasStatus: null") &&
    sync.includes('refundAsaasStatus: "confirmed"'),
  detail: "Sync inbound confirma pending|null → confirmed",
});

checks.push({
  id: "RC-11-metadata-amount",
  ok:
    cartPartial.includes("metadata") &&
    escolher.includes("resolveCartPartialRefundAmount") &&
    escolher.includes("valueToRefund = refundAmount"),
  detail: "Rateio por metadata; nunca undefined em multi-item",
});
checks.push({
  id: "RC-11-remaining-cap",
  ok: cartPartial.includes("remaining") && escolher.includes("CART_PARTIAL_REFUND_ZERO"),
  detail: "Cap de saldo restante / bloqueio valor zero",
});

checks.push({
  id: "RC-12-plan-atomic-reserve",
  ok:
    planoRefund.includes("updateMany") &&
    planoRefund.includes("refundProcessedAt: null") &&
    planoRefund.includes("409"),
  detail: "Reserva atômica no plano antes do gateway",
});
checks.push({
  id: "RC-12-appointment-pending",
  ok: escolher.includes('refundAsaasStatus: "pending"'),
  detail: "Agendamento marca pending na reserva",
});

checks.push({
  id: "LOGS-financial-ops",
  ok:
    finLog.includes("operationId") &&
    finLog.includes("providerPaymentId") &&
    finLog.includes("motivo") &&
    !finLog.toLowerCase().includes("apikey"),
  detail: "Logs financeiros estruturados sem segredos",
});

const failed = checks.filter((c) => !c.ok);
console.log(JSON.stringify({ ok: failed.length === 0, checks }, null, 2));
if (failed.length) {
  console.error("[go04a2-financial-smoke] FAIL");
  process.exit(1);
}
console.log("[go04a2-financial-smoke] PASS");
