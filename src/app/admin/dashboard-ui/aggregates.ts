/**
 * GO-03C — Agregações de apresentação a partir de dados já existentes.
 * Nenhuma regra de negócio nova: apenas contagens/somas/médias de campos
 * já expostos pelas APIs admin. KPI sem base segura → null (Indisponível).
 */
import { inRange, type PeriodRange, previousPeriodRange } from "./period";
import type {
  DashAppointment,
  DashCoupon,
  DashPayment,
  DashPlan,
  DashService,
} from "./types";

const APPROVED = new Set(["approved", "received", "confirmed"]);

function isApproved(p: DashPayment): boolean {
  return APPROVED.has(String(p.status || "").toLowerCase());
}

function hasRefund(p: DashPayment): boolean {
  return Boolean(p.refundProcessedAt) || String(p.statusReembolso || "").toLowerCase().includes("refund");
}

export function sumRevenue(payments: DashPayment[], range: PeriodRange): number {
  return payments
    .filter((p) => isApproved(p) && inRange(p.createdAt, range))
    .reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
}

export function countApproved(payments: DashPayment[], range: PeriodRange): number {
  return payments.filter((p) => isApproved(p) && inRange(p.createdAt, range)).length;
}

export function countPendingPayments(payments: DashPayment[], range: PeriodRange): number {
  return payments.filter(
    (p) => String(p.status || "").toLowerCase() === "pending" && inRange(p.createdAt, range)
  ).length;
}

export function countRefunds(payments: DashPayment[], range: PeriodRange): number {
  return payments.filter((p) => hasRefund(p) && inRange(p.refundProcessedAt || p.updatedAt || p.createdAt, range)).length;
}

export function deltaPct(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}

export function revenueWithDelta(payments: DashPayment[], range: PeriodRange) {
  const current = sumRevenue(payments, range);
  const prev = previousPeriodRange(range);
  const previous = prev ? sumRevenue(payments, prev) : null;
  return {
    value: current,
    previous,
    delta: previous == null ? null : deltaPct(current, previous),
  };
}

export function appointmentsToday(apts: DashAppointment[]): DashAppointment[] {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return apts.filter((a) => {
    const t = new Date(a.data).getTime();
    return t >= start.getTime() && t <= end.getTime() && a.status !== "cancelado" && a.status !== "recusado";
  });
}

export function servicesInProgress(services: DashService[]): DashService[] {
  return services.filter((s) => s.status === "em_andamento");
}

export function pendingDeliveries(services: DashService[]): DashService[] {
  return services.filter((s) => s.status === "em_andamento" && !s.deliveryAudioUrl);
}

export function activeCoupons(coupons: DashCoupon[]): DashCoupon[] {
  const now = Date.now();
  return coupons.filter((c) => {
    if (c.used) return false;
    if (c.expiresAt && new Date(c.expiresAt).getTime() < now) return false;
    return true;
  });
}

export function activePlans(plans: DashPlan[]): DashPlan[] {
  return plans.filter((p) => p.status === "active");
}

/** Stale: em andamento há > N dias (updatedAt ou createdAt). */
export function staleInProgress(services: DashService[], days = 7): DashService[] {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return services.filter((s) => {
    if (s.status !== "em_andamento") return false;
    const ref = new Date(s.updatedAt || s.createdAt).getTime();
    return !Number.isNaN(ref) && ref < cutoff;
  });
}

export function pendingRefunds(apts: DashAppointment[]): DashAppointment[] {
  return apts.filter(
    (a) =>
      a.status === "cancelado" &&
      a.cancelRefundOption === "reembolso" &&
      !a.refundProcessedAt
  );
}

/* ---------------------------------- KPIs ---------------------------------- */

export type KpiValue = { available: true; value: number; unit: "ms" | "pct" | "number" } | { available: false };

/** Tempo médio Service.acceptedAt − createdAt (único timestamp de aceite disponível). */
export function kpiAvgAcceptMs(services: DashService[], range: PeriodRange): KpiValue {
  const samples = services
    .filter((s) => s.acceptedAt && inRange(s.acceptedAt, range))
    .map((s) => new Date(s.acceptedAt!).getTime() - new Date(s.createdAt).getTime())
    .filter((ms) => Number.isFinite(ms) && ms >= 0);
  if (samples.length === 0) return { available: false };
  return { available: true, value: samples.reduce((a, b) => a + b, 0) / samples.length, unit: "ms" };
}

