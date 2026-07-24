"use client";

/**
 * GO-H6/H7 — Homologação: Laboratório (Simulation) + Pedido real (HOMOLOGATION).
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  PageHeader,
  Card,
  Section,
  Button,
  Select,
  Field,
  Badge,
  Callout,
  LoadingBlock,
  COPY,
} from "@/components/design-system";
import { SchedulingCalendar } from "@/app/agendamento/components/SchedulingCalendar";
import {
  CHECKOUT_CATALOG,
  type CanonicalServiceId,
} from "@/app/lib/service-catalog";
import {
  countServiceOrders,
  expandPurchaseToServiceOrders,
  purchaseOpensImmediateSchedule,
  purchaseEmitsServiceOrderCoupons,
} from "@/app/lib/service-orders";
import { LAB_PRESETS, type LabPresetId } from "@/app/lib/homologation/presets";
import { SERVICE_ORDER_PHASES } from "@/app/lib/service-orders/phases";
import {
  PRODUCTION_SCHEDULE_DEFAULT_HOUR,
  exigeAgendamentoHora,
} from "@/app/lib/agendamento-payment-rules";

type Check = { key: string; label: string; ok: boolean; detail?: string };
type Timeline = { at: string; step: string; ok: boolean; detail?: string };
type ServiceOrderSummary = {
  id: string;
  serviceType: string;
  commercialSource: string | null;
  phase: string;
  couponId: string | null;
  appointmentId: number | null;
  sequenceIndex: number;
};
type Run = {
  runId: string;
  startedAt: string;
  finishedAt?: string;
  ok: boolean;
  error?: string;
  scenarioId?: string;
  providerPaymentId?: string;
  paymentDbId?: string;
  appointmentIds?: number[];
  serviceIds?: string[];
  couponCodes?: string[];
  serviceOrders?: ServiceOrderSummary[];
  orderCount?: number;
  refund?: { status: string; reason?: string };
  checks: Check[];
  timeline: Timeline[];
  input: {
    tipo?: string;
    planId?: string;
    runRefund?: boolean;
    servicos?: { id: string; quantidade: number; nome?: string }[];
    beats?: { id: string; quantidade: number; nome?: string }[];
    data?: string;
    hora?: string;
    freeLab?: boolean;
    paymentOutcome?: string;
  };
};

type QtyMap = Partial<Record<CanonicalServiceId, number>>;

type RealOrderFlow = {
  pedidoCriado: boolean;
  pagamentoConfirmado: boolean;
  ordensCriadas: boolean;
  cuponsCriados: boolean;
  agendamentoCriado: boolean;
  aceitoPeloAdmin: boolean;
  servicosSelecionados: boolean;
  upload: boolean;
  entrega: boolean;
  downloadPronto: boolean;
  concluido: boolean;
};

type RealOrder = {
  origin: string;
  providerPaymentId: string;
  paymentDbId: string;
  paymentStatus: string;
  amount: number;
  appointmentIds: number[];
  serviceIds: string[];
  couponCodes: string[];
  couponTypes: string[];
  couponCategories?: string[];
  orderCount: number;
  serviceOrders: ServiceOrderSummary[];
  appointments: Array<{ id: number; status: string; tipo: string; data: string }>;
  services: Array<{
    id: string;
    status: string;
    tipo: string;
    deliveryAudioUrl: string | null;
  }>;
  flow: RealOrderFlow;
};

const FLOW_LABELS: Array<{ key: keyof RealOrderFlow; label: string }> = [
  { key: "pedidoCriado", label: "Pedido criado" },
  { key: "pagamentoConfirmado", label: "Pagamento confirmado" },
  { key: "ordensCriadas", label: "Ordens criadas" },
  { key: "cuponsCriados", label: "Cupons criados" },
  { key: "agendamentoCriado", label: "Agendamento criado" },
  { key: "aceitoPeloAdmin", label: "Aceito pelo Admin" },
  { key: "servicosSelecionados", label: "Serviços Selecionados" },
  { key: "upload", label: "Upload" },
  { key: "entrega", label: "Entrega" },
  { key: "downloadPronto", label: "Download" },
  { key: "concluido", label: "Concluído" },
];

const CATALOG_IDS = Object.keys(CHECKOUT_CATALOG) as CanonicalServiceId[];

function emptyQty(): QtyMap {
  return {};
}

function qtyToLines(qty: QtyMap) {
  const servicos: { id: string; nome: string; quantidade: number; preco: number }[] = [];
  const beats: { id: string; nome: string; quantidade: number; preco: number }[] = [];
  for (const id of CATALOG_IDS) {
    const n = qty[id] || 0;
    if (n < 1) continue;
    const item = CHECKOUT_CATALOG[id];
    const line = { id, nome: item.nome, quantidade: n, preco: item.preco };
    if (item.category === "beat") beats.push(line);
    else servicos.push(line);
  }
  return { servicos, beats };
}

function tomorrowIso(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

export default function HomologacaoAdminPage() {
  const [latest, setLatest] = useState<Run | null>(null);
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [presetId, setPresetId] = useState<LabPresetId>("livre");
  const [qty, setQty] = useState<QtyMap>(emptyQty);
  const [lastQty, setLastQty] = useState<QtyMap | null>(null);
  const [data, setData] = useState<string | null>(tomorrowIso());
  const [hora, setHora] = useState<string | null>("14:00");
  const [paymentOutcome, setPaymentOutcome] = useState<"approved" | "pending" | "refused">(
    "approved"
  );
  const [planId, setPlanId] = useState<string>("");
  const [runRefund, setRunRefund] = useState(false);
  const [labPhase, setLabPhase] = useState<string>("reserved");
  const [labMsg, setLabMsg] = useState<string | null>(null);
  const [realOrder, setRealOrder] = useState<RealOrder | null>(null);
  const [orderMsg, setOrderMsg] = useState<string | null>(null);
  const [purgeScope, setPurgeScope] = useState<"simulation" | "homologation" | "both">("both");
  const [purgePreview, setPurgePreview] = useState<Record<string, number> | null>(null);
  const [purgeMsg, setPurgeMsg] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [runsRes, orderListRes] = await Promise.all([
        fetch("/api/admin/homologation/runs", { cache: "no-store" }),
        fetch("/api/admin/homologation/order", { cache: "no-store" }),
      ]);
      const runsData = await runsRes.json();
      if (runsRes.ok) {
        setLatest(runsData.latest || null);
        setRuns(runsData.runs || []);
      }
      if (orderListRes.ok) {
        const orderData = await orderListRes.json();
        const first = orderData.recent?.[0];
        if (first?.id) {
          const detailRes = await fetch(
            `/api/admin/homologation/order?paymentId=${encodeURIComponent(first.id)}`,
            { cache: "no-store" }
          );
          const detail = await detailRes.json();
          if (detailRes.ok && detail.order) setRealOrder(detail.order);
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const { servicos, beats } = useMemo(() => qtyToLines(qty), [qty]);
  const orderCount = useMemo(
    () => countServiceOrders(servicos, beats),
    [servicos, beats]
  );
  const opensSchedule = useMemo(
    () => purchaseOpensImmediateSchedule(servicos, beats),
    [servicos, beats]
  );
  const emitsCoupons = useMemo(
    () => purchaseEmitsServiceOrderCoupons(servicos, beats),
    [servicos, beats]
  );
  const orderPreview = useMemo(
    () => expandPurchaseToServiceOrders(servicos, beats),
    [servicos, beats]
  );
  const needsHour = useMemo(
    () => opensSchedule && exigeAgendamentoHora(servicos, beats),
    [opensSchedule, servicos, beats]
  );
  const primaryType = orderPreview[0]?.serviceType || "sessao";

  function applyPreset(id: LabPresetId) {
    setPresetId(id);
    const preset = LAB_PRESETS.find((p) => p.id === id);
    if (!preset) return;
    setRunRefund(Boolean(preset.runRefund));
    setPlanId(preset.planId || "");
    if (preset.qty) {
      setQty({ ...preset.qty });
    } else if (id === "livre") {
      setQty(emptyQty());
    } else if (preset.scenarioId && !preset.qty) {
      // cenários sem qty (plano / desconto / refund) — limpa catálogo
      setQty(emptyQty());
    }
    if (opensSchedule || (preset.qty && countServiceOrders(
      qtyToLines(preset.qty || {}).servicos,
      qtyToLines(preset.qty || {}).beats
    ) === 1)) {
      setData(tomorrowIso());
      setHora(needsHour ? "14:00" : PRODUCTION_SCHEDULE_DEFAULT_HOUR);
    }
  }

  function bumpQty(id: CanonicalServiceId, delta: number) {
    setPresetId("livre");
    setQty((prev) => {
      const next = { ...prev };
      const v = Math.max(0, Math.min(20, (next[id] || 0) + delta));
      if (v === 0) delete next[id];
      else next[id] = v;
      return next;
    });
  }

  async function simulatePayment(opts?: { repeat?: boolean }) {
    setBusy(true);
    setMessage(null);
    try {
      const useQty = opts?.repeat && lastQty ? lastQty : qty;
      const lines = qtyToLines(useQty);
      const preset = LAB_PRESETS.find((p) => p.id === presetId);

      // Plano / cenários oficiais sem seleção livre
      if (planId || (preset?.scenarioId && !preset.qty && presetId !== "livre")) {
        const res = await fetch("/api/admin/homologation/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scenarioId: preset?.scenarioId,
            planId: planId || undefined,
            tipo: planId ? "plano" : undefined,
            runRefund: runRefund || preset?.runRefund,
            paymentOutcome,
          }),
        });
        const dataRes = await res.json();
        if (!res.ok) {
          setMessage(dataRes.error || "Falha na simulação.");
          return;
        }
        setLatest(dataRes.run);
        setLastQty(useQty);
        setMessage(dataRes.run.ok ? "Simulação PASS." : "Simulação com falhas — veja debug.");
        await refresh();
        return;
      }

      if (lines.servicos.length + lines.beats.length === 0) {
        setMessage("Selecione ao menos um produto ou um preset.");
        return;
      }

      const immediate = purchaseOpensImmediateSchedule(lines.servicos, lines.beats);
      const presencial = immediate && exigeAgendamentoHora(lines.servicos, lines.beats);
      const body: Record<string, unknown> = {
        freeLab: true,
        tipo: "agendamento",
        servicos: lines.servicos,
        beats: lines.beats,
        observacoes: `[Homologação] SimulationProvider · laboratório operacional`,
        paymentOutcome,
        runRefund,
      };
      if (immediate) {
        body.data = data || tomorrowIso();
        body.hora = presencial
          ? hora || "14:00"
          : PRODUCTION_SCHEDULE_DEFAULT_HOUR;
        body.duracaoMinutos = 60;
      }

      const res = await fetch("/api/admin/homologation/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const dataRes = await res.json();
      if (!res.ok) {
        setMessage(dataRes.error || "Falha na simulação.");
        return;
      }
      setLatest(dataRes.run);
      setLastQty(useQty);
      setMessage(dataRes.run.ok ? "Simulação PASS." : "Simulação com falhas — veja debug.");
      await refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Erro inesperado.");
    } finally {
      setBusy(false);
    }
  }

  async function previewPurge() {
    setBusy(true);
    setPurgeMsg(null);
    setPurgePreview(null);
    try {
      const res = await fetch("/api/admin/homologation/purge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope: purgeScope, dryRun: true }),
      });
      const dataRes = await res.json();
      if (!res.ok) {
        setPurgeMsg(dataRes.error || "Falha no dry-run.");
        return;
      }
      const t = dataRes.result?.totals || {};
      setPurgePreview({
        pedidos: t.payments || 0,
        ordens: t.serviceOrders || 0,
        cupons: t.coupons || 0,
        agendamentos: t.appointments || 0,
        services: t.services || 0,
        selecionados: t.selectedServices || 0,
        entregas: t.deliveries || 0,
        historico: t.history || 0,
        sync: t.syncEvents || 0,
        roots: (dataRes.result?.rootPaymentIds || []).length,
      });
      setPurgeMsg(
        `Dry-run OK · ${dataRes.result?.rootPaymentIds?.length || 0} Pedido(s) Raiz no escopo "${purgeScope}".`
      );
    } finally {
      setBusy(false);
    }
  }

  async function executePurge() {
    const label =
      purgeScope === "both"
        ? "Simulation + Pedidos de Homologação"
        : purgeScope === "simulation"
          ? "apenas SimulationProvider"
          : "apenas Pedidos de Homologação";
    if (
      !window.confirm(
        `Confirmar limpeza transacional (${label})?\nCada Pedido Raiz será removido via purgeOrderTree (rollback se falhar).`
      )
    ) {
      return;
    }
    setBusy(true);
    setPurgeMsg(null);
    try {
      const res = await fetch("/api/admin/homologation/purge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope: purgeScope, dryRun: false }),
      });
      const dataRes = await res.json();
      if (!res.ok) {
        setPurgeMsg(dataRes.error || "Falha na limpeza.");
        return;
      }
      setLatest(null);
      setRealOrder(null);
      setPurgePreview(null);
      setPurgeMsg(`Limpeza OK: ${JSON.stringify(dataRes.result?.totals || dataRes.result)}`);
      setMessage(null);
      setOrderMsg(null);
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function createRealOrder() {
    setBusy(true);
    setOrderMsg(null);
    try {
      const lines = qtyToLines(qty);
      if (lines.servicos.length + lines.beats.length === 0) {
        setOrderMsg("Selecione ao menos um produto.");
        return;
      }
      const immediate = purchaseOpensImmediateSchedule(lines.servicos, lines.beats);
      const presencial = immediate && exigeAgendamentoHora(lines.servicos, lines.beats);
      const body: Record<string, unknown> = {
        servicos: lines.servicos,
        beats: lines.beats,
        observacoes: "Pedido de Homologação (QA operacional)",
      };
      if (immediate) {
        body.data = data || tomorrowIso();
        body.hora = presencial ? hora || "14:00" : PRODUCTION_SCHEDULE_DEFAULT_HOUR;
        body.duracaoMinutos = 60;
      }
      const res = await fetch("/api/admin/homologation/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const dataRes = await res.json();
      if (!res.ok) {
        setOrderMsg(dataRes.error || "Falha ao criar Pedido de Homologação.");
        return;
      }
      setRealOrder(dataRes.order);
      setLastQty(qty);
      setOrderMsg(
        `Pedido criado · ${dataRes.order.paymentDbId} · ${dataRes.order.orderCount} Ordem(ns) · origin=HOMOLOGATION`
      );
    } catch (e) {
      setOrderMsg(e instanceof Error ? e.message : "Erro inesperado.");
    } finally {
      setBusy(false);
    }
  }

  async function refreshRealOrder() {
    if (!realOrder?.paymentDbId) return;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/admin/homologation/order?paymentId=${encodeURIComponent(realOrder.paymentDbId)}`,
        { cache: "no-store" }
      );
      const dataRes = await res.json();
      if (res.ok && dataRes.order) setRealOrder(dataRes.order);
    } finally {
      setBusy(false);
    }
  }

  async function refundLatest(outcome: "APPROVED" | "PENDING" | "FAILED" | "TIMEOUT") {
    if (!latest?.providerPaymentId && !latest?.runId) {
      setMessage("Nenhum run para reembolsar.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/admin/homologation/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          runId: latest.runId,
          providerPaymentId: latest.providerPaymentId,
          outcome,
        }),
      });
      const dataRes = await res.json();
      if (!res.ok) {
        setMessage(dataRes.error || "Falha no reembolso simulado.");
        return;
      }
      setMessage(`Refund ${dataRes.refund?.status}: ${dataRes.refund?.reason || ""}`);
      if (dataRes.run) setLatest(dataRes.run);
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function labAction(body: Record<string, unknown>) {
    setBusy(true);
    setLabMsg(null);
    try {
      const res = await fetch("/api/admin/homologation/lab", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const dataRes = await res.json();
      if (!res.ok || !dataRes.ok) {
        setLabMsg(dataRes.error || dataRes.detail || "Falha no Modo Livre.");
        return;
      }
      setLabMsg(dataRes.detail || "OK");
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  const selectedPreset = LAB_PRESETS.find((p) => p.id === presetId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Homologação — Laboratório + Pedido Real"
        subtitle={
          <>
            Dois modos: <code className="text-zinc-300">SimulationProvider</code> (lab descartável) e{" "}
            <code className="text-zinc-300">origin=HOMOLOGATION</code> (pedido operacional real, sem Asaas).
          </>
        }
        icon="sparkles"
      />

      <Callout intent="info" title="Presets rápidos (compartilhados)">
        <div className="flex flex-wrap gap-2 mt-2">
          {LAB_PRESETS.map((p) => (
            <Button
              key={p.id}
              size="xs"
              variant={presetId === p.id ? "primary" : "outline"}
              disabled={busy}
              onClick={() => applyPreset(p.id)}
            >
              {p.label}
            </Button>
          ))}
        </div>
        {selectedPreset && (
          <p className="text-xs text-zinc-400 mt-2">{selectedPreset.description}</p>
        )}
      </Callout>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <Section title="Seleção livre de serviços">
            <ul className="space-y-2 text-sm max-h-[320px] overflow-y-auto">
              {CATALOG_IDS.map((id) => {
                const item = CHECKOUT_CATALOG[id];
                const n = qty[id] || 0;
                return (
                  <li
                    key={id}
                    className="flex items-center justify-between gap-2 border-b border-zinc-800 py-1.5"
                  >
                    <div>
                      <div className="text-zinc-200">{item.nome}</div>
                      <div className="text-[11px] text-zinc-500">
                        {item.category} · R$ {item.preco}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="xs"
                        variant="outline"
                        disabled={busy || n < 1}
                        onClick={() => bumpQty(id, -1)}
                      >
                        −
                      </Button>
                      <span className="w-6 text-center tabular-nums">{n}</span>
                      <Button
                        size="xs"
                        variant="outline"
                        disabled={busy}
                        onClick={() => bumpQty(id, 1)}
                      >
                        +
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="mt-4 rounded-md border border-zinc-800 bg-zinc-950/50 p-3 text-xs space-y-1">
              <div>
                Ordens de Serviço previstas:{" "}
                <span className="text-amber-300 font-semibold">{orderCount}</span>
              </div>
              <div className="text-zinc-400">
                {orderCount === 0
                  ? "Selecione produtos."
                  : orderCount === 1
                    ? "Regra: 1 Ordem → calendário imediato."
                    : "Regra: 2+ Ordens → cupons (sem agenda no checkout)."}
              </div>
              {orderPreview.length > 0 && (
                <div className="text-zinc-500">
                  {orderPreview.map((o) => o.serviceType).join(" → ")}
                </div>
              )}
              {opensSchedule && <Badge intent="success">Calendário imediato</Badge>}
              {emitsCoupons && <Badge intent="warning">Emite cupons</Badge>}
            </div>

            {opensSchedule && (
              <div className="mt-4">
                <SchedulingCalendar
                  serviceType={primaryType}
                  serviceName={CHECKOUT_CATALOG[primaryType as CanonicalServiceId]?.nome}
                  showHours={needsHour}
                  dataSelecionada={data}
                  horaSelecionada={hora}
                  onDataChange={setData}
                  onHoraChange={setHora}
                  title="Calendário (mesmo componente do checkout)"
                />
              </div>
            )}

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Field label="Pagamento simulado">
                <Select
                  value={paymentOutcome}
                  onChange={(e) =>
                    setPaymentOutcome(e.target.value as "approved" | "pending" | "refused")
                  }
                  options={[
                    { value: "approved", label: "Aprovado (confirmar)" },
                    { value: "pending", label: "Pendente" },
                    { value: "refused", label: "Recusado" },
                  ]}
                />
              </Field>
              <Field label="Plano (opcional)">
                <Select
                  value={planId}
                  onChange={(e) => {
                    setPlanId(e.target.value);
                    if (e.target.value) setPresetId("plano");
                  }}
                  options={[
                    { value: "", label: "— nenhum —" },
                    { value: "bronze", label: "Bronze" },
                    { value: "prata", label: "Prata" },
                    { value: "ouro", label: "Ouro" },
                  ]}
                />
              </Field>
            </div>

            <label className="mt-3 flex items-center gap-2 text-xs text-zinc-400">
              <input
                type="checkbox"
                checked={runRefund}
                onChange={(e) => setRunRefund(e.target.checked)}
              />
              Executar reembolso após confirmar
            </label>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                variant="primary"
                loading={busy}
                onClick={() => void simulatePayment()}
                className="!bg-amber-600 hover:!bg-amber-500"
              >
                Simular Pagamento (Lab)
              </Button>
              <Button
                variant="outline"
                disabled={busy || !lastQty}
                onClick={() => void simulatePayment({ repeat: true })}
              >
                Repetir Cenário
              </Button>
              <Button variant="outline" disabled={busy} icon="refresh" onClick={() => void refresh()}>
                {COPY.actions.refresh}
              </Button>
            </div>
            {message && <p className="text-sm text-amber-100 mt-3">{message}</p>}

            <div className="mt-6 border-t border-zinc-800 pt-4 space-y-3">
              <h3 className="text-sm font-semibold text-emerald-300">
                Pedido de Homologação (fluxo real)
              </h3>
              <p className="text-xs text-zinc-500">
                Confirma pagamento internamente e executa o mesmo{" "}
                <code className="text-zinc-400">processPaymentWebhook</code> do Asaas. Cupons SERVICE,
                valor de catálogo, origin=HOMOLOGATION.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="primary"
                  loading={busy}
                  onClick={() => void createRealOrder()}
                  className="!bg-emerald-700 hover:!bg-emerald-600"
                >
                  Criar Pedido de Homologação
                </Button>
                <Button
                  variant="outline"
                  disabled={busy || !realOrder}
                  onClick={() => void refreshRealOrder()}
                >
                  Atualizar Fluxo Real
                </Button>
              </div>
              {orderMsg && <p className="text-sm text-emerald-100">{orderMsg}</p>}
            </div>

            <div className="mt-6 border-t border-zinc-800 pt-4 space-y-3">
              <h3 className="text-sm font-semibold text-red-300">
                Limpeza da Homologação (GO-H8B)
              </h3>
              <p className="text-xs text-zinc-500">
                Único ponto de exclusão: <code className="text-zinc-400">purgeOrderTree</code> por
                Pedido Raiz. Dry-run obrigatório antes de confirmar. Asaas real nunca é tocado.
              </p>
              <div className="flex flex-col gap-2 text-sm text-zinc-300">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    name="purgeScope"
                    checked={purgeScope === "simulation"}
                    onChange={() => setPurgeScope("simulation")}
                  />
                  Limpar apenas SimulationProvider
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    name="purgeScope"
                    checked={purgeScope === "homologation"}
                    onChange={() => setPurgeScope("homologation")}
                  />
                  Limpar apenas Pedidos de Homologação
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    name="purgeScope"
                    checked={purgeScope === "both"}
                    onChange={() => setPurgeScope("both")}
                  />
                  Limpar ambos
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" disabled={busy} onClick={() => void previewPurge()}>
                  Pré-visualizar (dry-run)
                </Button>
                <Button
                  variant="outline"
                  disabled={busy || !purgePreview}
                  onClick={() => void executePurge()}
                  className="!border-red-800 !text-red-300"
                >
                  Confirmar limpeza
                </Button>
              </div>
              {purgePreview && (
                <ul className="text-xs text-zinc-400 grid grid-cols-2 sm:grid-cols-3 gap-1">
                  <li>Pedidos Raiz: {purgePreview.roots}</li>
                  <li>Pagamentos: {purgePreview.pedidos}</li>
                  <li>Ordens: {purgePreview.ordens}</li>
                  <li>Cupons: {purgePreview.cupons}</li>
                  <li>Agendamentos: {purgePreview.agendamentos}</li>
                  <li>Services: {purgePreview.services}</li>
                  <li>Selecionados: {purgePreview.selecionados}</li>
                  <li>Entregas: {purgePreview.entregas}</li>
                  <li>Histórico: {purgePreview.historico}</li>
                  <li>Sync: {purgePreview.sync}</li>
                </ul>
              )}
              {purgeMsg && <p className="text-sm text-amber-100">{purgeMsg}</p>}
            </div>
          </Section>
        </Card>

        <Card>
          <Section title="Debug operacional (tempo real)">
            {loading && <LoadingBlock />}
            {!loading && !latest && (
              <p className="text-sm text-zinc-500">Nenhuma simulação ainda.</p>
            )}
            {latest && (
              <div className="space-y-4 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge intent={latest.ok ? "success" : "error"}>
                    {latest.ok ? "PASS" : "FAIL"}
                  </Badge>
                  <span className="text-zinc-500 text-xs">{latest.runId}</span>
                  <Badge intent="info">SimulationProvider</Badge>
                </div>

                <ol className="space-y-2 border-l border-zinc-700 pl-3">
                  <li>
                    Pedido{" "}
                    <code className="text-zinc-300">{latest.paymentDbId || "—"}</code>
                    {latest.providerPaymentId && (
                      <span className="text-zinc-500"> · {latest.providerPaymentId}</span>
                    )}
                  </li>
                  <li>
                    {(latest.orderCount ?? latest.serviceOrders?.length ?? 0)} Ordem(ns) de Serviço
                    <ul className="mt-1 text-xs text-zinc-400 space-y-0.5">
                      {(latest.serviceOrders || []).map((o) => (
                        <li key={o.id}>
                          #{o.sequenceIndex + 1} {o.serviceType} · fase={o.phase}
                          {o.couponId ? ` · cupom` : ""}
                          {o.appointmentId ? ` · apt #${o.appointmentId}` : ""}
                        </li>
                      ))}
                    </ul>
                  </li>
                  <li>
                    {(latest.couponCodes || []).length} Cupom(ns):{" "}
                    {(latest.couponCodes || []).join(", ") || "—"}
                  </li>
                  <li>
                    {(latest.appointmentIds || []).length} Agendamento(s):{" "}
                    {(latest.appointmentIds || []).join(", ") || "—"}
                  </li>
                  <li>
                    Status:{" "}
                    {latest.checks.find((c) => c.key === "workflowUpdated")?.detail || "—"}
                  </li>
                  <li>
                    Dashboard:{" "}
                    {latest.checks.find((c) => c.key === "dashboardUpdated")?.ok
                      ? "atualizado"
                      : "—"}
                  </li>
                  <li>
                    Controle operacional:{" "}
                    {latest.checks.find((c) => c.key === "minhaContaUpdated")?.ok
                      ? "sincronizado"
                      : "—"}
                  </li>
                </ol>

                <div>
                  <div className="text-xs font-semibold text-zinc-300 mb-2">Atalhos</div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <Link href="/admin/pagamentos" className="text-red-400 hover:underline">
                      Pedidos / Pagamentos
                    </Link>
                    <Link href="/admin/agendamentos" className="text-red-400 hover:underline">
                      Agendamentos
                    </Link>
                    <Link href="/admin/servicos" className="text-red-400 hover:underline">
                      Ordens / Serviços
                    </Link>
                    <Link
                      href="/admin/servicos-selecionados"
                      className="text-red-400 hover:underline"
                    >
                      Serviços Selecionados
                    </Link>
                    <Link href="/admin" className="text-red-400 hover:underline">
                      Dashboard
                    </Link>
                    <Link
                      href="/admin/controle-agendamento"
                      className="text-red-400 hover:underline"
                    >
                      Controle Operacional
                    </Link>
                    <Link href="/minha-conta" className="text-red-400 hover:underline">
                      Cupons (Minha Conta)
                    </Link>
                    {(latest.appointmentIds || []).map((id) => (
                      <Link
                        key={id}
                        href={`/admin/agendamentos?id=${id}`}
                        className="text-amber-400 hover:underline"
                      >
                        Apt #{id}
                      </Link>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold text-zinc-300 mb-2">Checklist</div>
                  <ul className="space-y-1 text-xs">
                    {latest.checks.map((c) => (
                      <li key={c.key} className="flex gap-2">
                        <span className={c.ok ? "text-green-400" : "text-zinc-600"}>
                          {c.ok ? "✓" : "○"}
                        </span>
                        <span className="text-zinc-300">{c.label}</span>
                        {c.detail && <span className="text-zinc-500">{c.detail}</span>}
                      </li>
                    ))}
                  </ul>
                </div>

                {latest.error && <p className="text-red-400 text-xs">{latest.error}</p>}
              </div>
            )}
          </Section>
        </Card>
      </div>

      {realOrder && (
        <Card>
          <Section title="Fluxo Real (banco)">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <Badge intent="success">origin=HOMOLOGATION</Badge>
              <span className="text-xs text-zinc-500">{realOrder.paymentDbId}</span>
              <span className="text-xs text-zinc-400">
                R$ {Number(realOrder.amount).toFixed(2)} · {realOrder.paymentStatus}
              </span>
            </div>
            <ol className="space-y-2 border-l border-emerald-900 pl-3 text-sm">
              {FLOW_LABELS.map((step) => {
                const ok = realOrder.flow[step.key];
                return (
                  <li key={step.key} className="flex gap-2 items-center">
                    <span className={ok ? "text-emerald-400" : "text-zinc-600"}>
                      {ok ? "✓" : "○"}
                    </span>
                    <span className={ok ? "text-zinc-200" : "text-zinc-500"}>{step.label}</span>
                  </li>
                );
              })}
            </ol>
            <div className="mt-4 text-xs text-zinc-400 space-y-1">
              <div>
                {realOrder.orderCount} Ordem(ns):{" "}
                {realOrder.serviceOrders.map((o) => o.serviceType).join(", ") || "—"}
              </div>
              <div>
                Cupons ({(realOrder.couponCategories || realOrder.couponTypes).join(", ") || "—"}):{" "}
                {realOrder.couponCodes.join(", ") || "—"}
              </div>
              <div>
                Agendamentos: {realOrder.appointmentIds.join(", ") || "—"}
                {realOrder.appointments.length > 0 &&
                  ` · status=${realOrder.appointments.map((a) => a.status).join(",")}`}
              </div>
              <div>
                Serviços:{" "}
                {realOrder.services.map((s) => `${s.tipo}:${s.status}`).join(", ") || "—"}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <Link href="/admin/pagamentos" className="text-emerald-400 hover:underline">
                Pagamentos
              </Link>
              <Link href="/admin/agendamentos" className="text-emerald-400 hover:underline">
                Agendamentos
              </Link>
              <Link href="/admin/servicos" className="text-emerald-400 hover:underline">
                Serviços
              </Link>
              <Link
                href="/admin/servicos-selecionados"
                className="text-emerald-400 hover:underline"
              >
                Serviços Selecionados
              </Link>
              <Link href="/admin" className="text-emerald-400 hover:underline">
                Dashboard
              </Link>
              <Link
                href="/admin/controle-agendamento"
                className="text-emerald-400 hover:underline"
              >
                Controle Operacional
              </Link>
              <Link href="/minha-conta" className="text-emerald-400 hover:underline">
                Minha Conta
              </Link>
            </div>
          </Section>
        </Card>
      )}

      {latest && (
        <Card>
          <Section title="Modo Livre (admin)">
            <p className="text-xs text-zinc-500 mb-3">
              Controles exclusivos da Homologação — usam o workflow oficial, sem alterar regras.
              Só atuam em artefatos SimulationProvider.
            </p>
            <div className="flex flex-wrap gap-2 mb-3">
              <span className="text-xs text-zinc-500 self-center">Refund:</span>
              {(["APPROVED", "PENDING", "FAILED", "TIMEOUT"] as const).map((o) => (
                <Button
                  key={o}
                  variant="outline"
                  size="xs"
                  disabled={busy}
                  onClick={() => void refundLatest(o)}
                >
                  {o}
                </Button>
              ))}
            </div>

            {(latest.appointmentIds || []).length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                <span className="text-xs text-zinc-500 self-center">Agendamento:</span>
                {(latest.appointmentIds || []).map((id) => (
                  <div key={id} className="flex flex-wrap gap-1 items-center">
                    <span className="text-xs text-zinc-400">#{id}</span>
                    <Button
                      size="xs"
                      variant="outline"
                      disabled={busy}
                      onClick={() =>
                        void labAction({ action: "approve_appointment", appointmentId: id })
                      }
                    >
                      Aceitar
                    </Button>
                    <Button
                      size="xs"
                      variant="outline"
                      disabled={busy}
                      onClick={() =>
                        void labAction({ action: "reject_appointment", appointmentId: id })
                      }
                    >
                      Recusar
                    </Button>
                    <Button
                      size="xs"
                      variant="outline"
                      disabled={busy}
                      onClick={() =>
                        void labAction({ action: "start_appointment", appointmentId: id })
                      }
                    >
                      Iniciar
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {latest.providerPaymentId && (
              <div className="flex flex-wrap gap-2 mb-3">
                <span className="text-xs text-zinc-500 self-center">Pagamento:</span>
                <Button
                  size="xs"
                  variant="outline"
                  disabled={busy}
                  onClick={() =>
                    void labAction({
                      action: "confirm_payment",
                      providerPaymentId: latest.providerPaymentId,
                    })
                  }
                >
                  Confirmar
                </Button>
                <Button
                  size="xs"
                  variant="outline"
                  disabled={busy}
                  onClick={() =>
                    void labAction({
                      action: "cancel_payment",
                      providerPaymentId: latest.providerPaymentId,
                    })
                  }
                >
                  Cancelar / Recusar
                </Button>
              </div>
            )}

            {(latest.serviceOrders || []).length > 0 && (
              <div className="space-y-2 mb-3">
                <div className="flex flex-wrap gap-2 items-end">
                  <Field label="Fase da Ordem" className="min-w-[160px]">
                    <Select
                      value={labPhase}
                      onChange={(e) => setLabPhase(e.target.value)}
                      options={SERVICE_ORDER_PHASES.map((p) => ({ value: p, label: p }))}
                    />
                  </Field>
                </div>
                {(latest.serviceOrders || []).map((o) => (
                  <div key={o.id} className="flex flex-wrap gap-2 items-center text-xs">
                    <span className="text-zinc-400">
                      {o.serviceType} ({o.phase})
                    </span>
                    <Button
                      size="xs"
                      variant="outline"
                      disabled={busy}
                      onClick={() =>
                        void labAction({
                          action: "set_order_phase",
                          serviceOrderId: o.id,
                          phase: labPhase,
                        })
                      }
                    >
                      Aplicar fase
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {(latest.serviceIds || []).length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                <span className="text-xs text-zinc-500 self-center">Entrega:</span>
                {(latest.serviceIds || []).map((sid) => (
                  <Button
                    key={sid}
                    size="xs"
                    variant="outline"
                    disabled={busy}
                    onClick={() => void labAction({ action: "simulate_delivery", serviceId: sid })}
                  >
                    Simular entrega {sid.slice(0, 8)}
                  </Button>
                ))}
              </div>
            )}

            {labMsg && <p className="text-sm text-amber-100">{labMsg}</p>}
          </Section>
        </Card>
      )}

      {latest && (
        <Card>
          <Section title="Timeline">
            <ol className="space-y-2 max-h-[40vh] overflow-y-auto text-xs">
              {latest.timeline.map((t, i) => (
                <li key={`${t.at}-${i}`} className="border-b border-zinc-800 pb-2">
                  <div className="text-zinc-500">{new Date(t.at).toLocaleString("pt-BR")}</div>
                  <div className={t.ok ? "text-zinc-200" : "text-red-300"}>
                    {t.step}
                    {t.detail ? ` — ${t.detail}` : ""}
                  </div>
                </li>
              ))}
            </ol>
          </Section>
        </Card>
      )}

      {runs.length > 1 && (
        <Card>
          <Section title="Runs recentes">
            <ul className="text-xs text-zinc-400 space-y-1">
              {runs.slice(0, 12).map((r) => (
                <li key={r.runId}>
                  <button
                    type="button"
                    className="hover:text-zinc-200 text-left"
                    onClick={() => setLatest(r)}
                  >
                    {r.runId} · {r.ok ? "PASS" : "FAIL"} ·{" "}
                    {r.scenarioId || (r.input?.freeLab ? "livre" : r.input?.tipo) || "?"} ·{" "}
                    {r.orderCount ?? r.serviceOrders?.length ?? "?"} OS ·{" "}
                    {new Date(r.startedAt).toLocaleString("pt-BR")}
                  </button>
                </li>
              ))}
            </ul>
          </Section>
        </Card>
      )}
    </div>
  );
}
