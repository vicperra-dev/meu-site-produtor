"use client";

/**
 * GO-03C — Cockpit Executivo do Admin.
 * Somente UI: consome APIs admin já certificadas e agrega no cliente.
 * Nenhum endpoint novo, nenhuma regra de domínio, nenhum KPI inventado.
 */
import { Suspense, useCallback, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useDomainRefresh } from "@/app/hooks/useDomainRefresh";
import { Icons } from "@/app/admin/servicos-ui/meta";
import { BoardSkeleton } from "@/app/admin/servicos-ui/States";
import {
  activeCoupons,
  activePlans,
  appointmentsToday,
  cancellationsByDay,
  countApproved,
  countPendingPayments,
  countRefunds,
  formatCurrency,
  formatDelta,
  formatDuration,
  formatPct,
  kpiAvgAcceptMs,
  kpiAvgComplete,
  kpiAvgPaymentToDelivery,
  kpiAvgStart,
  kpiCancelRate,
  kpiCouponConversion,
  kpiPaymentConversion,
  kpiPlanConversion,
  kpiRefundRate,
  pendingDeliveries,
  pendingRefunds,
  plansSoldByPeriod,
  refundsByDay,
  revenueByDay,
  revenueByMonth,
  revenueByWeek,
  revenueWithDelta,
  servicesByCategory,
  servicesInProgress,
  staleInProgress,
  sumRevenue,
} from "./aggregates";
import { DashboardCalendar, DashboardTimeline, buildTimeline } from "./DashboardTimeline";
import { DashboardChart } from "./DashboardChart";
import { DashboardToolbar } from "./DashboardToolbar";
import {
  DashboardAlert,
  DashboardCard,
  DashboardEmptyState,
  DashboardKPI,
  DashboardSection,
  DashboardWidget,
} from "./primitives";
import { resolvePeriod, type PeriodKey } from "./period";
import { fetchJson, useIndependentFetch } from "./useIndependentFetch";
import type {
  DashAppointment,
  DashCoupon,
  DashPayment,
  DashPlan,
  DashService,
  DashStats,
} from "./types";

function kpiLabel(k: { available: boolean; value?: number; unit?: string }): string {
  if (!k.available || k.value == null) return "Indisponível";
  if (k.unit === "ms") return formatDuration(k.value);
  if (k.unit === "pct") return formatPct(k.value);
  return String(Math.round(k.value));
}

function ExecutiveDashboardInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const periodKey = (searchParams.get("periodo") as PeriodKey) || "mes";
  const customFrom = searchParams.get("from") || "";
  const customTo = searchParams.get("to") || "";
  const range = useMemo(
    () => resolvePeriod(periodKey, customFrom, customTo),
    [periodKey, customFrom, customTo]
  );

  const writePeriod = useCallback(
    (key: PeriodKey, from?: string, to?: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (key === "mes") params.delete("periodo");
      else params.set("periodo", key);
      if (key === "custom") {
        if (from) params.set("from", from);
        else params.delete("from");
        if (to) params.set("to", to);
        else params.delete("to");
      } else {
        params.delete("from");
        params.delete("to");
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  const [refreshTick, setRefreshTick] = useState(0);

  useDomainRefresh("dashboard", () => setRefreshTick((t) => t + 1));

  /* -------------------- Fetches independentes -------------------- */

  const statsQ = useIndependentFetch(
    `stats-${refreshTick}`,
    async () => fetchJson<DashStats>("/api/admin/stats"),
    [refreshTick]
  );

  const paymentsQ = useIndependentFetch(
    `pay-${refreshTick}`,
    async () => {
      const data = await fetchJson<{ pagamentos: DashPayment[] }>("/api/admin/pagamentos");
      return data.pagamentos || [];
    },
    [refreshTick]
  );

  const servicesQ = useIndependentFetch(
    `svc-${refreshTick}`,
    async () => {
      const data = await fetchJson<{ servicos: DashService[] }>("/api/admin/servicos");
      return data.servicos || [];
    },
    [refreshTick]
  );

  const aptsQ = useIndependentFetch(
    `apt-${refreshTick}`,
    async () => {
      const data = await fetchJson<{ agendamentos: DashAppointment[] }>("/api/admin/agendamentos");
      return data.agendamentos || [];
    },
    [refreshTick]
  );

  const couponsQ = useIndependentFetch(
    `cup-${refreshTick}`,
    async () => {
      const data = await fetchJson<{ cupons: DashCoupon[] }>("/api/admin/cupons");
      return data.cupons || [];
    },
    [refreshTick]
  );

  const plansQ = useIndependentFetch(
    `pln-${refreshTick}`,
    async () => {
      const data = await fetchJson<{ planos: DashPlan[] }>("/api/admin/planos");
      return data.planos || [];
    },
    [refreshTick]
  );

  const payments = paymentsQ.data || [];
  const services = servicesQ.data || [];
  const appointments = aptsQ.data || [];
  const coupons = couponsQ.data || [];
  const plans = plansQ.data || [];

  /* -------------------- Derivações -------------------- */

  const hojeRange = resolvePeriod("hoje");
  const semanaRange = resolvePeriod("7d");
  const mesRange = resolvePeriod("mes");
  const todosRange = resolvePeriod("todos");

  const revHoje = revenueWithDelta(payments, hojeRange);
  const revSemana = revenueWithDelta(payments, semanaRange);
  const revMes = revenueWithDelta(payments, mesRange);
  const revTotal = sumRevenue(payments, todosRange);

  const approvedCount = countApproved(payments, range);
  const pendingPayCount = countPendingPayments(payments, range);
  const refundCount = countRefunds(payments, range);
  const aptsHoje = appointmentsToday(appointments);
  const aptsPendentes = appointments.filter((a) => a.status === "pendente");
  const svcAndamento = servicesInProgress(services);
  const entregasPend = pendingDeliveries(services);
  const planosAtivos = activePlans(plans);
  const cuponsAtivos = activeCoupons(coupons);
  const clientesAtivos = statsQ.data?.users ?? null;

  const alerts = useMemo(() => {
    const list: { href: string; tone: "amber" | "red" | "sky" | "orange"; title: string; detail?: string }[] = [];
    if (aptsPendentes.length > 0) {
      list.push({
        href: "/admin/agendamentos/pendentes",
        tone: "amber",
        title: `${aptsPendentes.length} agendamento(s) aguardando aceite`,
        detail: "Clique para revisar a fila de pendentes.",
      });
    }
    if (pendingPayCount > 0) {
      list.push({
        href: "/admin/pagamentos",
        tone: "orange",
        title: `${pendingPayCount} pagamento(s) pendente(s)`,
        detail: "No período selecionado.",
      });
    }
    const refundsWaiting = pendingRefunds(appointments);
    if (refundsWaiting.length > 0) {
      list.push({
        href: "/admin/agendamentos/cancelados",
        tone: "sky",
        title: `${refundsWaiting.length} reembolso(s) aguardando processamento`,
      });
    }
    if (entregasPend.length > 0) {
      list.push({
        href: "/admin/servicos/em-andamento",
        tone: "amber",
        title: `${entregasPend.length} entrega(s) / upload(s) pendente(s)`,
        detail: "Serviços em andamento sem arquivo de entrega.",
      });
    }
    const stale = staleInProgress(services, 7);
    if (stale.length > 0) {
      list.push({
        href: "/admin/servicos/em-andamento",
        tone: "red",
        title: `${stale.length} serviço(s) parado(s) em andamento há 7+ dias`,
      });
    }
    return list;
  }, [aptsPendentes.length, pendingPayCount, appointments, entregasPend.length, services]);

  const timeline = useMemo(
    () => buildTimeline({ payments, appointments, services, coupons }),
    [payments, appointments, services, coupons]
  );

  const chartDay = useMemo(() => revenueByDay(payments, range), [payments, range]);
  const chartWeek = useMemo(() => revenueByWeek(payments, 8), [payments]);
  const chartMonth = useMemo(
    () => revenueByMonth(payments, new Date().getFullYear()),
    [payments]
  );
  const chartCats = useMemo(() => servicesByCategory(services, range), [services, range]);
  const chartPlans = useMemo(() => plansSoldByPeriod(plans, range), [plans, range]);
  const chartCancel = useMemo(() => cancellationsByDay(appointments, range), [appointments, range]);
  const chartRefund = useMemo(() => refundsByDay(payments, range), [payments, range]);

  const cardsLoading = paymentsQ.status === "loading" || aptsQ.status === "loading" || servicesQ.status === "loading";

  /** Cenário A: APIs OK, banco operacional vazio após reset — não é bug. */
  const indicatorsEmpty =
    paymentsQ.status === "success" &&
    aptsQ.status === "success" &&
    servicesQ.status === "success" &&
    plansQ.status === "success" &&
    payments.length === 0 &&
    appointments.length === 0 &&
    services.length === 0 &&
    plans.length === 0;

  const chartsHaveData = useMemo(() => {
    const series = [chartDay, chartWeek, chartMonth, chartCats, chartPlans, chartCancel, chartRefund];
    return series.some((rows) => rows.some((d) => Number(d.valor || 0) > 0));
  }, [chartDay, chartWeek, chartMonth, chartCats, chartPlans, chartCancel, chartRefund]);

  const indicatorsHardError =
    paymentsQ.status === "error" &&
    aptsQ.status === "error" &&
    servicesQ.status === "error"
      ? paymentsQ.error || aptsQ.error || servicesQ.error
      : null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-zinc-100 sm:text-4xl">Dashboard Executivo</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Cockpit operacional — receita, fila, entregas e atividade em um só lugar.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setRefreshTick((t) => t + 1)}
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-600 bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-700"
        >
          <Icons.refresh className="w-3.5 h-3.5" />
          Atualizar
        </button>
      </div>

      {/* Filtro global */}
      <DashboardToolbar
        period={periodKey}
        from={customFrom}
        to={customTo}
        onPeriod={(k) => writePeriod(k)}
        onCustom={(f, t) => writePeriod("custom", f, t)}
      />

      {/* Alertas */}
      {alerts.length > 0 && (
        <DashboardSection title="Alertas operacionais" subtitle="Somente o que exige atenção agora">
          <div className="grid gap-2 md:grid-cols-2">
            {alerts.map((a) => (
              <DashboardAlert key={a.title} {...a} />
            ))}
          </div>
        </DashboardSection>
      )}

      {/* Cards executivos */}
      <DashboardSection title="Indicadores" subtitle={`Filtro ativo: ${range.label}`}>
        <DashboardWidget
          loading={cardsLoading && !paymentsQ.data && paymentsQ.status === "loading"}
          error={indicatorsHardError}
          onRetry={() => setRefreshTick((t) => t + 1)}
          minHeight="min-h-[200px]"
        >
          {indicatorsEmpty ? (
            <DashboardEmptyState
              title="Nenhum dado disponível ainda."
              description="Os indicadores serão preenchidos automaticamente após os primeiros pagamentos."
              minHeight="min-h-[200px]"
            />
          ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7">
            <DashboardCard
              href="/admin/pagamentos"
              icon={<Icons.card className="w-4 h-4" />}
              label="Receita hoje"
              value={formatCurrency(revHoje.value)}
              delta={formatDelta(revHoje.delta)}
              badge="Hoje"
              accent="text-emerald-300"
              tooltip="Soma de pagamentos aprovados criados hoje"
            />
            <DashboardCard
              href="/admin/pagamentos"
              icon={<Icons.card className="w-4 h-4" />}
              label="Receita semana"
              value={formatCurrency(revSemana.value)}
              delta={formatDelta(revSemana.delta)}
              badge="7d"
              accent="text-emerald-300"
              tooltip="Pagamentos aprovados nos últimos 7 dias"
            />
            <DashboardCard
              href="/admin/pagamentos"
              icon={<Icons.card className="w-4 h-4" />}
              label="Receita mês"
              value={formatCurrency(revMes.value)}
              delta={formatDelta(revMes.delta)}
              badge="Mês"
              accent="text-emerald-300"
              tooltip="Pagamentos aprovados neste mês"
            />
            <DashboardCard
              href="/admin/pagamentos"
              icon={<Icons.card className="w-4 h-4" />}
              label="Receita total"
              value={formatCurrency(revTotal)}
              badge="Total"
              accent="text-emerald-300"
              tooltip="Soma de todos os pagamentos aprovados"
            />
            <DashboardCard
              href="/admin/pagamentos"
              icon={<Icons.check className="w-4 h-4" />}
              label="Pagamentos aprovados"
              value={approvedCount}
              badge={range.label}
              accent="text-green-300"
              tooltip="Quantidade de pagamentos approved no período do filtro"
            />
            <DashboardCard
              href="/admin/pagamentos"
              icon={<Icons.clock className="w-4 h-4" />}
              label="Pagamentos pendentes"
              value={pendingPayCount}
              badge={range.label}
              accent="text-amber-300"
              tooltip="Pagamentos com status pending no período"
            />
            <DashboardCard
              href="/admin/pagamentos"
              icon={<Icons.refresh className="w-4 h-4" />}
              label="Reembolsos"
              value={refundCount}
              badge={range.label}
              accent="text-sky-300"
              tooltip="Pagamentos com trilha de reembolso no período"
            />
            <DashboardCard
              href="/admin/agendamentos/todos"
              icon={<Icons.calendar className="w-4 h-4" />}
              label="Agendamentos hoje"
              value={aptsHoje.length}
              badge="Hoje"
              accent="text-blue-300"
              tooltip="Agendamentos com data de hoje (exceto cancelados/recusados)"
            />
            <DashboardCard
              href="/admin/agendamentos/pendentes"
              icon={<Icons.clock className="w-4 h-4" />}
              label="Agend. pendentes"
              value={aptsPendentes.length}
              badge="Fila"
              accent="text-amber-300"
              tooltip="Agendamentos aguardando aceite"
            />
            <DashboardCard
              href="/admin/servicos/em-andamento"
              icon={<Icons.play className="w-4 h-4" />}
              label="Serviços em andamento"
              value={svcAndamento.length}
              badge="Ops"
              accent="text-blue-300"
              tooltip="Serviços com status em_andamento"
            />
            <DashboardCard
              href="/admin/servicos/em-andamento"
              icon={<Icons.upload className="w-4 h-4" />}
              label="Entregas pendentes"
              value={entregasPend.length}
              badge="Upload"
              accent="text-purple-300"
              tooltip="Em andamento sem deliveryAudioUrl"
            />
            <DashboardCard
              href="/admin/usuarios"
              icon={<Icons.user className="w-4 h-4" />}
              label="Clientes ativos"
              value={clientesAtivos == null ? "…" : clientesAtivos}
              badge="Users"
              accent="text-zinc-100"
              tooltip="Total de usuários cadastrados (API stats)"
            />
            <DashboardCard
              href="/admin/planos"
              icon={<Icons.checkCircle className="w-4 h-4" />}
              label="Planos ativos"
              value={planosAtivos.length}
              badge="Planos"
              accent="text-yellow-300"
              tooltip="UserPlan com status active"
            />
            <DashboardCard
              href="/admin/planos"
              icon={<Icons.file className="w-4 h-4" />}
              label="Cupons ativos"
              value={cuponsAtivos.length}
              badge="Cupons"
              accent="text-teal-300"
              tooltip="Cupons não usados e não expirados"
            />
          </div>
          )}
        </DashboardWidget>
      </DashboardSection>

      {/* Atalhos de status (agendamentos) — mantém comportamento GO-03B */}
      <DashboardSection title="Agendamentos por status">
        <DashboardWidget
          loading={statsQ.status === "loading"}
          error={statsQ.error}
          onRetry={statsQ.retry}
        >
          {statsQ.data && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
              {(
                [
                  ["pendentes", "Pendentes", statsQ.data.appointmentsPendente, "text-orange-400", "bg-orange-500"],
                  ["aceitos", "Aceitos", statsQ.data.appointmentsAceitos, "text-green-400", "bg-green-500"],
                  ["em-andamento", "Em andamento", statsQ.data.appointmentsEmAndamento, "text-blue-400", "bg-blue-500"],
                  ["concluidos", "Concluídos", statsQ.data.appointmentsConcluidos, "text-purple-400", "bg-purple-500"],
                  ["cancelados", "Cancelados", statsQ.data.appointmentsCancelados, "text-red-400", "bg-red-500"],
                  ["recusados", "Recusados", statsQ.data.appointmentsRecusados, "text-zinc-400", "bg-zinc-500"],
                ] as const
              ).map(([slug, label, value, text, dot]) => (
                <Link
                  key={slug}
                  href={`/admin/agendamentos/${slug}`}
                  className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-4 transition hover:bg-zinc-800"
                >
                  <div className="flex items-center gap-2">
                    <span className={`h-3 w-3 shrink-0 rounded-full ${dot}`} />
                    <span className="truncate text-sm text-zinc-300">{label}</span>
                  </div>
                  <div className={`mt-2 text-2xl font-bold tabular-nums ${text}`}>{value}</div>
                </Link>
              ))}
            </div>
          )}
        </DashboardWidget>
      </DashboardSection>

      {/* Gráficos */}
      <DashboardSection title="Gráficos" subtitle="Dados agregados no cliente a partir das listas existentes">
        <DashboardWidget
          loading={paymentsQ.status === "loading" && !paymentsQ.data}
          error={paymentsQ.status === "error" ? paymentsQ.error : null}
          onRetry={paymentsQ.retry}
          minHeight="min-h-[220px]"
        >
          {!chartsHaveData ? (
            <DashboardEmptyState
              title="Sem dados suficientes para gerar gráficos."
              description="Realize um pagamento ou agendamento para iniciar as métricas."
              minHeight="min-h-[220px]"
            />
          ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            <DashboardChart title="Receita por dia (filtro)" data={chartDay} type="line" currency />
            <DashboardChart title="Receita por semana (8 semanas)" data={chartWeek} type="bar" currency />
            <DashboardChart title="Receita por mês (ano corrente)" data={chartMonth} type="bar" currency />
            <DashboardChart title="Serviços por categoria" data={chartCats} type="pie" />
            <DashboardChart title="Planos vendidos" data={chartPlans} type="bar" />
            <DashboardChart title="Cancelamentos" data={chartCancel} type="bar" />
            <DashboardChart title="Reembolsos" data={chartRefund} type="bar" />
          </div>
          )}
        </DashboardWidget>
      </DashboardSection>

      {/* KPIs */}
      <DashboardSection
        title="KPIs operacionais"
        subtitle="Só métricas com base segura nos dados existentes — demais ficam Indisponível"
      >
        <DashboardWidget
          loading={servicesQ.status === "loading" && !servicesQ.data}
          error={servicesQ.status === "error" ? servicesQ.error : null}
          onRetry={servicesQ.retry}
        >
          {indicatorsEmpty ? (
            <DashboardEmptyState
              title="Nenhum KPI disponível ainda."
              description="Os KPIs serão calculados automaticamente após os primeiros pagamentos e agendamentos."
              minHeight="min-h-[160px]"
            />
          ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            <DashboardKPI
              label="Tempo médio para aceitar"
              value={kpiLabel(kpiAvgAcceptMs(services, range))}
              hint="Service.acceptedAt − createdAt"
            />
            <DashboardKPI
              label="Tempo médio para iniciar"
              value={kpiLabel(kpiAvgStart())}
              hint="Sem startedAt no payload"
            />
            <DashboardKPI
              label="Tempo médio para concluir"
              value={kpiLabel(kpiAvgComplete())}
              hint="Sem completedAt confiável"
            />
            <DashboardKPI
              label="Pagamento → entrega"
              value={kpiLabel(kpiAvgPaymentToDelivery())}
              hint="Sem deliveryDate no payload"
            />
            <DashboardKPI
              label="Taxa de cancelamento"
              value={kpiLabel(kpiCancelRate(appointments, range))}
              hint="Cancelados / agendamentos no período"
            />
            <DashboardKPI
              label="Taxa de reembolso"
              value={kpiLabel(kpiRefundRate(payments, range))}
              hint="Reembolsos / aprovados no período"
            />
            <DashboardKPI
              label="Conversão de planos"
              value={kpiLabel(kpiPlanConversion())}
              hint="Sem funil de visitas/checkout"
            />
            <DashboardKPI
              label="Conversão de pagamentos"
              value={kpiLabel(kpiPaymentConversion(payments, range))}
              hint="Aprovados / total no período"
            />
            <DashboardKPI
              label="Conversão de cupons"
              value={kpiLabel(kpiCouponConversion(coupons, range))}
              hint="Usados / emitidos no período"
            />
          </div>
          )}
        </DashboardWidget>
      </DashboardSection>

      {/* Calendário */}
      <DashboardSection title="Calendário operacional" subtitle="Hoje · Amanhã · Esta semana">
        <DashboardWidget
          loading={aptsQ.status === "loading"}
          error={aptsQ.status === "error" ? aptsQ.error : null}
          onRetry={aptsQ.retry}
        >
          <DashboardCalendar appointments={appointments} />
        </DashboardWidget>
      </DashboardSection>

      {/* Atividade recente */}
      <DashboardSection title="Atividade recente">
        <DashboardWidget
          loading={
            (paymentsQ.status === "loading" || aptsQ.status === "loading") && timeline.length === 0
          }
          error={
            paymentsQ.status === "error" &&
            aptsQ.status === "error" &&
            servicesQ.status === "error"
              ? paymentsQ.error || aptsQ.error || servicesQ.error
              : null
          }
          onRetry={() => setRefreshTick((t) => t + 1)}
        >
          <DashboardTimeline items={timeline} />
        </DashboardWidget>
      </DashboardSection>
    </div>
  );
}

export function ExecutiveDashboard() {
  return (
    <Suspense fallback={<BoardSkeleton />}>
      <ExecutiveDashboardInner />
    </Suspense>
  );
}