/** Tempo médio pagamento → entrega: payment do serviço + deliveryAudioUrl + updatedAt como proxy frágil → Indisponível.
 *  Sem completedAt/deliveryDate no payload, não calculamos. */
export function kpiAvgPaymentToDelivery(): KpiValue {
  return { available: false };
}

export function kpiAvgStart(): KpiValue {
  return { available: false };
}

export function kpiAvgComplete(): KpiValue {
  return { available: false };
}

export function kpiCancelRate(apts: DashAppointment[], range: PeriodRange): KpiValue {
  const inPeriod = apts.filter((a) => inRange(a.createdAt, range));
  if (inPeriod.length === 0) return { available: true, value: 0, unit: "pct" };
  const cancelled = inPeriod.filter((a) => a.status === "cancelado").length;
  return { available: true, value: (cancelled / inPeriod.length) * 100, unit: "pct" };
}

export function kpiRefundRate(payments: DashPayment[], range: PeriodRange): KpiValue {
  const approved = payments.filter((p) => isApproved(p) && inRange(p.createdAt, range));
  if (approved.length === 0) return { available: true, value: 0, unit: "pct" };
  const refunded = payments.filter((p) => hasRefund(p) && inRange(p.refundProcessedAt || p.createdAt, range)).length;
  return { available: true, value: (refunded / approved.length) * 100, unit: "pct" };
}

/** Conversão de pagamentos = aprovados / total no período. */
export function kpiPaymentConversion(payments: DashPayment[], range: PeriodRange): KpiValue {
  const total = payments.filter((p) => inRange(p.createdAt, range));
  if (total.length === 0) return { available: true, value: 0, unit: "pct" };
  const approved = total.filter(isApproved).length;
  return { available: true, value: (approved / total.length) * 100, unit: "pct" };
}

/** Conversão de cupons = usados / total no período (por createdAt). */
export function kpiCouponConversion(coupons: DashCoupon[], range: PeriodRange): KpiValue {
  const total = coupons.filter((c) => inRange(c.createdAt, range));
  if (total.length === 0) return { available: true, value: 0, unit: "pct" };
  const used = total.filter((c) => c.used).length;
  return { available: true, value: (used / total.length) * 100, unit: "pct" };
}

/** Conversão de planos: sem funil (visitas/checkout) → Indisponível. */
export function kpiPlanConversion(): KpiValue {
  return { available: false };
}

/* -------------------------------- Charts ---------------------------------- */

export function revenueByDay(payments: DashPayment[], range: PeriodRange): { label: string; valor: number }[] {
  if (!range.from || !range.to) {
    // últimos 14 dias como fallback visual quando "todos"
    const to = new Date();
    to.setHours(23, 59, 59, 999);
    const from = new Date(to);
    from.setDate(from.getDate() - 13);
    from.setHours(0, 0, 0, 0);
    return revenueByDay(payments, { key: "custom", from, to, label: "14d" });
  }
  const buckets: { label: string; valor: number }[] = [];
  const cursor = new Date(range.from);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(range.to);
  while (cursor <= end) {
    const dayStart = new Date(cursor);
    const dayEnd = new Date(cursor);
    dayEnd.setHours(23, 59, 59, 999);
    const valor = payments
      .filter((p) => isApproved(p))
      .filter((p) => {
        const t = new Date(p.createdAt).getTime();
        return t >= dayStart.getTime() && t <= dayEnd.getTime();
      })
      .reduce((s, p) => s + (Number(p.amount) || 0), 0);
    buckets.push({
      label: dayStart.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      valor,
    });
    cursor.setDate(cursor.getDate() + 1);
  }
  return buckets;
}

/** Últimas N semanas (receita aprovada por semana ISO-ish: domingo→sábado local). */
export function revenueByWeek(payments: DashPayment[], weeks = 8): { label: string; valor: number }[] {
  const buckets: { label: string; valor: number; start: Date }[] = [];
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  // início da semana corrente (domingo)
  const weekStart = new Date(end);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);

  for (let i = weeks - 1; i >= 0; i--) {
    const start = new Date(weekStart);
    start.setDate(start.getDate() - i * 7);
    const finish = new Date(start);
    finish.setDate(finish.getDate() + 6);
    finish.setHours(23, 59, 59, 999);
    const valor = payments
      .filter((p) => isApproved(p))
      .filter((p) => {
        const t = new Date(p.createdAt).getTime();
        return t >= start.getTime() && t <= finish.getTime();
      })
      .reduce((s, p) => s + (Number(p.amount) || 0), 0);
    buckets.push({
      label: start.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      valor,
      start,
    });
  }
  return buckets.map(({ label, valor }) => ({ label, valor }));
}

