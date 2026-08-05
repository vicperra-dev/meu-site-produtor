"use client";

import { useEffect, useState, useMemo, type ReactNode } from "react";
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
  CALENDAR_LEGEND,
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
} from "@/app/lib/calendar-day-state";

const HORARIOS_PADRAO = [...OPERATIONAL_HOURS];


interface BlockedSlot {
  id: string;
  data: string;
  hora: string;
}

export default function AdminControleAgendamentoPage() {
  const { notifySuccess, notifyError, ask } = useFeedback();
  // Data mínima: 1 de janeiro do ano atual
  const DATA_MINIMA = new Date(new Date().getFullYear(), 0, 1); // 1 de janeiro do ano atual

  const [dataBase, setDataBase] = useState(() => {
    const hoje = new Date();
    const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    // Se o primeiro dia do mês atual for antes de 1 de janeiro, usar 1 de janeiro
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

  // Função helper para verificar se uma data já passou (fuso do estúdio)
  const isDataPassada = (isoDate: string): boolean => isIsoDatePastStudio(isoDate);

  // Função helper para verificar se um horário já passou
  const isHorarioPassado = (isoDate: string, hora: string): boolean =>
    isStudioDateTimePast(isoDate, hora);


  useEffect(() => {
    carregarDados();
  }, [dataBase]);

  async function carregarDados() {
    try {
      setLoading(true);
      const [resSlots, resCal] = await Promise.all([
        fetch("/api/admin/blocked-slots"),
        fetch("/api/agendamentos/disponibilidade?" + Date.now()),
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
      setLoading(false);
    }
  }

  const horariosOcupadosPorDia: Record<string, Set<string>> = useMemo(() => {
    const ocupados: Record<string, Set<string>> = {};
    for (const [date, state] of Object.entries(dayStates)) {
      ocupados[date] = new Set(state.occupiedHours || []);
    }
    if (Object.keys(ocupados).length === 0) {
      blockedSlots.forEach((slot) => {
        if (!ocupados[slot.data]) ocupados[slot.data] = new Set();
        ocupados[slot.data].add(slot.hora);
      });
    }
    return ocupados;
  }, [dayStates, blockedSlots]);

  const ultimoDiaDoMes = new Date(
    dataBase.getFullYear(),
    dataBase.getMonth() + 1,
    0
  ).getDate();

  const primeiroDiaSemana = new Date(
    dataBase.getFullYear(),
    dataBase.getMonth(),
    1
  ).getDay();

  const dias: (number | null)[] = [];
  for (let i = 0; i < primeiroDiaSemana; i++) dias.push(null);
  
  // Adicionar apenas dias a partir de 1 de janeiro
  for (let d = 1; d <= ultimoDiaDoMes; d++) {
    const dataDia = new Date(dataBase.getFullYear(), dataBase.getMonth(), d);
    // Só adicionar se a data for >= 1 de janeiro
    if (dataDia >= DATA_MINIMA) {
      dias.push(d);
    } else {
      dias.push(null); // Preencher com null para manter o layout
    }
  }

  // Estado visual do dia — calculado no backend (GO-H4)
  function getDiaVisual(data: string): CalendarDayVisual {
    return getCalendarDayState(dayStates, data).visual;
  }

  // Função para normalizar hora (garantir formato HH:00)
  function normalizarHora(hora: string): string {
    return normalizeHourLabel(hora);
  }

  // Função para bloquear/desbloquear um horário
  async function toggleSlot(data: string, hora: string) {
    const horaNormalizada = normalizarHora(hora);
    console.log("[DEBUG] toggleSlot:", { data, hora, horaNormalizada, blockedSlots });
    
    // Verificar se existe (comparando com hora normalizada)
    const existe = blockedSlots.some((s) => {
      const sHoraNormalizada = normalizarHora(s.hora);
      return s.data === data && sHoraNormalizada === horaNormalizada;
    });

    console.log("[DEBUG] Slot existe?", existe);

    try {
      if (existe) {
        // Remover bloqueio
        const slot = blockedSlots.find((s) => {
          const sHoraNormalizada = normalizarHora(s.hora);
          return s.data === data && sHoraNormalizada === horaNormalizada;
        });
        
        console.log("[DEBUG] Slot encontrado para remover:", slot);
        
        if (slot) {
          const res = await fetch(`/api/admin/blocked-slots?id=${slot.id}`, {
            method: "DELETE",
          });
          
          console.log("[DEBUG] Resposta DELETE:", res.status, res.ok);
          
          if (res.ok) {
            setBlockedSlots((prev) => prev.filter((s) => s.id !== slot.id));
            await carregarDados();
            console.log("[DEBUG] Slot removido com sucesso");
          } else {
            const error = await res.json().catch(() => ({}));
            console.error("Erro ao remover slot:", error);
            notifyError(`Erro ao remover bloqueio: ${error.error || "Erro desconhecido"}`);
          }
        } else {
          console.warn("[DEBUG] Slot não encontrado para remover");
        }
      } else {
        // Adicionar bloqueio
        console.log("[DEBUG] Criando novo slot bloqueado...");
        const res = await fetch("/api/admin/blocked-slots", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data, hora: horaNormalizada }),
        });
        
        console.log("[DEBUG] Resposta POST:", res.status, res.ok);
        
        if (res.ok) {
          const novoSlot = await res.json();
          console.log("[DEBUG] Novo slot criado:", novoSlot);
          setBlockedSlots((prev) => [...prev, novoSlot.slot]);
          await carregarDados();
          console.log("[DEBUG] Slot adicionado com sucesso");
        } else {
          const errorText = await res.text().catch(() => "Erro desconhecido");
          let error;
          try {
            error = JSON.parse(errorText);
          } catch {
            error = { error: errorText, message: errorText };
          }
          console.error("Erro ao criar slot - Status:", res.status);
          console.error("Erro ao criar slot - Resposta:", error);
          notifyError(`Erro ao bloquear horário (${res.status}): ${error.error || error.message || "Erro desconhecido"}`);
        }
      }
    } catch (err) {
      console.error("Erro ao alternar slot", err);
      notifyError(`Erro ao alterar horário: ${err instanceof Error ? err.message : "Erro desconhecido"}`);
    }
  }

  // Função para bloquear/desbloquear dia inteiro
  async function toggleDia(data: string) {
    const ocupados = horariosOcupadosPorDia[data] || new Set<string>();
    const slotsDoDia = blockedSlots.filter((s) => s.data === data);
    const horariosBloqueados = new Set(
      slotsDoDia.map((s) => normalizarHora(s.hora))
    );
    
    // Verificar se todos os horários estão bloqueados (comparando com horas normalizadas)
    const todosBloqueados = HORARIOS_PADRAO.every((h) => {
      const hNormalizada = normalizarHora(h);
      return horariosBloqueados.has(hNormalizada);
    });
    
    try {
      if (todosBloqueados) {
        // Desbloquear todos os horários do dia
        const promises = slotsDoDia.map((slot) =>
          fetch(`/api/admin/blocked-slots?id=${slot.id}`, {
            method: "DELETE",
          })
        );
        const results = await Promise.allSettled(promises);
        const errors = results.filter(r => r.status === "rejected");
        const failed = results.filter(r => 
          r.status === "fulfilled" && !r.value.ok
        );
        
        if (errors.length > 0 || failed.length > 0) {
          console.error("Alguns horários não puderam ser desbloqueados:", { errors, failed });
          const totalErrors = errors.length + failed.length;
          if (totalErrors < slotsDoDia.length) {
            notifyError(`${slotsDoDia.length - totalErrors} horário(s) desbloqueado(s) com sucesso. ${totalErrors} falharam.`);
          } else {
            notifyError("Erro ao desbloquear horários. Verifique o console para mais detalhes.");
          }
        } else {
          notifySuccess(`${slotsDoDia.length} horário(s) desbloqueado(s) com sucesso!`);
        }
        await carregarDados();
      } else {
        // Bloquear todos os horários do dia que não estão ocupados por agendamentos
        const horariosParaBloquear = HORARIOS_PADRAO.filter((h) => {
          const hNormalizada = normalizarHora(h);
          return !ocupados.has(h) && !horariosBloqueados.has(hNormalizada);
        });
        
        const promises = horariosParaBloquear.map(async (hora) => {
          try {
            const res = await fetch("/api/admin/blocked-slots", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ data, hora: normalizarHora(hora) }),
            });
            
            // Se for 409 (já existe), considerar como sucesso
            if (res.status === 409) {
              return { ok: true, status: 409, message: "Já existe" };
            }
            
            return res;
          } catch (err) {
            throw err;
          }
        });
        
        const results = await Promise.allSettled(promises);
        const errors = results.filter(r => r.status === "rejected");
        const failed = results.filter(r => 
          r.status === "fulfilled" && 
          r.value &&
          !r.value.ok && 
          r.value.status !== 409 // Ignorar 409 (já existe)
        );
        
        const sucessos = results.filter(r => 
          r.status === "fulfilled" && 
          r.value &&
          (r.value.ok || r.value.status === 409)
        );
        
        if (errors.length > 0 || failed.length > 0) {
          console.error("Alguns horários não puderam ser bloqueados:", { errors, failed });
          const totalErrors = errors.length + failed.length;
          if (sucessos.length > 0) {
            notifyError(`${sucessos.length} horário(s) bloqueado(s) com sucesso. ${totalErrors} falharam.`);
          } else {
            notifyError("Erro ao bloquear horários. Verifique o console para mais detalhes.");
          }
        } else {
          notifySuccess(`${horariosParaBloquear.length} horário(s) bloqueado(s) com sucesso!`);
        }
        await carregarDados();
      }
    } catch (err) {
      console.error("Erro ao alternar dia", err);
      notifyError(`Erro ao alterar dia: ${err instanceof Error ? err.message : "Erro desconhecido"}`);
    }
  }

  function isSlotBlocked(data: string, hora: string): boolean {
    const horaNormalizada = normalizarHora(hora);
    return blockedSlots.some((s) => {
      const sHoraNormalizada = normalizarHora(s.hora);
      return s.data === data && sHoraNormalizada === horaNormalizada;
    });
  }

  function isSlotOccupied(data: string, hora: string): boolean {
    const ocupados = horariosOcupadosPorDia[data] || new Set<string>();
    return ocupados.has(hora);
  }

  const handleMesAnterior = () => {
    setDataBase((prev) => {
      const novoMes = new Date(prev.getFullYear(), prev.getMonth() - 1, 1);
      // Não permitir ir antes de 1 de janeiro
      return novoMes < DATA_MINIMA ? DATA_MINIMA : novoMes;
    });
    setSelectedDay(null);
  };

  // Verificar se pode ir para o mês anterior
  const podeIrMesAnterior = () => {
    const mesAnterior = new Date(dataBase.getFullYear(), dataBase.getMonth() - 1, 1);
    return mesAnterior >= DATA_MINIMA;
  };

  const handleProximoMes = () => {
    setDataBase((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    setSelectedDay(null);
  };

  const selectedDayData = selectedDay
    ? {
        isoDate: selectedDay,
        ocupados: horariosOcupadosPorDia[selectedDay] || new Set<string>(),
        slotsBloqueados: blockedSlots.filter((s) => s.data === selectedDay),
      }
    : null;

  // Função para confirmar e publicar mudanças
  async function confirmarMudancas() {
    if (
      !(await ask(
        "Tem certeza que deseja confirmar e publicar todas as mudanças?",
        "Isso tornará os horários bloqueados visíveis na página pública de agendamento."
      ))
    ) {
      return;
    }

    try {
      setConfirmando(true);
      const res = await fetch("/api/admin/blocked-slots", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "confirmar" }),
      });

      if (res.ok) {
        const data = await res.json();
        notifySuccess(data.message || "Mudanças confirmadas e publicadas com sucesso!");
        await carregarDados(); // Recarregar dados
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Controle de Agendamento"
        subtitle="Clique em um dia para gerenciar seus horários."
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

      <Card className="!p-6">
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
            
            // Verificar se a data é válida (>= 1 de janeiro)
            const dataDia = new Date(dataBase.getFullYear(), dataBase.getMonth(), dia);
            if (dataDia < DATA_MINIMA) {
              return <div key={idx} />;
            }
            
            const visual = getDiaVisual(isoDate);
            
            // Verificar se a data já passou
            const diaPassado = isDataPassada(isoDate);
            const cell = calendarDayCellStyle(visual, { past: diaPassado });

            return (
              <button
                key={isoDate}
                onClick={() => {
                  // Não permitir selecionar dias passados
                  if (!diaPassado) {
                    setSelectedDay(isoDate);
                  }
                }}
                disabled={diaPassado}
                style={cell.style}
                className={`rounded-md border p-2 text-center text-sm transition ${
                  diaPassado 
                    ? "cursor-not-allowed opacity-60" 
                    : "cursor-pointer"
                } ${cell.className} ${
                  selectedDay === isoDate ? "ring-2 ring-red-500 ring-offset-2 ring-offset-zinc-800" : ""
                }`}
              >
                {dia}
              </button>
            );
          })}
        </div>

        <div className="mt-6 flex flex-wrap gap-4 text-sm text-zinc-400">
          {CALENDAR_LEGEND.map((item) => (
            <div key={item.visual} className="flex items-center gap-2">
              <div
                className={`w-4 h-4 rounded border ${
                  item.visual === "livre"
                    ? "bg-green-600 border-green-500"
                    : item.visual === "parcial"
                      ? "bg-yellow-500 border-yellow-400"
                      : item.visual === "entrega"
                        ? "bg-purple-600 border-purple-500"
                        : item.visual === "ocupado"
                          ? "bg-red-600 border-red-500"
                          : "border-yellow-500"
                }`}
                style={
                  item.visual === "parcial_entrega"
                    ? {
                        background:
                          "linear-gradient(135deg, rgba(234,179,8,0.9) 50%, rgba(147,51,234,0.9) 50%)",
                      }
                    : undefined
                }
              />
              <span>
                {item.color}: {item.label}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* MODAL DE HORÁRIOS DO DIA SELECIONADO */}
      <Modal
        open={!!(selectedDay && selectedDayData)}
        onClose={() => setSelectedDay(null)}
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
              {selectedDayData.ocupados.size} de {HORARIOS_PADRAO.length} horários ocupados
            </p>

            <Button
              fullWidth
              size="md"
              variant={
                selectedDayData.slotsBloqueados.length === HORARIOS_PADRAO.length
                  ? "success"
                  : "danger"
              }
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
                const ocupadoPorOs =
                  occupancy?.kind === "service_order" ||
                  (selectedDayData.ocupados.has(hora) && !bloqueado && occupancy?.kind !== "blocked");
                const podeBloquear = !ocupadoPorOs;
                const horarioPassado = selectedDay ? isHorarioPassado(selectedDay, hora) : false;

                let slotClass =
                  "bg-green-600/20 text-green-300 border-green-600 hover:bg-green-600/30";
                let title = "Clique para bloquear";
                let body: ReactNode = hora;

                if (horarioPassado) {
                  slotClass =
                    "bg-red-900/60 text-red-200 border-red-700 cursor-not-allowed opacity-60";
                  title = "Horário já passou";
                } else if (bloqueado || occupancy?.kind === "blocked") {
                  slotClass = "bg-red-600 text-white border-red-500 hover:bg-red-500";
                  title = "Clique para desbloquear";
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
                  slotClass = `${serviceOrderSlotClasses(cat)} cursor-not-allowed`;
                  const detail: HourOccupancyDetail = occupancy?.kind === "service_order"
                    ? occupancy
                    : {
                        kind: "service_order",
                        label: serviceOrderLabel(occupancy?.serviceType),
                        category: cat,
                        categoryLabel:
                          cat === "presencial" ? "Atendimento Presencial" : "Produção",
                      };
                  title = formatOccupancyTooltip(detail);
                  body = (
                    <span className="flex flex-col items-center gap-0.5">
                      <span>{hora}</span>
                      <span className="text-[10px] font-semibold leading-tight text-center">
                        {detail.label}
                      </span>
                    </span>
                  );
                }

                return (
                  <button
                    key={hora}
                    onClick={() => {
                      if (!horarioPassado && podeBloquear) {
                        toggleSlot(selectedDay, hora);
                      }
                    }}
                    disabled={ocupadoPorOs || horarioPassado}
                    className={`rounded-lg border px-3 py-3 text-sm font-medium transition whitespace-pre-line ${slotClass}`}
                    title={title}
                  >
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
