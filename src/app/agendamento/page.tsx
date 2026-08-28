"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import DuvidasBox from "../components/DuvidasBox";
import { useIntelligentRefresh } from "../hooks/useIntelligentRefresh";
import { useDomainRefresh } from "../hooks/useDomainRefresh";
import {
  exigeAgendamentoHora,
  exigeAgendamentoNoCheckout,
  exigeAgendamentoSomenteData,
  PRODUCTION_SCHEDULE_DEFAULT_HOUR,
} from "../lib/agendamento-payment-rules";
import { SchedulingCalendar } from "./components/SchedulingCalendar";
import {
  CatalogSelectionPanels,
  STUDIO_ORDER,
  BEATS_ORDER,
  type CatalogQtyMap,
} from "./components/CatalogSelectionPanels";
import {
  CHECKOUT_CATALOG,
} from "@/app/lib/service-catalog";
import { PLAN_DEFINITIONS, type PlanTierId } from "@/app/lib/plan-definitions";
import {
  Button,
  EmptyState,
  Input,
  LoadingBlock,
  useFeedback,
} from "@/components/design-system";

type Servico = {
  id: string;
  nome: string;
  preco: number;
  descricao?: string;
};

type Plano = {
  id: string;
  nome: string;
  mensal: number;
  anual: number;
  descricao: string;
  beneficios: { label: string; included: boolean; useTilde?: boolean }[];
};

// ================== DADOS ==================
// GO-H10A: preços/IDs vêm de CHECKOUT_CATALOG (mesma fonte da Homologação).

const SERVICOS_ESTUDIO: Servico[] = STUDIO_ORDER.map((id) => ({
  id,
  nome: CHECKOUT_CATALOG[id].nome,
  preco: CHECKOUT_CATALOG[id].preco,
}));

const BEATS_PACOTES: Servico[] = BEATS_ORDER.map((id) => ({
  id,
  nome: CHECKOUT_CATALOG[id].nome,
  preco: CHECKOUT_CATALOG[id].preco,
}));

const PLANOS: Plano[] = (["bronze", "prata", "ouro"] as PlanTierId[]).map((id) => {
  const p = PLAN_DEFINITIONS[id];
  return {
    id: p.id,
    nome: p.nome,
    mensal: p.mensal,
    anual: p.anual,
    descricao: p.descricao,
    beneficios: p.marketingBenefits,
  };
});

const HORARIOS_PADRAO = [
  "10:00","11:00","12:00","13:00","14:00","15:00",
  "16:00","17:00","18:00","19:00","20:00","21:00","22:00",
];

const AGENDAMENTO_DRAFT_KEY = "agendamento_draft";
const AGENDAMENTO_CHECKOUT_KEY = "agendamento_checkout";
const CARRINHO_KEY = "agendamento_carrinho";

function formatBrl(n: number) {
  return n.toFixed(2).replace(".", ",");
}

// ================== PAGE ==================

function AgendamentoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { notifySuccess, notifyError, notify } = useFeedback();
  const [quantidadesServicos, setQuantidadesServicos] = useState<Record<string, number>>({});
  const [quantidadesBeats, setQuantidadesBeats] = useState<Record<string, number>>({});
  const [comentarios, setComentarios] = useState("");

  // Data mínima: 1 de janeiro do ano atual
  const DATA_MINIMA = new Date(new Date().getFullYear(), 0, 1); // 1 de janeiro do ano atual

  const [dataBase, setDataBase] = useState(() => {
    const hoje = new Date();
    const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    // Se o primeiro dia do mês atual for antes de 1 de janeiro, usar 1 de janeiro
    return primeiroDia < DATA_MINIMA ? DATA_MINIMA : primeiroDia;
  });

  const [dataSelecionada, setDataSelecionada] = useState<string | null>(null);
  const [horaSelecionada, setHoraSelecionada] = useState<string | null>(null);

  const [modoPlano, setModoPlano] = useState<"mensal" | "anual">("mensal");
  const [mostrarPlanos, setMostrarPlanos] = useState(false);
  const [aceiteTermos, setAceiteTermos] = useState(false);
  const [blockedSlots, setBlockedSlots] = useState<Array<{ data: string; hora: string }>>([]);
  const [agendamentos, setAgendamentos] = useState<any[]>([]);
  const [loadingHorarios, setLoadingHorarios] = useState(true);
  const [cupomCode, setCupomCode] = useState("");
  const [cupomAplicado, setCupomAplicado] = useState<{
    code: string;
    discount: number;
    subtotal: number;
    finalTotal: number;
    couponType: string;
  } | null>(null);
  const [validandoCupom, setValidandoCupom] = useState(false);
  const [adicionadoAoCart, setAdicionadoAoCart] = useState(false);

  // Função helper para verificar se uma data já passou (comparando apenas dia/mês/ano)
  const isDataPassada = (isoDate: string): boolean => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0); // Zerar horas para comparar apenas a data
    
    const dataComparar = new Date(isoDate + "T00:00:00");
    dataComparar.setHours(0, 0, 0, 0);
    
    return dataComparar < hoje;
  };

  // Função helper para verificar se um horário já passou (comparando data + hora com agora)
  const isHorarioPassado = (isoDate: string, hora: string): boolean => {
    const agora = new Date();
    
    // Converter hora "HH:MM" para horas e minutos
    const [horas, minutos] = hora.split(":").map(Number);
    
    // Criar data/hora do agendamento
    const dataHoraAgendamento = new Date(isoDate + `T${hora}:00`);
    dataHoraAgendamento.setHours(horas, minutos, 0, 0);
    
    return dataHoraAgendamento < agora;
  };

  // Função para carregar horários bloqueados e agendamentos (usando useCallback para evitar recriações)
  const carregarHorarios = useCallback(async () => {
    try {
      setLoadingHorarios(true);
      
      // Fazer requisições separadas para melhor tratamento de erros
      try {
        const resSlots = await fetch("/api/blocked-slots?" + new Date().getTime());
        const data = await resSlots.json().catch(() => ({ slots: [] }));
        
        // Sempre usar slots do response, mesmo se houver erro
        if (data.slots && Array.isArray(data.slots)) {
          setBlockedSlots(data.slots);
        } else {
          console.warn("Formato inesperado de slots:", data);
          setBlockedSlots([]);
        }
        
        // Log apenas se houver erro, mas não quebrar o fluxo
        if (!resSlots.ok && data.error) {
          console.warn("Aviso ao carregar slots bloqueados:", data.error, data.message);
        }
      } catch (err) {
        console.error("Erro ao buscar slots bloqueados:", err);
        setBlockedSlots([]);
      }

      try {
        const resAgendamentos = await fetch("/api/agendamentos/disponibilidade?" + new Date().getTime());
        if (resAgendamentos.ok) {
          const data = await resAgendamentos.json();
          if (data.agendamentos && Array.isArray(data.agendamentos)) {
            setAgendamentos(data.agendamentos);
          } else {
            console.warn("Formato inesperado de agendamentos:", data);
            setAgendamentos([]);
          }
        } else {
          const errorData = await resAgendamentos.json().catch(() => ({}));
          console.error("Erro ao carregar agendamentos:", resAgendamentos.status, errorData);
          setAgendamentos([]); // Continuar com array vazio em caso de erro
        }
      } catch (err) {
        console.error("Erro ao buscar agendamentos:", err);
        setAgendamentos([]);
      }
    } catch (err) {
      console.error("Erro geral ao carregar horários:", err);
    } finally {
      setLoadingHorarios(false);
    }
  }, []); // Sem dependências - função pura que só usa setters

  // Carregar horários quando mudar o mês
  useEffect(() => {
    carregarHorarios();
  }, [dataBase, carregarHorarios]); // Recarregar quando mudar o mês

  // Restaurar rascunho ao voltar da página de pagamentos
  const aplicarRestore = useCallback(() => {
    if (typeof window === "undefined") return;
    const ref = document.referrer || "";
    const veioDePaginaInicial = ref.length > 0 && (ref.includes(window.location.host) || ref.includes("localhost"))
      && (ref.endsWith("/") || ref.includes("/planos") || ref.includes("/login"));
    const deveLimparRascunho = veioDePaginaInicial && !ref.includes("pagamentos");

    let raw = sessionStorage.getItem(AGENDAMENTO_DRAFT_KEY) || localStorage.getItem(AGENDAMENTO_DRAFT_KEY);
    const draft = raw ? (() => { try { return JSON.parse(raw); } catch { return null; } })() : null;

    if (draft && !deveLimparRascunho) {
      if (draft.quantidadesServicos) setQuantidadesServicos(draft.quantidadesServicos);
      if (draft.quantidadesBeats) setQuantidadesBeats(draft.quantidadesBeats);
      if (draft.comentarios != null) setComentarios(draft.comentarios);
      if (draft.dataSelecionada != null) setDataSelecionada(draft.dataSelecionada);
      if (draft.horaSelecionada != null) setHoraSelecionada(draft.horaSelecionada);
      if (draft.dataBase) setDataBase(new Date(draft.dataBase));
      if (draft.aceiteTermos != null) setAceiteTermos(draft.aceiteTermos);
      if (draft.cupomCode != null) setCupomCode(draft.cupomCode);
      if (draft.cupomAplicado != null) setCupomAplicado(draft.cupomAplicado);
    } else if (deveLimparRascunho) {
      sessionStorage.removeItem(AGENDAMENTO_DRAFT_KEY);
      localStorage.removeItem(AGENDAMENTO_DRAFT_KEY);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const restore = searchParams.get("restore") === "1";
    aplicarRestore();
    if (restore) window.history.replaceState({}, "", "/agendamento");
  }, [searchParams, aplicarRestore]);

  // OP-02A: cupons de serviço → página exclusiva; desconto permanece no checkout comum
  useEffect(() => {
    const cupomFromUrl = searchParams.get("cupom") || searchParams.get("cupomCode");
    if (!cupomFromUrl || !cupomFromUrl.trim()) return;

    const code = cupomFromUrl.trim().toUpperCase();
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`/api/coupons/${encodeURIComponent(code)}`, { cache: "no-store" });
        if (!res.ok || cancelled) {
          if (!cancelled) {
            setCupomCode(code);
          }
          return;
        }
        const data = await res.json();
        if (cancelled) return;
        if (data.coupon?.exclusiveScheduling) {
          router.replace(`/agendamento/cupom/${encodeURIComponent(code)}`);
          return;
        }
        setCupomCode(code);
      } catch {
        if (!cancelled) setCupomCode(code);
      } finally {
        if (!cancelled && typeof window !== "undefined") {
          const url = new URL(window.location.href);
          url.searchParams.delete("cupom");
          url.searchParams.delete("cupomCode");
          window.history.replaceState({}, "", url.pathname + (url.search || ""));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams, router]);

  // pageshow: restaura ao usar botão Voltar do navegador (incl. bfcache)
  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted || document.visibilityState === "visible") aplicarRestore();
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, [aplicarRestore]);

  // Usar hook de atualização inteligente (atualiza a cada 5 min, mas garante atualização no início de cada hora)
  useIntelligentRefresh(carregarHorarios, [dataBase]);
  useDomainRefresh("agenda", () => carregarHorarios());

  // Calcular horários ocupados por dia
  const horariosOcupadosPorDia: Record<string, Set<string>> = useMemo(() => {
    const ocupados: Record<string, Set<string>> = {};

    // Horários bloqueados pelo admin (prioridade - estes são sempre ocupados)
    blockedSlots.forEach((slot) => {
      if (!ocupados[slot.data]) ocupados[slot.data] = new Set();
      
      // Garantir formato consistente HH:00
      let horaFormatada = slot.hora || "";
      
      if (!horaFormatada || !horaFormatada.includes(":")) {
        // Se não tiver ":", assumir que é só a hora
        const horaNum = parseInt(horaFormatada || "0", 10);
        horaFormatada = `${String(horaNum).padStart(2, "0")}:00`;
      } else {
        // Se tiver ":", normalizar para HH:00
        const partes = horaFormatada.split(":");
        if (partes.length >= 2) {
          const horas = parseInt(partes[0] || "0", 10);
          horaFormatada = `${String(horas).padStart(2, "0")}:00`;
        }
      }
      
      ocupados[slot.data].add(horaFormatada);
    });

    // Agendamentos aceitos/confirmados
    agendamentos.forEach((a) => {
      // Converter data para string no formato YYYY-MM-DD
      let dataStr: string;
      if (typeof a.data === "string") {
        // Se já for string, usar diretamente (assumindo formato ISO ou YYYY-MM-DD)
        const dateObj = new Date(a.data);
        dataStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}-${String(dateObj.getDate()).padStart(2, "0")}`;
      } else {
        // Se for Date object
        const data = new Date(a.data);
        dataStr = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`;
      }
      
      if (!ocupados[dataStr]) ocupados[dataStr] = new Set();
      
      // Processar horário e duração
      const dataObj = typeof a.data === "string" ? new Date(a.data) : new Date(a.data);
      const horaInicio = dataObj.getHours();
      const minutoInicio = dataObj.getMinutes();
      const duracaoMinutos = a.duracaoMinutos || 60; // Default 1 hora
      
      // Calcular todos os horários ocupados baseado na duração
      // Se começa às 10:00 e dura 2 horas, ocupa 10:00 e 11:00
      const horasOcupadas = Math.ceil(duracaoMinutos / 60);
      for (let i = 0; i < horasOcupadas; i++) {
        const horaOcupada = horaInicio + i;
        // Formato HH:00 para corresponder aos HORARIOS_PADRAO
        const horaFormatada = `${String(horaOcupada).padStart(2, "0")}:00`;
        ocupados[dataStr].add(horaFormatada);
      }
    });

    return ocupados;
  }, [agendamentos, blockedSlots]);

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

  const handleQuantServico = (
    id: string,
    delta: number,
    tipo: "estudio" | "beat"
  ) => {
    if (tipo === "estudio") {
      setQuantidadesServicos(prev => ({
        ...prev,
        [id]: Math.max(0, (prev[id] || 0) + delta),
      }));
    } else {
      setQuantidadesBeats(prev => ({
        ...prev,
        [id]: Math.max(0, (prev[id] || 0) + delta),
      }));
    }
  };

  const totalServicos = SERVICOS_ESTUDIO.reduce(
    (acc, s) => acc + (quantidadesServicos[s.id] || 0) * s.preco,
    0
  );

  const totalBeats = BEATS_PACOTES.reduce(
    (acc, s) => acc + (quantidadesBeats[s.id] || 0) * s.preco,
    0
  );

  const totalGeral = totalServicos + totalBeats;

  const linhasCheckout = useMemo(() => {
    const servicos = SERVICOS_ESTUDIO
      .filter((s) => (quantidadesServicos[s.id] || 0) > 0)
      .map((s) => ({ id: s.id, nome: s.nome, quantidade: quantidadesServicos[s.id] }));
    const beats = BEATS_PACOTES
      .filter((b) => (quantidadesBeats[b.id] || 0) > 0)
      .map((b) => ({ id: b.id, nome: b.nome, quantidade: quantidadesBeats[b.id] }));
    return { servicos, beats };
  }, [quantidadesServicos, quantidadesBeats]);

  /** GO-H3: compra unitária abre agenda; multi → cupons. */
  const precisaAgenda = useMemo(
    () => exigeAgendamentoNoCheckout(linhasCheckout.servicos, linhasCheckout.beats),
    [linhasCheckout]
  );
  const precisaHora = useMemo(
    () => exigeAgendamentoHora(linhasCheckout.servicos, linhasCheckout.beats),
    [linhasCheckout]
  );
  const somenteDataProducao = useMemo(
    () => exigeAgendamentoSomenteData(linhasCheckout.servicos, linhasCheckout.beats),
    [linhasCheckout]
  );
  const horaEfetiva = useMemo(() => {
    if (!precisaAgenda || !dataSelecionada) return null;
    if (precisaHora) return horaSelecionada;
    return PRODUCTION_SCHEDULE_DEFAULT_HOUR;
  }, [precisaAgenda, precisaHora, dataSelecionada, horaSelecionada]);

  // Calcular desconto do cupom e total com desconto
  const descontoCupom = useMemo(() => {
    if (!cupomAplicado) return 0;
    return cupomAplicado.discount || 0;
  }, [cupomAplicado]);

  const totalComDesconto = useMemo(() => {
    if (cupomAplicado && typeof cupomAplicado.finalTotal === "number") {
      return Math.max(0, cupomAplicado.finalTotal);
    }
    return Math.max(0, totalGeral - descontoCupom);
  }, [cupomAplicado, totalGeral, descontoCupom]);

  const prevCatalogTotal = useRef(totalGeral);
  useEffect(() => {
    if (prevCatalogTotal.current !== totalGeral) {
      prevCatalogTotal.current = totalGeral;
      if (cupomAplicado) {
        setCupomAplicado(null);
        setCupomCode("");
      }
    }
  }, [totalGeral, cupomAplicado]);

  const dataFormatada = useMemo(() => {
    if (!dataSelecionada) return null;
    const [ano, mes, dia] = dataSelecionada.split("-");
    return new Date(+ano, +mes - 1, +dia).toLocaleDateString("pt-BR");
  }, [dataSelecionada]);

  const handleConfirmar = async () => {
    // 🔒 Verificar se usuário está logado (exceto admin que pode testar)
    if (!user) {
      notify("Você precisa estar logado para fazer um agendamento.");
      router.push("/login?redirect=/agendamento");
      return;
    }
    
    // Verificar se há algum serviço ou pacote selecionado
    if (totalGeral <= 0) {
      notify("Nenhum serviço selecionado");
      return;
    }

    if (precisaAgenda) {
      if (!dataSelecionada) {
        notify(somenteDataProducao ? "Selecione a data de entrega desejada" : "O dia não foi selecionado");
        return;
      }
      if (precisaHora && !horaSelecionada) {
        notify("A hora não foi selecionada");
        return;
      }
    }
    
    // Verificar se os termos foram aceitos
    if (!aceiteTermos) {
      notify("É preciso marcar a declaração dos Termos de Contrato antes de confirmar o pagamento.");
      return;
    }
    
    // Preparar dados do agendamento
    const servicos = SERVICOS_ESTUDIO
      .filter(s => quantidadesServicos[s.id] > 0)
      .map(s => ({
        id: s.id,
        nome: s.nome,
        quantidade: quantidadesServicos[s.id],
        preco: s.preco,
      }));

    const beats = BEATS_PACOTES
      .filter(b => quantidadesBeats[b.id] > 0)
      .map(b => ({
        id: b.id,
        nome: b.nome,
        quantidade: quantidadesBeats[b.id],
        preco: b.preco,
      }));

    // Calcular duração total (mínimo 1 hora, baseado nos serviços)
    // Se tiver captação, usar 1h por captação, senão usar 1h padrão
    let duracaoMinutos = 60;
    if (servicos.length > 0) {
      const captacaoQtd = quantidadesServicos["captacao"] || 0;
      const sessaoQtd = quantidadesServicos["sessao"] || 0;
      if (captacaoQtd > 0 || sessaoQtd > 0) {
        duracaoMinutos = Math.max(60, (captacaoQtd + sessaoQtd) * 60);
      } else {
        duracaoMinutos = 60; // Para outros serviços, usar 1h padrão
      }
    }

    // Se cupom de serviço foi aplicado e o total com desconto é 0, criar agendamento diretamente sem pagamento
    if (cupomAplicado && totalComDesconto === 0) {
      console.log("[Agendamento] Tentando criar agendamento com cupom de serviço:", {
        cupomCode: cupomAplicado.code,
        totalComDesconto,
        servicos,
        beats,
        data: dataSelecionada,
        hora: horaEfetiva,
      });
      try {
        const res = await fetch("/api/agendamentos/com-cupom", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            data: dataSelecionada,
            hora: horaEfetiva,
            duracaoMinutos,
            tipo: "sessao",
            servicos,
            beats,
            observacoes: comentarios,
            cupomCode: cupomAplicado.code,
          }),
        });

        const data = await res.json();
        if (res.ok && data.success) {
          notifySuccess("Agendamento criado com sucesso!", "Aguarde a confirmação por email.");
          // Limpar formulário
          setQuantidadesServicos({});
          setQuantidadesBeats({});
          setComentarios("");
          setDataSelecionada(null);
          setHoraSelecionada(null);
          setCupomAplicado(null);
          setCupomCode("");
          setAceiteTermos(false);
          // SYNC-01A — invalidação sem reload
          await carregarHorarios();
          return;
        } else {
          const errorMessage = data.error || "Erro ao criar agendamento com cupom";
          console.error("[Agendamento] Erro ao criar com cupom:", errorMessage, data);
          notifyError(errorMessage);
          return;
        }
      } catch (err: any) {
        console.error("[Agendamento] Erro ao criar agendamento com cupom:", err);
        notifyError(`Erro ao criar agendamento: ${err.message || "Tente novamente."}`);
        return;
      }
    }

    // Se não for cupom de serviço ou se ainda há valor a pagar: adicionar ao carrinho e ir para o carrinho
    const item = {
      cartId: Date.now(),
      data: dataSelecionada,
      hora: horaEfetiva,
      duracaoMinutos,
      tipo: "sessao",
      servicos,
      beats,
      total: totalComDesconto,
      subtotal: cupomAplicado?.subtotal ?? totalGeral,
      discount: cupomAplicado?.discount ?? 0,
      observacoes: comentarios,
      cupomCode: cupomAplicado?.code || undefined,
      cupomAplicado: cupomAplicado || undefined,
    };
    try {
      const raw = sessionStorage.getItem(CARRINHO_KEY) || localStorage.getItem(CARRINHO_KEY) || "[]";
      const cart = JSON.parse(raw);
      if (!Array.isArray(cart)) throw new Error("Cart invalid");
      cart.push(item);
      const str = JSON.stringify(cart);
      sessionStorage.setItem(CARRINHO_KEY, str);
      localStorage.setItem(CARRINHO_KEY, str);
      // Limpar formulário e rascunho
      setQuantidadesServicos({});
      setQuantidadesBeats({});
      setComentarios("");
      setDataSelecionada(null);
      setHoraSelecionada(null);
      setCupomAplicado(null);
      setCupomCode("");
      setAceiteTermos(false);
      setDataBase(() => {
        const hoje = new Date();
        return new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      });
      try {
        sessionStorage.removeItem(AGENDAMENTO_DRAFT_KEY);
        localStorage.removeItem(AGENDAMENTO_DRAFT_KEY);
      } catch (_) {}
      window.location.href = "/carrinho";
    } catch (e) {
      console.warn("[Agendamento] Erro ao ir para carrinho:", e);
      notifyError("Não foi possível continuar. Tente novamente.");
    }
  };

  const handleAdicionarAoCarrinho = () => {
    if (!user) {
      notify("Você precisa estar logado para adicionar ao carrinho.");
      router.push("/login?redirect=/agendamento");
      return;
    }
    if (totalGeral <= 0) {
      notify("Nenhum serviço selecionado");
      return;
    }
    if (precisaAgenda) {
      if (!dataSelecionada) {
        notify(somenteDataProducao ? "Selecione a data de entrega desejada" : "O dia não foi selecionado");
        return;
      }
      if (precisaHora && !horaSelecionada) {
        notify("A hora não foi selecionada");
        return;
      }
    }
    if (!aceiteTermos) {
      notify("É preciso marcar a declaração dos Termos de Contrato antes de adicionar ao carrinho.");
      return;
    }
    const servicos = SERVICOS_ESTUDIO
      .filter(s => quantidadesServicos[s.id] > 0)
      .map(s => ({
        id: s.id,
        nome: s.nome,
        quantidade: quantidadesServicos[s.id],
        preco: s.preco,
      }));
    const beats = BEATS_PACOTES
      .filter(b => quantidadesBeats[b.id] > 0)
      .map(b => ({
        id: b.id,
        nome: b.nome,
        quantidade: quantidadesBeats[b.id],
        preco: b.preco,
      }));
    let duracaoMinutos = 60;
    if (servicos.length > 0) {
      const captacaoQtd = quantidadesServicos["captacao"] || 0;
      const sessaoQtd = quantidadesServicos["sessao"] || 0;
      if (captacaoQtd > 0 || sessaoQtd > 0) {
        duracaoMinutos = Math.max(60, (captacaoQtd + sessaoQtd) * 60);
      }
    }
    const item = {
      cartId: Date.now(),
      data: dataSelecionada,
      hora: horaEfetiva,
      duracaoMinutos,
      tipo: "sessao",
      servicos,
      beats,
      total: totalComDesconto,
      subtotal: cupomAplicado?.subtotal ?? totalGeral,
      discount: cupomAplicado?.discount ?? 0,
      observacoes: comentarios,
      cupomCode: cupomAplicado?.code || undefined,
      cupomAplicado: cupomAplicado || undefined,
    };
    try {
      const raw = sessionStorage.getItem(CARRINHO_KEY) || localStorage.getItem(CARRINHO_KEY) || "[]";
      const cart = JSON.parse(raw);
      if (!Array.isArray(cart)) throw new Error("Cart invalid");
      cart.push(item);
      const str = JSON.stringify(cart);
      sessionStorage.setItem(CARRINHO_KEY, str);
      localStorage.setItem(CARRINHO_KEY, str);
      setAdicionadoAoCart(true);
      // Limpar formulário e rascunho para deixar a página limpa
      setQuantidadesServicos({});
      setQuantidadesBeats({});
      setComentarios("");
      setDataSelecionada(null);
      setHoraSelecionada(null);
      setCupomAplicado(null);
      setCupomCode("");
      setAceiteTermos(false);
      setDataBase(() => {
        const hoje = new Date();
        return new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      });
      try {
        sessionStorage.removeItem(AGENDAMENTO_DRAFT_KEY);
        localStorage.removeItem(AGENDAMENTO_DRAFT_KEY);
      } catch (_) {}
    } catch (e) {
      console.warn("[Agendamento] Erro ao salvar carrinho:", e);
      notifyError("Não foi possível adicionar ao carrinho. Tente novamente.");
    }
  };

  const handleMesAnterior = () => {
    setDataBase(prev => {
      const novoMes = new Date(prev.getFullYear(), prev.getMonth() - 1, 1);
      // Não permitir ir antes de 1 de janeiro
      return novoMes < DATA_MINIMA ? DATA_MINIMA : novoMes;
    });
  };

  // Verificar se pode ir para o mês anterior
  const podeIrMesAnterior = () => {
    const mesAnterior = new Date(dataBase.getFullYear(), dataBase.getMonth() - 1, 1);
    return mesAnterior >= DATA_MINIMA;
  };

  const handleProximoMes = () => {
    setDataBase(prev =>
      new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
    );
  };

  return (
    <main className="relative mx-auto max-w-4xl px-4 sm:px-6 py-4 sm:py-6 text-zinc-100 overflow-x-hidden">
      {/* Imagem de fundo da página de agendamento */}
      <div
        className="fixed inset-0 z-0 bg-no-repeat bg-zinc-900 page-bg-image"
        style={{
          backgroundImage: "url(/agendamento-bg.png.jpeg)",
          ["--page-bg-size" as string]: "cover",
          ["--page-bg-position" as string]: "center -20%",
        }}
        aria-hidden
      />

      <div className="relative z-10">
      {/* =========================================================
          CATÁLOGO (GO-H10A — mesmo componente da Homologação)
      ========================================================== */}
      <div className="mb-16 px-4 pt-2 sm:pt-4">
        <CatalogSelectionPanels
          qty={
            {
              ...quantidadesServicos,
              ...quantidadesBeats,
            } as CatalogQtyMap
          }
          onBump={(id, delta) => {
            const tipo =
              CHECKOUT_CATALOG[id]?.category === "beat" ? "beat" : "estudio";
            handleQuantServico(id, delta, tipo);
          }}
          showStudio
          showBeats
          sectionStyle="marketing"
        />
      </div>

      {/* =========================================================
          COMENTÁRIOS ADICIONAIS
      ========================================================== */}
      <section className="mb-16 flex justify-center px-4 mt-16">
        <div className="relative w-full max-w-4xl border border-red-500" style={{ borderWidth: "1px", borderBottomWidth: "2px" }}>
          <div
            className="relative space-y-3 p-6 md:p-8"
            style={{
              background: "linear-gradient(to right, rgba(0,0,0,0) 0%, rgba(0,0,0,0.75) 8%, rgba(0,0,0,0.85) 20%, rgba(0,0,0,0.85) 80%, rgba(0,0,0,0.75) 92%, rgba(0,0,0,0) 100%)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
            }}
          >
            <h2 className="text-center text-lg font-semibold text-red-400" style={{ textShadow: "0 2px 4px rgba(0, 0, 0, 0.5)" }}>
              Comentários adicionais sobre o seu projeto
            </h2>

            <p className="text-center text-sm text-white md:text-base" style={{ textShadow: "0 2px 8px rgba(0, 0, 0, 0.8)" }}>
              Use este espaço para descrever o que você quer fazer: estilo,
              referências, clima da música e objetivos da sessão.
            </p>

            <textarea
              value={comentarios}
              onChange={(e) => setComentarios(e.target.value)}
              rows={4}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 p-3 text-sm text-zinc-100 outline-none focus:border-red-500"
              placeholder="Descreva o projeto, referências, mood, tipo de beat..."
            />
          </div>
        </div>
      </section>

      {/* =========================================================
          AGENDAMENTO VIRTUAL (CALENDÁRIO + HORÁRIOS)
          GO-H4: mesmo SchedulingCalendar do fluxo por cupom.
      ========================================================== */}
      {precisaAgenda ? (
      <section className="mb-16 flex justify-center px-4 mt-16">
        <div className="relative w-full max-w-4xl border border-red-500" style={{ borderWidth: "1px" }}>
          <SchedulingCalendar
            serviceType={(linhasCheckout.servicos[0] || linhasCheckout.beats[0])?.id}
            serviceName={(linhasCheckout.servicos[0] || linhasCheckout.beats[0])?.nome}
            showHours={precisaHora}
            dataSelecionada={dataSelecionada}
            horaSelecionada={horaSelecionada}
            onDataChange={setDataSelecionada}
            onHoraChange={setHoraSelecionada}
          />
          
          {/* LINHA INFERIOR COM FADE */}
          <div 
            className="h-[1px]"
            style={{
              background: "linear-gradient(to right, transparent 0%, rgba(239, 68, 68, 0.3) 15%, rgba(239, 68, 68, 0.6) 50%, rgba(239, 68, 68, 0.3) 85%, transparent 100%)",
              boxShadow: "0 1px 10px rgba(239, 68, 68, 0.4)"
            }}
          />
        </div>
      </section>
      ) : (
        <section className="mb-8 flex justify-center px-4 mt-10">
          <div className="w-full max-w-4xl rounded-xl border border-zinc-700 bg-zinc-900/60 p-4 text-center text-sm text-zinc-300">
            Compra com 2 ou mais Ordens de Serviço: após o pagamento você receberá um cupom
            de agendamento para cada Ordem. Cada cupom abre somente o calendário daquele serviço
            (sem crédito financeiro).
          </div>
        </section>
      )}

      {/* =========================================================
          TRABALHOS EXTERNOS
      ========================================================== */}
      <section className="mb-16 flex justify-center px-4 mt-16">
        <div className="relative w-full max-w-4xl border border-yellow-500" style={{ borderWidth: "1px", borderBottomWidth: "2px" }}>
          <div
            className="relative p-6 md:p-8"
            style={{
              background: "linear-gradient(to right, rgba(0,0,0,0) 0%, rgba(0,0,0,0.75) 8%, rgba(0,0,0,0.85) 20%, rgba(0,0,0,0.85) 80%, rgba(0,0,0,0.75) 92%, rgba(0,0,0,0) 100%)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
            }}
          >
            <p className="text-xs md:text-sm text-white leading-relaxed text-justify md:text-center px-2 md:px-0" style={{ textShadow: "0 2px 8px rgba(0, 0, 0, 0.8)" }}>
              Qualquer trabalho à parte, como <strong className="text-yellow-300">técnico de som</strong>,{" "}
              <strong className="text-yellow-300">técnico de mixagem</strong>,{" "}
              <strong className="text-yellow-300">mestre de cerimônia</strong> e outras funções relacionadas
              podem ser solicitados diretamente com o estúdio. Para combinar esse
              tipo de serviço, envie uma mensagem pela página de{" "}
              <a
                href="/contato"
                className="font-semibold text-yellow-400 underline underline-offset-4 hover:text-yellow-300"
              >
                contato
              </a>
              .
            </p>
          </div>
        </div>
      </section>

      {/* =========================================================
          PLANOS (COLAPSÁVEL)
      ========================================================== */}
      <section className="mb-16 flex justify-center px-4 mt-16">
        <div className="relative w-full max-w-4xl border border-red-500" style={{ borderWidth: "1px" }}>
          <div
            className="relative space-y-4 p-6 md:p-8 text-sm"
            style={{
              background: "linear-gradient(to right, rgba(0,0,0,0) 0%, rgba(0,0,0,0.75) 8%, rgba(0,0,0,0.85) 20%, rgba(0,0,0,0.85) 80%, rgba(0,0,0,0.75) 92%, rgba(0,0,0,0) 100%)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
            }}
          >
            <h2 className="text-center text-lg font-semibold text-red-400" style={{ textShadow: "0 2px 4px rgba(0, 0, 0, 0.5)" }}>
              Quer aprofundar e produzir com frequência?
            </h2>

            <p className="text-xs md:text-sm text-white text-justify md:text-center px-2 md:px-0" style={{ textShadow: "0 2px 8px rgba(0, 0, 0, 0.8)" }}>
              Se você já sabe que quer manter uma rotina de lançamentos, os planos da THouse Rec oferecem benefícios mensais por ciclo e melhor previsibilidade de custo. Produzir com consistência muda completamente o ritmo da sua carreira.
            </p>

          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => setMostrarPlanos((v) => !v)}
              className="inline-flex items-center gap-2 rounded-full border border-red-600 bg-red-600/10 px-4 py-2 text-xs font-semibold text-red-300 hover:bg-red-600/20"
            >
              {mostrarPlanos ? "Fechar planos" : "Ver planos disponíveis"}
            </button>
          </div>

          {mostrarPlanos && (
            <>
              {/* Toggle Mensal / Anual */}
              <div className="flex justify-center items-center px-4 w-full mb-3">
                <div className="inline-flex rounded-full border border-red-700/60 bg-zinc-900 p-1">
                  <button
                    type="button"
                    onClick={() => setModoPlano("mensal")}
                    className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                      modoPlano === "mensal"
                        ? "bg-red-600 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)]"
                        : "text-zinc-300 hover:text-red-300 hover:bg-black/40"
                    }`}
                  >
                    Mensal
                  </button>
                  <button
                    type="button"
                    onClick={() => setModoPlano("anual")}
                    className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                      modoPlano === "anual"
                        ? "bg-red-600 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)]"
                        : "text-zinc-300 hover:text-red-300 hover:bg-black/40"
                    }`}
                  >
                    Anual
                  </button>
                </div>
              </div>

              {/* GRID DOS PLANOS */}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:items-stretch">
                {PLANOS.map((plano) => {
                  const valorBase =
                    modoPlano === "mensal" ? plano.mensal : plano.anual;

                  const precoFormatado =
                    modoPlano === "mensal"
                      ? `R$ ${valorBase.toFixed(2).replace(".", ",")} / mês`
                      : `R$ ${valorBase.toFixed(2).replace(".", ",")} / ano`;

                  const borderColor = plano.id === "bronze" 
                    ? "border-amber-600/80" 
                    : plano.id === "prata" 
                    ? "border-gray-400/80" 
                    : "border-yellow-400/80";
                  const hoverBorderColor = plano.id === "bronze"
                    ? "hover:border-amber-500"
                    : plano.id === "prata"
                    ? "hover:border-gray-300"
                    : "hover:border-yellow-300";

                  return (
                    <div
                      key={plano.id}
                      className={`flex h-full flex-col rounded-2xl border ${borderColor} bg-black/50 backdrop-blur-sm p-6 transition-all ${hoverBorderColor} hover:bg-black/70`}
                      style={{ 
                        textShadow: "0 2px 4px rgba(0, 0, 0, 0.5)", 
                        borderWidth: "1px",
                        boxShadow: plano.id === "bronze" 
                          ? "0 0 20px rgba(217, 119, 6, 0.4), 0 0 10px rgba(217, 119, 6, 0.2)"
                          : plano.id === "prata"
                          ? "0 0 20px rgba(156, 163, 175, 0.4), 0 0 10px rgba(156, 163, 175, 0.2)"
                          : "0 0 20px rgba(234, 179, 8, 0.4), 0 0 10px rgba(234, 179, 8, 0.2)"
                      }}
                    >
                      <div className="flex flex-col h-full">
                        <div className="flex-1 flex flex-col">
                          <div className="space-y-6">
                            <h3 className="text-center text-lg font-semibold">
                              {plano.id === "bronze" ? (
                                <span className="text-amber-600">Plano Bronze</span>
                              ) : plano.id === "prata" ? (
                                <span className="text-gray-400">Plano Prata</span>
                              ) : plano.id === "ouro" ? (
                                <span className="text-yellow-400">Plano Ouro</span>
                              ) : (
                                <span className="text-red-300">{plano.nome}</span>
                              )}
                            </h3>

                            <p className="text-center text-2xl font-bold text-red-400">
                              {precoFormatado}
                            </p>

                            <p className="text-center text-xs text-zinc-400">
                              {plano.descricao}
                            </p>
                          </div>

                          <ul className="mt-10 space-y-2 mb-6 text-xs text-zinc-200">
                            {plano.beneficios.map((b, idx) => {
                              const useTilde = b.useTilde && b.included;
                              const isPriorityIntermediate = (b.label === "Prioridade intermediária" || b.label === "Prioridade intermediária na agenda") && b.included;
                              const iconColor = b.included 
                                ? (isPriorityIntermediate ? "bg-yellow-500" : "bg-emerald-500") 
                                : "bg-red-600";
                              const textColor = b.included 
                                ? (isPriorityIntermediate ? "text-yellow-200" : "text-emerald-200") 
                                : "text-red-300";
                              const boxBgColor = isPriorityIntermediate ? "bg-yellow-950/40" : "bg-zinc-900";
                              const boxBorderColor = isPriorityIntermediate ? "border-yellow-500/60" : "";
                              
                              return (
                                <li
                                  key={idx}
                                  className={`flex items-center gap-2 rounded-lg px-4 py-2 ${boxBgColor} ${boxBorderColor} ${boxBorderColor ? "border" : ""}`}
                                >
                                  <span
                                    className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold ${iconColor} text-black`}
                                  >
                                    {useTilde ? "~" : (b.included ? "✓" : "✕")}
                                  </span>
                                  <span className={b.included ? textColor : "text-red-300"}>
                                    {b.label}
                                  </span>
                                </li>
                              );
                            })}
                          </ul>
                        </div>

                        <a
                          href="/planos"
                          className="mt-auto w-full rounded-full border border-red-600 px-5 py-3 text-sm font-semibold text-red-300 hover:bg-red-600/20 transition-all text-center"
                          style={{ textShadow: "0 2px 4px rgba(0, 0, 0, 0.5)" }}
                        >
                          Ver este plano em detalhes
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>

              <p className="mt-1 text-[11px] text-zinc-400 text-justify md:text-center px-2 md:px-0">
                A contratação de qualquer plano está sujeita à confirmação do pagamento e ao aceite dos{" "}
                <a href="/termos-contratos" className="!text-blue-400 underline underline-offset-2 hover:!text-blue-300 transition-colors" style={{ color: '#60a5fa' }}>termos de uso</a>
                <span className="hidden md:inline"><br />e </span>
                <span className="md:hidden"> e </span>
                <a href="/termos-contratos" className="!text-blue-400 underline underline-offset-2 hover:!text-blue-300 transition-colors" style={{ color: '#60a5fa' }}>contrato de prestação de serviço</a> da THouse Rec.
              </p>
            </>
          )}
          </div>
        </div>
      </section>

      {/* =========================================================
          CUPOM DE DESCONTO
      ========================================================== */}
      <section className="mb-16 flex justify-center px-4 mt-16">
        <div className="relative w-full max-w-4xl border border-red-500" style={{ borderWidth: "1px" }}>
          <div
            className="relative space-y-3 p-6 md:p-8"
            style={{
              background: "linear-gradient(to right, rgba(0,0,0,0) 0%, rgba(0,0,0,0.75) 8%, rgba(0,0,0,0.85) 20%, rgba(0,0,0,0.85) 80%, rgba(0,0,0,0.75) 92%, rgba(0,0,0,0) 100%)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
            }}
          >
            <h2 className="text-center text-lg font-semibold text-red-400" style={{ textShadow: "0 2px 4px rgba(0, 0, 0, 0.5)" }}>
              Cupom de Desconto
            </h2>

            <p className="text-center text-sm text-white md:text-base" style={{ textShadow: "0 2px 8px rgba(0, 0, 0, 0.8)" }}>
              Se você possui um cupom de desconto ou cupom de plano, insira o código abaixo para aplicar o desconto automaticamente.
            </p>

            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                type="text"
                value={cupomCode}
                onChange={(e) => setCupomCode(e.target.value.toUpperCase())}
                placeholder="Digite o código do cupom"
                disabled={validandoCupom || !!cupomAplicado}
                className="flex-1"
              />
              {!cupomAplicado ? (
                <Button
                  type="button"
                  onClick={async () => {
                    if (!cupomCode.trim()) {
                      notify("Digite um código de cupom");
                      return;
                    }
                    if (totalGeral <= 0) {
                      notify("Selecione pelo menos um serviço antes de aplicar o cupom");
                      return;
                    }
                    setValidandoCupom(true);
                    try {
                      const servicosParaValidar = SERVICOS_ESTUDIO
                        .filter((s) => (quantidadesServicos[s.id] || 0) > 0)
                        .map((s) => ({
                          id: s.id,
                          nome: s.nome,
                          quantidade: quantidadesServicos[s.id] || 0,
                          preco: s.preco,
                        }));
                      const beatsParaValidar = BEATS_PACOTES
                        .filter((b) => (quantidadesBeats[b.id] || 0) > 0)
                        .map((b) => ({
                          id: b.id,
                          nome: b.nome,
                          quantidade: quantidadesBeats[b.id] || 0,
                          preco: b.preco,
                        }));
                      const res = await fetch("/api/coupons/validate", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          code: cupomCode,
                          total: totalGeral,
                          servicos: servicosParaValidar,
                          beats: beatsParaValidar,
                        }),
                      });
                      const data = await res.json();
                      if (data.valid) {
                        setCupomAplicado({
                          code: cupomCode,
                          discount: Number(data.discount) || 0,
                          subtotal: Number(data.subtotal) || totalGeral,
                          finalTotal: Number(data.finalTotal),
                          couponType: data.couponType,
                        });
                      } else {
                        notifyError(data.error || "Cupom inválido ou inexistente");
                      }
                    } catch (err) {
                      notifyError("Erro ao validar cupom. Tente novamente.");
                    } finally {
                      setValidandoCupom(false);
                    }
                  }}
                  disabled={validandoCupom || totalGeral <= 0}
                  variant="primary"
                  loading={validandoCupom}
                >
                  Aplicar
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={() => {
                    setCupomAplicado(null);
                    setCupomCode("");
                  }}
                  variant="danger"
                >
                  Remover
                </Button>
              )}
            </div>
            {cupomAplicado && (
              <p className="mt-2 text-center text-sm text-green-400">
                ✓ Cupom aplicado. Desconto de R$ {formatBrl(cupomAplicado.discount)}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* =========================================================
          RESUMO / VALOR TOTAL
      ========================================================== */}
      <section className="mb-16 flex justify-center px-4 mt-16">
        <div className="relative w-full max-w-4xl border border-red-500" style={{ borderWidth: "1px", borderBottomWidth: "2px" }}>
          <div
            className="relative p-6 md:p-8"
            style={{
              background: "linear-gradient(to right, rgba(0,0,0,0) 0%, rgba(0,0,0,0.75) 8%, rgba(0,0,0,0.85) 20%, rgba(0,0,0,0.85) 80%, rgba(0,0,0,0.75) 92%, rgba(0,0,0,0) 100%)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
            }}
          >
            <h2 className="mb-6 text-center text-2xl font-semibold text-red-400" style={{ textShadow: "0 2px 4px rgba(0, 0, 0, 0.5)" }}>
              Resumo do seu agendamento
            </h2>

            <div className="flex flex-col gap-8 md:flex-row md:items-end">
          {/* COLUNA ESQUERDA – SERVIÇOS */}
          <div className="flex-1">
            <h3 className="mb-3 text-xl font-semibold text-zinc-200">
                Serviços selecionados
            </h3>

            <ul className="space-y-1 text-sm text-zinc-300">
              {SERVICOS_ESTUDIO.map((s) => {
                const q = quantidadesServicos[s.id] || 0;
                if (!q) return null;
                return (
                  <li key={s.id}>
                    {q}x {s.nome} — R$ {(q * s.preco).toFixed(2).replace(".", ",")}
                  </li>
                );
              })}

              {BEATS_PACOTES.map((s) => {
                const q = quantidadesBeats[s.id] || 0;
                if (!q) return null;
                return (
                  <li key={s.id}>
                    {q}x {s.nome} — R$ {(q * s.preco).toFixed(2).replace(".", ",")}
                    </li>
                );
              })}

              {totalGeral === 0 && (
                <li><EmptyState title="Nenhum serviço selecionado ainda." className="py-5" /></li>
              )}
            </ul>
          </div>

          {/* COLUNA DIREITA – DATA / HORA / TOTAL */}
          <div className="flex flex-col items-end gap-2 text-right">
            <p className="text-base md:text-xl font-extrabold text-zinc-300 whitespace-nowrap">
              Horário:{" "}
              <span className="font-extrabold">
                {horaSelecionada || "—"}
              </span>
            </p>

            <p className="text-base md:text-xl font-extrabold text-zinc-300 whitespace-nowrap">
              Data:{" "}
              <span className="font-extrabold">
                {dataSelecionada
                  ? new Date(`${dataSelecionada}T12:00:00`).toLocaleDateString(
                      "pt-BR"
                    )
                  : "—"}
              </span>
            </p>

            <div className="mt-2 space-y-1">
              <p className="text-base md:text-xl font-extrabold text-zinc-200 whitespace-nowrap">
                Valor do serviço: R$ {formatBrl(cupomAplicado?.subtotal ?? totalGeral)}
              </p>
              {cupomAplicado && (
                <>
                  <p className="text-sm text-green-400 whitespace-nowrap">
                    Desconto: -R$ {formatBrl(descontoCupom)}
                  </p>
                  <p className="text-2xl md:text-3xl font-extrabold text-yellow-300 whitespace-nowrap">
                    Total final: R$ {formatBrl(totalComDesconto)}
                  </p>
                </>
              )}
              {!cupomAplicado && (
                <p className="text-2xl md:text-3xl font-extrabold text-yellow-300 whitespace-nowrap">
                  Total final: R$ {formatBrl(totalGeral)}
                </p>
              )}
            </div>
          </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          CONFIRMAR E IR PARA PAGAMENTO
      ========================================================== */}
      <section className="mb-16 flex justify-center px-4 mt-16">
        <div className="relative w-full max-w-4xl border border-red-500" style={{ borderWidth: "1px" }}>
          <div
            className="relative space-y-3 p-6 md:p-8 text-sm"
            style={{
              background: "linear-gradient(to right, rgba(0,0,0,0) 0%, rgba(0,0,0,0.75) 8%, rgba(0,0,0,0.85) 20%, rgba(0,0,0,0.85) 80%, rgba(0,0,0,0.75) 92%, rgba(0,0,0,0) 100%)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
            }}
          >
            <p className="text-center text-white md:text-base" style={{ textShadow: "0 2px 8px rgba(0, 0, 0, 0.8)" }}>
              Ao confirmar, você declara estar ciente de que o agendamento só será
              efetivado após a confirmação do pagamento e que ajustes finais
              podem ser alinhados diretamente com o estúdio.
            </p>

            {/* CHECKBOX DE ACEITE DOS TERMOS */}
            <div className="mt-6 flex items-center justify-center gap-2">
              <input
                type="checkbox"
                id="aceite-termos"
                checked={aceiteTermos}
                onChange={(e) => setAceiteTermos(e.target.checked)}
                className="h-4 w-4 cursor-pointer rounded border-zinc-600 bg-zinc-900 text-red-600 focus:ring-2 focus:ring-red-500 focus:ring-offset-0"
              />
              <label
                htmlFor="aceite-termos"
                className="text-sm text-white cursor-pointer"
                style={{ textShadow: "0 2px 8px rgba(0, 0, 0, 0.8)" }}
              >
                Declaro estar ciente dos{" "}
                <a
                  href="/termos-contratos"
                  className="text-blue-400 underline underline-offset-2 hover:text-blue-300 transition-colors"
                >
                  termos de contrato
                </a>
              </label>
            </div>

            {adicionadoAoCart ? (
              <div className="mt-8 space-y-3 flex flex-col items-center">
                <p className="text-green-400 font-medium">Agendamento adicionado ao carrinho!</p>
                <div className="flex flex-wrap gap-3 justify-center">
                  <Button
                    type="button"
                    onClick={() => setAdicionadoAoCart(false)}
                    variant="secondary"
                  >
                    Continuar agendando
                  </Button>
                  <Button
                    type="button"
                    onClick={() => router.push("/carrinho")}
                    variant="primary"
                  >
                    Ir ao carrinho e finalizar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center items-center">
                <Button
                  type="button"
                  onClick={handleAdicionarAoCarrinho}
                  variant="outline"
                  className="w-full sm:w-auto max-w-6xl"
                  style={{ textShadow: "0 2px 4px rgba(0, 0, 0, 0.5)" }}
                >
                  Adicionar ao carrinho
                </Button>
                <Button
                  type="button"
                  onClick={handleConfirmar}
                  variant="primary"
                  className="w-full sm:w-auto max-w-6xl"
                  style={{ textShadow: "0 2px 4px rgba(0, 0, 0, 0.5)" }}
                >
                  Confirmar e ir ao carrinho
                </Button>
              </div>
            )}

            <p className="text-xs text-zinc-300 text-justify md:text-center px-2 md:px-0">
              A confirmação implica concordância com os{" "}
              <a href="/termos-contratos" className="!text-blue-400 underline underline-offset-2 hover:!text-blue-300 transition-colors" style={{ color: '#60a5fa' }}>termos de uso</a> e com o{" "}
              <a href="/termos-contratos" className="!text-blue-400 underline underline-offset-2 hover:!text-blue-300 transition-colors" style={{ color: '#60a5fa' }}>contrato de prestação de serviço</a> da THouse Rec.
            </p>
          </div>
        </div>
      </section>

      {/* =========================================================
          BOX DE TESTE - APENAS PARA ADMIN
      ========================================================== */}
      {user && user.role === "ADMIN" && (
        <section className="mb-16 flex justify-center px-4 mt-16">
          <div className="relative w-full max-w-4xl border-2 border-yellow-500 rounded-xl bg-yellow-950/20 backdrop-blur-sm p-4">
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-yellow-400 text-center">
                Simulação Gratuita — Homologation (Apenas Admin)
              </h3>
              <p className="text-sm text-yellow-200 text-center">
                Usa o <strong>SimulationProvider</strong> (sem Asaas, sem cobrança). O mesmo pipeline oficial
                cria Payment, webhook interno, Appointment/Services/Coupons TEST. Selecione serviços/beats,
                data/horário quando necessário e confirme. Resultado completo em{" "}
                <a href="/admin/homologacao" className="underline text-yellow-100">
                  Admin → Homologação
                </a>
                .
              </p>
              
              {/* Serviços e beats selecionados (resumo) — usa o mesmo estado do formulário principal */}
              <div className="rounded-lg border border-yellow-600/50 bg-yellow-950/30 p-4 mt-4">
                <p className="text-sm font-medium text-yellow-300 mb-2">Serviços e beats para este teste (selecione acima):</p>
                {SERVICOS_ESTUDIO.some((s) => (quantidadesServicos[s.id] || 0) > 0) || BEATS_PACOTES.some((b) => (quantidadesBeats[b.id] || 0) > 0) ? (
                  <ul className="text-sm text-yellow-200 space-y-1">
                    {SERVICOS_ESTUDIO.filter((s) => (quantidadesServicos[s.id] || 0) > 0).map((s) => (
                      <li key={s.id}>
                        {s.nome} x{quantidadesServicos[s.id]} — R$ {((quantidadesServicos[s.id] || 0) * s.preco).toFixed(2)}
                      </li>
                    ))}
                    {BEATS_PACOTES.filter((b) => (quantidadesBeats[b.id] || 0) > 0).map((b) => (
                      <li key={b.id}>
                        {b.nome} x{quantidadesBeats[b.id]} — R$ {((quantidadesBeats[b.id] || 0) * b.preco).toFixed(2)}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-yellow-500/90 text-sm">Nenhum serviço nem beat selecionado. Selecione ao menos um na seção de serviços ou de beats para testar a aba &quot;Serviços Solicitados&quot; no admin.</p>
                )}
              </div>
              
              {/* Formulário de Teste Simplificado */}
              <div className="space-y-4 mt-6">
                {/* Data */}
                <div>
                  <label className="block text-sm font-medium text-yellow-300 mb-2">
                    Data do Agendamento *
                  </label>
                  <input
                    type="date"
                    value={dataSelecionada || ""}
                    onChange={(e) => setDataSelecionada(e.target.value || null)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full rounded-lg border border-yellow-600 bg-zinc-900 px-4 py-2 text-sm text-zinc-100 focus:border-yellow-400 focus:outline-none"
                  />
                </div>

                {/* Horário */}
                <div>
                  <label className="block text-sm font-medium text-yellow-300 mb-2">
                    Horário *
                  </label>
                  <select
                    value={horaSelecionada || ""}
                    onChange={(e) => setHoraSelecionada(e.target.value || null)}
                    className="w-full rounded-lg border border-yellow-600 bg-zinc-900 px-4 py-2 text-sm text-zinc-100 focus:border-yellow-400 focus:outline-none appearance-none"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23ffffff' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 0.75rem center',
                      paddingRight: '2.5rem',
                    }}
                  >
                    <option value="">Selecione um horário</option>
                    {HORARIOS_PADRAO.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Campo de Cupom */}
                <div>
                  <label className="block text-sm font-medium text-yellow-300 mb-2">
                    Cupom de Desconto (Opcional)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={cupomCode}
                      onChange={(e) => setCupomCode(e.target.value.toUpperCase())}
                      placeholder="Digite o código do cupom"
                      disabled={validandoCupom || !!cupomAplicado}
                      className="flex-1 rounded-lg border border-yellow-600 bg-zinc-900 px-4 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-yellow-400 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    {!cupomAplicado ? (
                      <button
                        type="button"
                        onClick={async () => {
                          if (!cupomCode.trim()) {
                            notify("Digite um código de cupom");
                            return;
                          }
                          if (totalGeral <= 0) {
                            notify("Selecione pelo menos um serviço antes de aplicar o cupom");
                            return;
                          }
                          setValidandoCupom(true);
                          try {
                            const servicosParaValidar = SERVICOS_ESTUDIO
                              .filter((s) => (quantidadesServicos[s.id] || 0) > 0)
                              .map((s) => ({
                                id: s.id,
                                nome: s.nome,
                                quantidade: quantidadesServicos[s.id] || 0,
                                preco: s.preco,
                              }));
                            const beatsParaValidar = BEATS_PACOTES
                              .filter((b) => (quantidadesBeats[b.id] || 0) > 0)
                              .map((b) => ({
                                id: b.id,
                                nome: b.nome,
                                quantidade: quantidadesBeats[b.id] || 0,
                                preco: b.preco,
                              }));
                            const res = await fetch("/api/coupons/validate", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                code: cupomCode,
                                total: totalGeral,
                                servicos: servicosParaValidar,
                                beats: beatsParaValidar,
                              }),
                            });
                            const data = await res.json();
                            if (data.valid) {
                              setCupomAplicado({
                                code: cupomCode,
                                discount: Number(data.discount) || 0,
                                subtotal: Number(data.subtotal) || totalGeral,
                                finalTotal: Number(data.finalTotal),
                                couponType: data.couponType,
                              });
                            } else {
                              notifyError(data.error || "Cupom inválido");
                            }
                          } catch (err) {
                            notifyError("Erro ao validar cupom");
                          } finally {
                            setValidandoCupom(false);
                          }
                        }}
                        disabled={validandoCupom || totalGeral <= 0}
                        className="rounded-lg bg-yellow-600 px-4 py-2 text-sm font-semibold text-white hover:bg-yellow-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {validandoCupom ? "Validando..." : "Aplicar"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setCupomAplicado(null);
                          setCupomCode("");
                        }}
                        className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 transition-colors"
                      >
                        Remover
                      </button>
                    )}
                  </div>
                  {cupomAplicado && (
                    <p className="mt-2 text-xs text-green-400">
                      ✓ Cupom aplicado. Desconto de R$ {formatBrl(cupomAplicado.discount)}
                    </p>
                  )}
                </div>

                {/* Comentários */}
                <div>
                  <label className="block text-sm font-medium text-yellow-300 mb-2">
                    Comentários / Observações *
                  </label>
                  <textarea
                    value={comentarios}
                    onChange={(e) => setComentarios(e.target.value)}
                    placeholder="Descreva o que você precisa para esta sessão..."
                    rows={3}
                    className="w-full rounded-lg border border-yellow-600 bg-zinc-900 px-4 py-2 text-sm text-zinc-100 focus:border-yellow-400 focus:outline-none resize-none"
                  />
                </div>

                {/* Checkbox de Aceite */}
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    id="aceite-termos-teste"
                    checked={aceiteTermos}
                    onChange={(e) => setAceiteTermos(e.target.checked)}
                    className="mt-1 h-4 w-4 cursor-pointer rounded border-yellow-600 bg-zinc-900 text-yellow-600 focus:ring-2 focus:ring-yellow-500 focus:ring-offset-0"
                  />
                  <label
                    htmlFor="aceite-termos-teste"
                    className="text-sm text-yellow-200 cursor-pointer"
                  >
                    Declaro estar ciente dos{" "}
                    <a
                      href="/termos-contratos"
                      className="text-blue-400 underline underline-offset-2 hover:text-blue-300 transition-colors"
                    >
                      termos de contrato
                    </a>
                  </label>
                </div>

                {/* Botão de Teste */}
                <button
                  type="button"
                  onClick={async () => {
                    // Validações
                    if (precisaAgenda) {
                      if (!dataSelecionada) {
                        notify(
                          somenteDataProducao
                            ? "Selecione a data de entrega desejada."
                            : "Por favor, selecione uma data."
                        );
                        return;
                      }
                      if (precisaHora && !horaSelecionada) {
                        notify("Por favor, selecione um horário.");
                        return;
                      }
                    }
                    
                    if (!comentarios.trim()) {
                      notify("Por favor, preencha o campo de comentários.");
                      return;
                    }
                    
                    if (!aceiteTermos) {
                      notify("É preciso marcar a declaração dos Termos de Contrato antes de confirmar o pagamento.");
                      return;
                    }

                    // Para testar "Serviços Solicitados" no admin, exige pelo menos um serviço
                    const servicosTeste = SERVICOS_ESTUDIO
                      .filter((s) => (quantidadesServicos[s.id] || 0) > 0)
                      .map((s) => ({ id: s.id, nome: s.nome, quantidade: quantidadesServicos[s.id], preco: s.preco }));
                    const beatsTeste = BEATS_PACOTES
                      .filter((b) => (quantidadesBeats[b.id] || 0) > 0)
                      .map((b) => ({ id: b.id, nome: b.nome, quantidade: quantidadesBeats[b.id], preco: b.preco }));
                    if (servicosTeste.length === 0 && beatsTeste.length === 0) {
                      notify("Selecione pelo menos um serviço ou beat acima para testar a aba \"Serviços Solicitados\" no admin.");
                      return;
                    }

                    if (precisaAgenda && dataSelecionada && (precisaHora ? horaSelecionada : true)) {
                      const h = precisaHora ? horaSelecionada! : PRODUCTION_SCHEDULE_DEFAULT_HOUR;
                      const dataHoraISO = new Date(`${dataSelecionada}T${h}:00`);
                      if (dataHoraISO < new Date()) {
                        notify("Não é possível agendar para uma data/hora que já passou.");
                        return;
                      }
                    }

                    const duracaoTeste = servicosTeste.length > 0
                      ? Math.max(60, ((quantidadesServicos["captacao"] || 0) + (quantidadesServicos["sessao"] || 0)) * 60)
                      : 60;

                    try {
                      const res = await fetch("/api/admin/homologation/run", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          tipo: "agendamento",
                          ...(precisaAgenda
                            ? {
                                data: dataSelecionada,
                                hora: precisaHora
                                  ? horaSelecionada
                                  : PRODUCTION_SCHEDULE_DEFAULT_HOUR,
                              }
                            : {}),
                          observacoes: comentarios,
                          duracaoMinutos: duracaoTeste,
                          servicos: servicosTeste,
                          beats: beatsTeste,
                          runRefund: false,
                        }),
                      });

                      const data = await res.json().catch(() => ({}));
                      if (!res.ok) {
                        notifyError(data.error || "Erro na simulação gratuita.");
                        console.error("[Simulação Gratuita]", data);
                        return;
                      }

                      const run = data.run;
                      const cups = (run?.couponCodes || []).join(", ") || "—";
                      const apts = (run?.appointmentIds || []).join(", ") || "—";
                      notifySuccess(
                        run?.ok ? "Simulação PASS (sem Asaas)." : "Simulação concluída com avisos.",
                        [
                          `Run: ${run?.runId || "—"}`,
                          `Payment: ${run?.providerPaymentId || "—"}`,
                          `Appointments: ${apts}`,
                          `Cupons: ${cups}`,
                          "Detalhes em Admin → Homologação.",
                        ].join("\n")
                      );
                      window.location.href = "/admin/homologacao";
                    } catch (e) {
                      console.error(e);
                      notifyError("Erro inesperado na simulação gratuita.");
                    }
                  }}
                  className="w-full rounded-full bg-yellow-600 px-6 py-3 text-sm font-semibold text-white hover:bg-yellow-500 transition-all"
                  style={{ textShadow: "0 2px 4px rgba(0, 0, 0, 0.5)" }}
                >
                  Simulação Gratuita (sem cobrança)
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* =========================================================
          DÚVIDAS / SUPORTE
      ========================================================== */}
      <DuvidasBox />
      </div>
    </main>
  );
}

export default function AgendamentoPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center text-zinc-400 bg-zinc-950">
          <LoadingBlock label="Carregando..." />
        </main>
      }
    >
      <AgendamentoContent />
    </Suspense>
  );
}
