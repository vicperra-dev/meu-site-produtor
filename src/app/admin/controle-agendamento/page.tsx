"use client";

import { useCallback, useEffect, useState, useMemo, type ReactNode } from "react";
import {
  useFeedback,
  LoadingBlock,
  PageHeader,
  Card,
  Button,
  Modal,
} from "@/components/design-system";
import {
  formatOccupancyTooltip,
  operationalCategoryFromServiceType,
  serviceOrderLabel,
  serviceOrderSlotClasses,
  CALENDAR_OS_LEGEND,
  type HourOccupancyDetail,
} from "@/app/lib/ui/service-order-visual";
import {
  OPERATIONAL_HOURS,
  ADMIN_DAY_LEGEND,
  type CalendarDayState,
  type CalendarDayVisual,
  getCalendarDayState,
  calendarDayCellStyle,
  formatStudioDateLong,
  formatStudioMonthYear,
  isIsoDatePastStudio,
  isStudioDateTimePast,
  normalizeHourLabel,
  isoDateFromParts,
  daysInMonth,
} from "@/app/lib/calendar-day-state";
import {
  type AdminBlockedSlot,
  slotKey,
  toggleIsoInList,
  isAppointmentOccupiedHour,
  resolveAdminDayVisualWithDraft,
} from "@/app/lib/admin-calendar-mutations";
import { useDomainRefresh } from "@/app/hooks/useDomainRefresh";

const HORARIOS_PADRAO = [...OPERATIONAL_HOURS];
const PENDING_UNPUBLISH_KEY = "thouserec.admin.pendingUnpublishSlotIds";

function loadPendingUnpublishIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(PENDING_UNPUBLISH_KEY) || "[]");
    return Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === "string")
      : [];
  } catch {
    return [];
  }
}

type BlockedSlot = AdminBlockedSlot;

