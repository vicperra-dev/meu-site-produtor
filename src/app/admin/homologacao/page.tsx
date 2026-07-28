"use client";

/**
 * GO-H10A — Homologação: sessões Livre / Beats / Planos / Ferramentas.
 * Laboratório (Simulation) + Pedido real (HOMOLOGATION).
 */
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
  CatalogSelectionPanels,
  CatalogPurchaseSummary,
} from "@/app/agendamento/components/CatalogSelectionPanels";
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
import { IntegridadePanel } from "./IntegridadePanel";
import {
  HomologationPlanButtons,
  type PlanModo,
  type PlanTier,
} from "./HomologationPlanButtons";

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

type SessionId = "livre" | "beats" | "planos" | "ferramentas";
type ToolId = "integridade" | "limpeza" | "pedido" | "lab" | "modo-livre";

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

const SESSIONS: Array<{ id: SessionId; label: string }> = [
  { id: "livre", label: "Seleção Livre" },
  { id: "beats", label: "Beats e Produções" },
  { id: "planos", label: "Planos" },
  { id: "ferramentas", label: "Ferramentas" },
];

const TOOLS: Array<{ id: ToolId; label: string }> = [
  { id: "lab", label: "Simulation / Teste" },
  { id: "pedido", label: "Pedido de Homologação" },
  { id: "limpeza", label: "Limpeza / Dry Run" },
  { id: "integridade", label: "Integridade" },
  { id: "modo-livre", label: "Modo Livre" },
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

function parseSession(raw: string | null): SessionId {
  if (raw === "beats" || raw === "planos" || raw === "ferramentas" || raw === "livre") {
    return raw;
  }
  return "livre";
}

function parseTool(raw: string | null): ToolId {
  if (
    raw === "integridade" ||
    raw === "limpeza" ||
    raw === "pedido" ||
    raw === "lab" ||
    raw === "modo-livre"
  ) {
    return raw;
  }
  return "lab";
}

export default function HomologacaoAdminPage() {
  return (
    <Suspense fallback={<LoadingBlock label="Carregando Homologação…" />}>
      <HomologacaoAdminContent />
    </Suspense>
  );
}

function HomologacaoAdminContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const session = parseSession(searchParams.get("session"));
  const tool = parseTool(searchParams.get("tool"));

  const setSessionNav = useCallback(
    (nextSession: SessionId, nextTool?: ToolId) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("session", nextSession);
      if (nextSession === "ferramentas") {
        params.set("tool", nextTool || tool || "lab");
      } else {
        params.delete("tool");
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams, tool]
  );

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
  const [planModo, setPlanModo] = useState<PlanModo>("mensal");
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
    setPlanModo("mensal");
    if (preset.qty) {
      setQty({ ...preset.qty });
    } else if (id === "livre") {
      setQty(emptyQty());
    } else if (preset.scenarioId && !preset.qty) {
      // cenários sem qty (plano / desconto / refund) — limpa catálogo
      setQty(emptyQty());
    }
    if (
      opensSchedule ||
      (preset.qty &&
        countServiceOrders(
          qtyToLines(preset.qty || {}).servicos,
          qtyToLines(preset.qty || {}).beats
        ) === 1)
    ) {
      setData(tomorrowIso());
      setHora(needsHour ? "14:00" : PRODUCTION_SCHEDULE_DEFAULT_HOUR);
    }
  }

  function bumpQty(id: CanonicalServiceId, delta: number) {
    setPresetId("livre");
    setPlanId("");
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

      // Plano / cenários oficiais sem seleção livre (mesmo pipeline do botão dedicado)
      if (planId || (preset?.scenarioId && !preset.qty && presetId !== "livre")) {
        const res = await fetch("/api/admin/homologation/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scenarioId: preset?.scenarioId,
            planId: planId || undefined,
            tipo: planId ? "plano" : undefined,
            modo: planId ? planModo : undefined,
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
        body.hora = presencial ? hora || "14:00" : PRODUCTION_SCHEDULE_DEFAULT_HOUR;
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

  async function runPlanSimulation(selectedPlanId: PlanTier, modo: PlanModo) {
    setBusy(true);
    setMessage(null);
    setPlanId(selectedPlanId);
    setPlanModo(modo);
    setPresetId("plano");
    try {
      // Sem scenarioId — anual precisa do modo explícito no engine.
      const res = await fetch("/api/admin/homologation/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: "plano",
          planId: selectedPlanId,
          modo,
          paymentOutcome,
          runRefund,
        }),
      });
      const dataRes = await res.json();
      if (!res.ok) {
        setMessage(dataRes.error || "Falha na simulação de plano.");
        return;
      }
      setLatest(dataRes.run);
      setMessage(
        dataRes.run.ok
          ? `Plano ${selectedPlanId} (${modo}) PASS.`
          : "Simulação de plano com falhas — veja debug."
      );
      await refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Erro inesperado.");
    } finally {
      setBusy(false);
    }
  }

  async function forceRenewLatestPlan() {
    setBusy(true);
    setMessage(null);
    try {
      const paymentDbId = latest?.paymentDbId;
      if (!paymentDbId) {
        setMessage("Execute um plano primeiro (precisa de paymentDbId no run).");
        return;
      }
      const res = await fetch("/api/admin/homologation/renew-benefits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentDbId }),
      });
      const dataRes = await res.json();
      if (!res.ok) {
        setMessage(dataRes.error || "Falha na renovação do ciclo.");
        return;
      }
      setMessage(
        `Ciclo renovado: ${dataRes.result?.generatedCoupons ?? 0} cupons novos · ${dataRes.result?.substitutedCoupons ?? 0} substituídos (ativos=${dataRes.activeCoupons?.length ?? 0} / esperados=${dataRes.expectedCycleCoupons}).`
      );
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

  function renderOrderMeta() {
    return (
      <div className="rounded-md border border-zinc-800 bg-zinc-950/50 p-3 text-xs space-y-1">
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
    );
  }

  function renderSimulationControls() {
    return (
      <div className="space-y-3">
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
        <label className="flex items-center gap-2 text-xs text-zinc-400">
          <input
            type="checkbox"
            checked={runRefund}
            onChange={(e) => setRunRefund(e.target.checked)}
          />
          Executar reembolso após confirmar
        </label>
      </div>
    );
  }

  function renderTesteActions() {
    return (
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <Button
            variant="primary"
            loading={busy}
            onClick={() => void simulatePayment()}
            className="!bg-amber-600 hover:!bg-amber-500"
          >
            Teste
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
        <p className="text-xs text-zinc-500">
          Usa o mesmo pipeline do <code className="text-zinc-400">SimulationProvider</code>{" "}
          (criação → webhook oficial → efeitos de domínio).
        </p>
        {message && <p className="text-sm text-amber-100">{message}</p>}
      </div>
    );
  }

  function renderPresets() {
    return (
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
    );
  }

  function renderPedidoHomologacao() {
    return (
      <div className="space-y-3">
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
    );
  }

  function renderLimpeza() {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-red-300">Limpeza da Homologação (GO-H8B)</h3>
        <p className="text-xs text-zinc-500">
          Único ponto de exclusão: <code className="text-zinc-400">purgeOrderTree</code> por Pedido
          Raiz. Dry-run obrigatório antes de confirmar. Asaas real nunca é tocado.
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
    );
  }

  function renderModoLivre() {
    if (!latest) {
      return <p className="text-sm text-zinc-500">Nenhuma simulação ainda para controlar.</p>;
    }
    return (
      <div className="space-y-3">
        <p className="text-xs text-zinc-500">
          Controles exclusivos da Homologação — usam o workflow oficial, sem alterar regras. Só
          atuam em artefatos SimulationProvider.
        </p>
        <div className="flex flex-wrap gap-2">
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
          <div className="flex flex-wrap gap-2">
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
          <div className="flex flex-wrap gap-2">
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
          <div className="space-y-2">
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
          <div className="flex flex-wrap gap-2">
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
      </div>
    );
  }

  function renderDebugPanels() {
    return (
      <>
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
                    Pedido <code className="text-zinc-300">{latest.paymentDbId || "—"}</code>
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
                  Cupons ({(realOrder.couponCategories || realOrder.couponTypes).join(", ") || "—"}
                  ): {realOrder.couponCodes.join(", ") || "—"}
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
      </>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Homologação"
        subtitle={
          <>
            Sessões de QA: catálogo compartilhado com Agendamento, planos Mensal/Anual e
            ferramentas (Lab <code className="text-zinc-300">SimulationProvider</code> + Pedido{" "}
            <code className="text-zinc-300">origin=HOMOLOGATION</code>).
          </>
        }
        icon="sparkles"
      />

      <div className="flex flex-wrap gap-2">
        {SESSIONS.map((s) => (
          <Button
            key={s.id}
            size="sm"
            variant={session === s.id ? "primary" : "outline"}
            onClick={() => setSessionNav(s.id, s.id === "ferramentas" ? tool : undefined)}
          >
            {s.label}
          </Button>
        ))}
      </div>

      {session === "livre" && (
        <div className="space-y-6">
          <CatalogSelectionPanels
            qty={qty}
            onBump={bumpQty}
            showStudio
            showBeats={false}
            sectionStyle="marketing"
          />
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <Section title="Resumo e Teste">
                <CatalogPurchaseSummary qty={qty} />
                <div className="mt-4">{renderOrderMeta()}</div>
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
                <div className="mt-4">{renderSimulationControls()}</div>
                <div className="mt-4">{renderTesteActions()}</div>
              </Section>
            </Card>
            {renderDebugPanels()}
          </div>
        </div>
      )}

      {session === "beats" && (
        <div className="space-y-6">
          <CatalogSelectionPanels
            qty={qty}
            onBump={bumpQty}
            showStudio={false}
            showBeats
            sectionStyle="marketing"
          />
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <Section title="Resumo e Teste">
                <CatalogPurchaseSummary qty={qty} />
                <div className="mt-4">{renderOrderMeta()}</div>
                <div className="mt-4">{renderSimulationControls()}</div>
                <div className="mt-4">{renderTesteActions()}</div>
              </Section>
            </Card>
            {renderDebugPanels()}
          </div>
        </div>
      )}

      {session === "planos" && (
        <div className="space-y-6">
          <Card>
            <Section title="Planos (Mensal / Anual)">
              <HomologationPlanButtons
                busy={busy}
                onSelect={(id, modo) => void runPlanSimulation(id, modo)}
              />
              <div className="mt-4">{renderSimulationControls()}</div>
              {message && <p className="text-sm text-amber-100 mt-3">{message}</p>}
              <div className="mt-4 border-t border-zinc-800 pt-4 space-y-2">
                <p className="text-xs text-zinc-500">
                  GO-H10B — Força a renovação mensal do último UserPlan gerado (substitui cupons
                  não usados e emite o novo ciclo via PLAN_DEFINITIONS).
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busy || !latest?.paymentDbId}
                  loading={busy}
                  onClick={() => void forceRenewLatestPlan()}
                >
                  Renovar ciclo mensal (último plano)
                </Button>
              </div>
            </Section>
          </Card>
          {renderDebugPanels()}
        </div>
      )}

      {session === "ferramentas" && (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2">
            {TOOLS.map((t) => (
              <Button
                key={t.id}
                size="xs"
                variant={tool === t.id ? "primary" : "outline"}
                onClick={() => setSessionNav("ferramentas", t.id)}
              >
                {t.label}
              </Button>
            ))}
          </div>

          {tool === "lab" && (
            <div className="space-y-4">
              {renderPresets()}
              <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                  <Section title="Lab / Teste">
                    <CatalogPurchaseSummary qty={qty} />
                    <div className="mt-4">{renderOrderMeta()}</div>
                    <div className="mt-4">{renderSimulationControls()}</div>
                    <div className="mt-4">{renderTesteActions()}</div>
                  </Section>
                </Card>
                {renderDebugPanels()}
              </div>
            </div>
          )}

          {tool === "pedido" && (
            <div className="space-y-4">
              <Card>
                <Section title="Pedido de Homologação">
                  <CatalogPurchaseSummary qty={qty} />
                  <div className="mt-4">{renderOrderMeta()}</div>
                  <div className="mt-4">{renderPedidoHomologacao()}</div>
                </Section>
              </Card>
              {renderDebugPanels()}
            </div>
          )}

          {tool === "limpeza" && (
            <Card>
              <Section title="Limpeza">{renderLimpeza()}</Section>
            </Card>
          )}

          {tool === "integridade" && <IntegridadePanel embedded />}

          {tool === "modo-livre" && (
            <div className="space-y-4">
              <Card>
                <Section title="Modo Livre (admin)">{renderModoLivre()}</Section>
              </Card>
              {renderDebugPanels()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