export function revenueByMonth(payments: DashPayment[], year: number): { label: string; valor: number }[] {
  const buckets: { label: string; valor: number }[] = [];
  for (let m = 0; m < 12; m++) {
    const start = new Date(year, m, 1);
    const end = new Date(year, m + 1, 0, 23, 59, 59, 999);
    const valor = payments
      .filter((p) => isApproved(p))
      .filter((p) => {
        const t = new Date(p.createdAt).getTime();
        return t >= start.getTime() && t <= end.getTime();
      })
      .reduce((s, p) => s + (Number(p.amount) || 0), 0);
    buckets.push({
      label: start.toLocaleDateString("pt-BR", { month: "short" }),
      valor,
    });
  }
  return buckets;
}

export function servicesByCategory(services: DashService[], range: PeriodRange): { label: string; valor: number }[] {
  const map = new Map<string, number>();
  for (const s of services.filter((x) => inRange(x.createdAt, range))) {
    const key = normalizeTipo(s.tipo);
    map.set(key, (map.get(key) || 0) + 1);
  }
  return Array.from(map.entries())
    .map(([label, valor]) => ({ label, valor }))
    .sort((a, b) => b.valor - a.valor);
}

function normalizeTipo(tipo: string): string {
  const t = String(tipo || "").toLowerCase().replace(/\s+/g, "_");
  if (t === "sessao" || t === "captacao") return "Sessão";
  if (t.startsWith("beat") && t !== "beat_mix_master") return "Beat";
  if (t === "mix" || t === "mixagem") return "Mixagem";
  if (t === "master" || t === "masterizacao") return "Masterização";
  if (t === "mix_master") return "Mix + Master";
  if (t === "producao_completa") return "Produção";
  if (t === "sonoplastia") return "Sonoplastia";
  if (t === "beat_mix_master" || t.includes("pacote")) return "Pacotes";
  return tipo || "Outros";
}

export function plansSoldByPeriod(plans: DashPlan[], range: PeriodRange): { label: string; valor: number }[] {
  const map = new Map<string, number>();
  for (const p of plans.filter((x) => inRange(x.createdAt, range))) {
    map.set(p.planName || "Plano", (map.get(p.planName || "Plano") || 0) + 1);
  }
  return Array.from(map.entries())
    .map(([label, valor]) => ({ label, valor }))
    .sort((a, b) => b.valor - a.valor);
}

export function cancellationsByDay(apts: DashAppointment[], range: PeriodRange): { label: string; valor: number }[] {
  const cancelled = apts.filter((a) => a.status === "cancelado" && inRange(a.cancelledAt || a.createdAt, range));
  const map = new Map<string, number>();
  for (const a of cancelled) {
    const d = new Date(a.cancelledAt || a.createdAt);
    const label = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    map.set(label, (map.get(label) || 0) + 1);
  }
  return Array.from(map.entries()).map(([label, valor]) => ({ label, valor }));
}

export function refundsByDay(payments: DashPayment[], range: PeriodRange): { label: string; valor: number }[] {
  const refunded = payments.filter((p) => hasRefund(p) && inRange(p.refundProcessedAt || p.createdAt, range));
  const map = new Map<string, number>();
  for (const p of refunded) {
    const d = new Date(p.refundProcessedAt || p.createdAt);
    const label = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    map.set(label, (map.get(label) || 0) + 1);
  }
  return Array.from(map.entries()).map(([label, valor]) => ({ label, valor }));
}

export function formatCurrency(n: number): string {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatDuration(ms: number): string {
  const h = ms / 3600000;
  if (h < 1) return `${Math.round(ms / 60000)} min`;
  if (h < 48) return `${h.toFixed(1)} h`;
  return `${(h / 24).toFixed(1)} d`;
}

export function formatPct(n: number): string {
  return `${n.toFixed(1)}%`;
}

export function formatDelta(delta: number | null): string | null {
  if (delta == null) return null;
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta.toFixed(0)}%`;
}