export default function AdminControleAgendamentoPage() {
  const { notifySuccess, notifyError, ask } = useFeedback();
  const DATA_MINIMA = new Date(new Date().getFullYear(), 0, 1);

  const [dataBase, setDataBase] = useState(() => {
    const hoje = new Date();
    const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    return primeiroDia < DATA_MINIMA ? DATA_MINIMA : primeiroDia;
  });

  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);
  const [dayStates, setDayStates] = useState<Record<string, CalendarDayState>>({});
  const [hourOccupancyByDate, setHourOccupancyByDate] = useState<
    Record<string, Record<string, HourOccupancyDetail>>
  >({});
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [dayBatchMode, setDayBatchMode] = useState<null | "block" | "unblock">(null);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [hourBatchMode, setHourBatchMode] = useState<null | "block" | "unblock">(null);
  const [selectedHours, setSelectedHours] = useState<string[]>([]);
  const [pendingUnpublishIds, setPendingUnpublishIds] = useState<string[]>([]);
  const [pendingUnpublishReady, setPendingUnpublishReady] = useState(false);
  const [batchBusy, setBatchBusy] = useState(false);

  const isDataPassada = (isoDate: string): boolean => isIsoDatePastStudio(isoDate);
  const isHorarioPassado = (isoDate: string, hora: string): boolean =>
    isStudioDateTimePast(isoDate, hora);

  const carregarDados = useCallback(async (opts?: { silent?: boolean }) => {
    try {
      if (!opts?.silent) setLoading(true);
      const [resSlots, resCal] = await Promise.all([
        fetch("/api/admin/blocked-slots"),
        fetch("/api/agendamentos/disponibilidade?" + Date.now(), {
          cache: "no-store",
        }),
      ]);

      if (resSlots.ok) {
        const data = await resSlots.json();
        setBlockedSlots(data.slots || []);
      }

      if (resCal.ok) {
        const data = await resCal.json();
        setDayStates(data.dayStates || {});
        setHourOccupancyByDate(data.hourOccupancyByDate || {});
      }
    } catch (err) {
      console.error("Erro ao carregar dados", err);
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    setPendingUnpublishIds(loadPendingUnpublishIds());
    setPendingUnpublishReady(true);
  }, []);

  useEffect(() => {
    if (!pendingUnpublishReady) return;
    try {
      localStorage.setItem(PENDING_UNPUBLISH_KEY, JSON.stringify(pendingUnpublishIds));
    } catch {
      /* ignore quota */
    }
  }, [pendingUnpublishIds, pendingUnpublishReady]);

  useEffect(() => {
    void carregarDados();
  }, [dataBase, carregarDados]);

  useDomainRefresh(["agenda", "admin-agendamentos"], () =>
    carregarDados({ silent: true })
  );

  const horariosOcupadosPorDia: Record<string, Set<string>> = useMemo(() => {
    const ocupados: Record<string, Set<string>> = {};
    for (const [date, state] of Object.entries(dayStates)) {
      ocupados[date] = new Set(state.occupiedHours || []);
    }
    return ocupados;
  }, [dayStates]);

  const calYear = dataBase.getFullYear();
  const calMonth = dataBase.getMonth() + 1;
  const ultimoDiaDoMes = daysInMonth(calYear, calMonth);
  const primeiroDiaSemana = new Date(calYear, calMonth - 1, 1).getDay();
  const dias: (number | null)[] = [];
  for (let i = 0; i < primeiroDiaSemana; i++) dias.push(null);
  for (let d = 1; d <= ultimoDiaDoMes; d++) {
    const dataDia = new Date(calYear, calMonth - 1, d);
    dias.push(dataDia >= DATA_MINIMA ? d : null);
  }

  const pendingUnpublishKeys = useMemo(() => {
    const keys = new Set<string>();
    const idSet = new Set(pendingUnpublishIds);
    for (const slot of blockedSlots) {
      if (idSet.has(slot.id)) keys.add(slotKey(slot.data, slot.hora));
    }
    return keys;
  }, [blockedSlots, pendingUnpublishIds]);

  const draftBlockCount = blockedSlots.filter((s) => s.ativo === false).length;
  const pendingReleaseCount = pendingUnpublishIds.length;

  function getDiaVisual(data: string): CalendarDayVisual {
    return resolveAdminDayVisualWithDraft({
      state: getCalendarDayState(dayStates, data),
      date: data,
      blockedSlots,
      pendingUnpublishKeys,
    });
  }

  function normalizarHora(hora: string): string {
    return normalizeHourLabel(hora);
  }

  async function applyAdminBatch(body: Record<string, unknown>) {
    setBatchBusy(true);
    try {
      const res = await fetch("/api/admin/blocked-slots/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        notifyError(data.error || "Erro ao aplicar alteração administrativa.");
        return false;
      }
      if (Array.isArray(data.pendingUnpublishIds) && data.pendingUnpublishIds.length) {
        setPendingUnpublishIds((prev) => [
          ...new Set([...prev, ...data.pendingUnpublishIds]),
        ]);
      }
      if (data.notice) notifySuccess(data.notice);
      await carregarDados({ silent: true });
      return true;
    } catch (err) {
      notifyError(
        `Erro ao alterar horários: ${err instanceof Error ? err.message : "Erro desconhecido"}`
      );
      return false;
    } finally {
      setBatchBusy(false);
    }
  }

  async function toggleSlot(data: string, hora: string) {
    const horaNormalizada = normalizarHora(hora);
    const existe = blockedSlots.some(
      (s) => s.data === data && normalizarHora(s.hora) === horaNormalizada
    );
    await applyAdminBatch({
      action: existe ? "unblock" : "block",
      slots: [{ data, hora: horaNormalizada }],
    });
  }

  async function toggleDia(data: string) {
    const slotsDoDia = blockedSlots.filter((s) => s.data === data);
    const horariosBloqueados = new Set(slotsDoDia.map((s) => normalizarHora(s.hora)));
    const todosBloqueados = HORARIOS_PADRAO.every((h) =>
      horariosBloqueados.has(normalizarHora(h))
    );
    await applyAdminBatch(
      todosBloqueados
        ? { action: "unblock", dates: [data] }
        : { action: "block", dates: [data], eligibleHours: HORARIOS_PADRAO }
    );
  }

  function isSlotBlocked(data: string, hora: string): boolean {
    const horaNormalizada = normalizarHora(hora);
    if (pendingUnpublishKeys.has(slotKey(data, horaNormalizada))) return false;
    return blockedSlots.some(
      (s) => s.data === data && normalizarHora(s.hora) === horaNormalizada
    );
  }

  const handleMesAnterior = () => {
    setDataBase((prev) => {
      const novoMes = new Date(prev.getFullYear(), prev.getMonth() - 1, 1);
      return novoMes < DATA_MINIMA ? DATA_MINIMA : novoMes;
    });
    setSelectedDay(null);
    setHourBatchMode(null);
    setSelectedHours([]);
  };

  const podeIrMesAnterior = () => {
    const mesAnterior = new Date(dataBase.getFullYear(), dataBase.getMonth() - 1, 1);
    return mesAnterior >= DATA_MINIMA;
  };

  const handleProximoMes = () => {
    setDataBase((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    setSelectedDay(null);
    setHourBatchMode(null);
    setSelectedHours([]);
  };

  function toggleDateSelection(isoDate: string) {
    setSelectedDates((prev) => toggleIsoInList(prev, isoDate));
  }

  function cancelDayBatchMode() {
    setDayBatchMode(null);
    setSelectedDates([]);
  }

  async function applySelectedDays() {
    if (!dayBatchMode || selectedDates.length === 0) return;
    const ok = await applyAdminBatch(
      dayBatchMode === "block"
        ? { action: "block", dates: selectedDates, eligibleHours: HORARIOS_PADRAO }
        : { action: "unblock", dates: selectedDates }
    );
    if (ok) cancelDayBatchMode();
  }

  function cancelHourBatchMode() {
    setHourBatchMode(null);
    setSelectedHours([]);
  }

  function toggleHourSelection(hora: string) {
    const h = normalizarHora(hora);
    setSelectedHours((prev) =>
      prev.includes(h) ? prev.filter((x) => x !== h) : [...prev, h]
    );
  }

  async function applySelectedHours() {
    if (!hourBatchMode || !selectedDay || selectedHours.length === 0) return;
    const ok = await applyAdminBatch({
      action: hourBatchMode,
      slots: selectedHours.map((hora) => ({ data: selectedDay, hora })),
    });
    if (ok) cancelHourBatchMode();
  }

  const selectedDayData = selectedDay
    ? {
        isoDate: selectedDay,
        ocupados: horariosOcupadosPorDia[selectedDay] || new Set<string>(),
        slotsBloqueados: blockedSlots.filter((s) => s.data === selectedDay),
        dayState: getCalendarDayState(dayStates, selectedDay),
      }
    : null;

  async function confirmarMudancas() {
    if (
      !(await ask(
        "Tem certeza que deseja confirmar e publicar todas as mudanças?",
        "Isso aplica bloqueios em rascunho e liberações pendentes no calendário público."
      ))
    ) {
      return;
    }

    try {
      setConfirmando(true);
      const res = await fetch("/api/admin/blocked-slots", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "confirmar",
          unpublishIds: pendingUnpublishIds,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        notifySuccess(data.message || "Mudanças confirmadas e publicadas com sucesso!");
        setPendingUnpublishIds([]);
        await carregarDados();
      } else {
        const error = await res.json();
        notifyError(error.error || "Erro ao confirmar mudanças. Tente novamente.");
      }
    } catch (err) {
      console.error("Erro ao confirmar mudanças:", err);
      notifyError("Erro ao confirmar mudanças. Tente novamente.");
    } finally {
      setConfirmando(false);
    }
  }

  if (loading) {
    return <LoadingBlock label="Carregando calendário..." />;
  }

  const dayActionLabel =
    selectedDates.length === 1
      ? dayBatchMode === "block"
        ? "Bloquear dia"
        : "Liberar dia"
      : dayBatchMode === "block"
        ? "Bloquear dias"
        : "Liberar dias";

  const hourActionLabel =
    selectedHours.length === 1
      ? hourBatchMode === "block"
        ? "Bloquear horário"
        : "Liberar horário"
      : hourBatchMode === "block"
        ? "Bloquear horários"
        : "Liberar horários";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Controle de Agendamento"
        subtitle="Clique em um dia para gerenciar seus horários, ou use o lote para vários dias."
        icon="calendar"
        actions={
          <Button
            variant="primary"
            size="md"
            loading={confirmando}
            icon="check"
            onClick={confirmarMudancas}
          >
            Confirmar e Publicar Mudanças
          </Button>
        }
      />

      {(draftBlockCount > 0 || pendingReleaseCount > 0) && (
        <div
          className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
          role="status"
        >
          Alterações pendentes de publicação: {draftBlockCount} bloqueio(s) em
          rascunho
          {pendingReleaseCount
            ? `; ${pendingReleaseCount} liberação(ões) aguardando confirmar`
            : ""}
          . O calendário público só muda após Confirmar e Publicar Mudanças.
        </div>
      )}

      <Card className="!p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant={dayBatchMode === "block" ? "danger" : "outline"}
              size="sm"
              aria-pressed={dayBatchMode === "block"}
              onClick={() => {
                setSelectedDay(null);
                setDayBatchMode((m) => (m === "block" ? null : "block"));
                setSelectedDates([]);
              }}
            >
              Bloquear dias
            </Button>
            <Button
              variant={dayBatchMode === "unblock" ? "success" : "outline"}
              size="sm"
              aria-pressed={dayBatchMode === "unblock"}
              onClick={() => {
                setSelectedDay(null);
                setDayBatchMode((m) => (m === "unblock" ? null : "unblock"));
                setSelectedDates([]);
              }}
            >
              Liberar dias
            </Button>
            {dayBatchMode && (
              <Button variant="ghost" size="sm" onClick={cancelDayBatchMode}>
                Cancelar
              </Button>
            )}
          </div>
        </div>

        {dayBatchMode && (
          <div
            className={`mb-4 rounded-lg border px-3 py-2 text-sm ${
              dayBatchMode === "block"
                ? "border-red-500/60 bg-red-950/40 text-red-100"
                : "border-emerald-500/60 bg-emerald-950/40 text-emerald-100"
            }`}
            role="status"
          >
            Modo {dayBatchMode === "block" ? "bloquear" : "liberar"} dias. Clique
            nas datas (YYYY-MM-DD) em qualquer mês. Selecionados:{" "}
            <strong>{selectedDates.length}</strong>
            {selectedDates.length > 0 && (
              <span className="ml-2 text-xs opacity-80">
                {selectedDates.slice().sort().join(", ")}
              </span>
            )}
          </div>
        )}

        {dayBatchMode && selectedDates.length > 0 && (
          <div className="mb-4">
            <Button
              variant={dayBatchMode === "block" ? "danger" : "success"}
              loading={batchBusy}
              onClick={() => void applySelectedDays()}
            >
              {dayActionLabel}
            </Button>
          </div>
        )}

        <div className="mb-4 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handleMesAnterior}
            disabled={!podeIrMesAnterior()}
          >
            ◀ Anterior
          </Button>

          <span className="text-xl font-semibold text-zinc-100">
            {formatStudioMonthYear(dataBase.getFullYear(), dataBase.getMonth() + 1)}
          </span>

          <Button variant="outline" onClick={handleProximoMes}>
            Próximo ▶
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
            <div key={d} className="py-2 text-center text-sm font-semibold text-zinc-400">
              {d}
            </div>
          ))}

          {dias.map((dia, idx) => {
            if (!dia) return <div key={idx} />;

            const isoDate = isoDateFromParts(
              dataBase.getFullYear(),
              dataBase.getMonth() + 1,
              dia
            );
            const dataDia = new Date(dataBase.getFullYear(), dataBase.getMonth(), dia);
            if (dataDia < DATA_MINIMA) return <div key={idx} />;

            const visual = getDiaVisual(isoDate);
            const diaPassado = isDataPassada(isoDate);
            const cell = calendarDayCellStyle(visual, {
              past: diaPassado,
              audience: "admin",
            });
            const isPicked = selectedDates.includes(isoDate);
            const isOpen = selectedDay === isoDate && !dayBatchMode;

            return (
              <button
                key={isoDate}
                type="button"
                onClick={() => {
                  if (diaPassado) return;
                  if (dayBatchMode) {
                    toggleDateSelection(isoDate);
                    return;
                  }
                  setSelectedDay(isoDate);
                  cancelHourBatchMode();
                }}
                disabled={diaPassado}
                aria-pressed={dayBatchMode ? isPicked : isOpen}
                aria-label={`${isoDate}${isPicked ? ", selecionado" : ""}`}
                style={cell.style}
                className={`relative rounded-md border p-2 text-center text-sm transition ${
                  diaPassado ? "cursor-not-allowed opacity-60" : "cursor-pointer"
                } ${cell.className} ${
                  isOpen ? "ring-2 ring-red-500 ring-offset-2 ring-offset-zinc-800" : ""
                } ${
                  isPicked
                    ? "outline outline-2 outline-offset-2 outline-white ring-2 ring-white/90"
                    : ""
                }`}
              >
                {isPicked && (
                  <span
                    className="absolute right-1 top-0.5 text-[10px] font-bold text-white drop-shadow"
                    aria-hidden
                  >
                    ✓
                  </span>
                )}
                {dia}
              </button>
            );
          })}
        </div>

        <div className="mt-6 flex flex-wrap gap-4 text-sm text-zinc-400">
          {ADMIN_DAY_LEGEND.map((item) => (
            <div key={item.visual} className="flex items-center gap-2">
              <div
                className={`w-4 h-4 rounded border ${item.swatch}`}
                style={
                  item.visual === "parcial_entrega"
                    ? {
                        background:
                          "linear-gradient(135deg, rgba(234,179,8,0.9) 50%, rgba(147,51,234,0.9) 50%)",
                      }
                    : undefined
                }
              />
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </Card>

      <Modal
        open={!!(selectedDay && selectedDayData && !dayBatchMode)}
        onClose={() => {
          setSelectedDay(null);
          cancelHourBatchMode();
        }}
        title={
          selectedDayData
            ? `Horários - ${formatStudioDateLong(selectedDayData.isoDate)}`
            : "Horários"
        }
        maxWidth="max-w-2xl"
      >
        {selectedDay && selectedDayData && (
          <div className="space-y-6">
            <p className="text-sm text-zinc-400">
              {selectedDayData.ocupados.size} de {HORARIOS_PADRAO.length} horários
              ocupados
            </p>

            <div className="flex flex-wrap gap-2">
              <Button
                variant={hourBatchMode === "block" ? "danger" : "outline"}
                size="sm"
                aria-pressed={hourBatchMode === "block"}
                onClick={() => {
                  setHourBatchMode((m) => (m === "block" ? null : "block"));
                  setSelectedHours([]);
                }}
              >
                Bloquear horários
              </Button>
              <Button
                variant={hourBatchMode === "unblock" ? "success" : "outline"}
                size="sm"
                aria-pressed={hourBatchMode === "unblock"}
                onClick={() => {
                  setHourBatchMode((m) => (m === "unblock" ? null : "unblock"));
                  setSelectedHours([]);
                }}
              >
                Liberar horários
              </Button>
              {hourBatchMode && (
                <Button variant="ghost" size="sm" onClick={cancelHourBatchMode}>
                  Cancelar
                </Button>
              )}
            </div>

            {hourBatchMode && (
              <div
                className="rounded-lg border border-zinc-600 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-200"
                role="status"
              >
                Modo {hourBatchMode === "block" ? "bloquear" : "liberar"} horários.
                Selecionados: <strong>{selectedHours.length}</strong>
              </div>
            )}

            {hourBatchMode && selectedHours.length > 0 && (
              <Button
                variant={hourBatchMode === "block" ? "danger" : "success"}
                loading={batchBusy}
                onClick={() => void applySelectedHours()}
              >
                {hourActionLabel}
              </Button>
            )}

            <Button
              fullWidth
              size="md"
              variant={
                selectedDayData.slotsBloqueados.length === HORARIOS_PADRAO.length
                  ? "success"
                  : "danger"
              }
              loading={batchBusy}
              disabled={!!hourBatchMode}
              onClick={() => toggleDia(selectedDay)}
            >
              {selectedDayData.slotsBloqueados.length === HORARIOS_PADRAO.length
                ? "Desbloquear todos os horários do dia"
                : "Bloquear todos os horários do dia"}
            </Button>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {HORARIOS_PADRAO.map((hora) => {
                const bloqueado = isSlotBlocked(selectedDay, hora);
                const occupancy = hourOccupancyByDate[selectedDay || ""]?.[hora];
                const occupiedByAppointment = isAppointmentOccupiedHour(
                  selectedDayData.dayState,
                  hora
                );
                const occupancyBlocked =
                  occupancy?.kind === "blocked" &&
                  !pendingUnpublishKeys.has(slotKey(selectedDay, hora));
                const ocupadoPorOs =
                  occupancy?.kind === "service_order" || occupiedByAppointment;
                const horarioPassado = isHorarioPassado(selectedDay, hora);
                const hourPicked = selectedHours.includes(normalizarHora(hora));
                const selectableInBatch =
                  hourBatchMode === "block"
                    ? !horarioPassado && !ocupadoPorOs
                    : hourBatchMode === "unblock"
                      ? !horarioPassado && bloqueado
                      : !horarioPassado && !ocupadoPorOs;

                let slotClass =
                  "bg-green-600/20 text-green-300 border-green-600 hover:bg-green-600/30";
                let title = hourBatchMode
                  ? "Clique para selecionar"
                  : "Clique para bloquear";
                let body: ReactNode = hora;

                if (horarioPassado) {
                  slotClass =
                    "bg-red-900/60 text-red-200 border-red-700 cursor-not-allowed opacity-60";
                  title = "Horário já passou";
                } else if (bloqueado || occupancyBlocked) {
                  slotClass = "bg-red-600 text-white border-red-500 hover:bg-red-500";
                  title = hourBatchMode
                    ? "Clique para selecionar"
                    : "Clique para desbloquear";
                  body = (
                    <span className="flex flex-col items-center gap-0.5">
                      <span>{hora}</span>
                      <span className="text-[10px] font-normal opacity-90">Bloqueado</span>
                    </span>
                  );
                } else if (ocupadoPorOs) {
                  const cat =
                    occupancy?.category ||
                    operationalCategoryFromServiceType(occupancy?.serviceType);
                  const completed = Boolean(occupancy?.completed);
                  slotClass = `${serviceOrderSlotClasses(cat, {
                    completed,
                  })} cursor-not-allowed`;
                  const detail: HourOccupancyDetail =
                    occupancy?.kind === "service_order"
                      ? occupancy
                      : {
                          kind: "service_order",
                          label: serviceOrderLabel(occupancy?.serviceType),
                          category: cat,
                          categoryLabel:
                            cat === "presencial" ? "Serviço" : "Produção",
                          completed,
                        };
                  title = formatOccupancyTooltip(detail);
                  body = (
                    <span className="flex flex-col items-center gap-0.5">
                      <span>{hora}</span>
                      <span className="text-[10px] font-semibold leading-tight text-center">
                        {completed ? "Concluído" : detail.label}
                      </span>
                    </span>
                  );
                }

                return (
                  <button
                    key={hora}
                    type="button"
                    aria-pressed={hourBatchMode ? hourPicked : undefined}
                    onClick={() => {
                      if (hourBatchMode) {
                        if (!selectableInBatch) return;
                        toggleHourSelection(hora);
                        return;
                      }
                      if (!horarioPassado && !ocupadoPorOs) {
                        void toggleSlot(selectedDay, hora);
                      }
                    }}
                    disabled={
                      hourBatchMode
                        ? !selectableInBatch
                        : ocupadoPorOs || horarioPassado
                    }
                    className={`relative rounded-lg border px-3 py-3 text-sm font-medium transition whitespace-pre-line ${slotClass} ${
                      hourPicked
                        ? "outline outline-2 outline-offset-2 outline-white"
                        : ""
                    }`}
                    title={title}
                  >
                    {hourPicked && (
                      <span className="absolute right-1 top-0.5 text-[10px] font-bold" aria-hidden>
                        ✓
                      </span>
                    )}
                    {body}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-4 text-sm text-zinc-400">
              {CALENDAR_OS_LEGEND.map((item) => (
                <div key={item.key} className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded border ${item.swatch}`} />
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
