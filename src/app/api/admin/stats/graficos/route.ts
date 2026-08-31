import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/auth";

type Periodo = "diario" | "semanal" | "mensal" | "anual";

function getDateRange(periodo: Periodo, mes?: string, data?: string, ano?: string) {
  const now = new Date();
  let inicio: Date;
  let fim: Date = new Date(now);

  if (periodo === "diario") {
    const d = data ? new Date(data + "T00:00:00") : now;
    inicio = new Date(d);
    inicio.setHours(0, 0, 0, 0);
    fim = new Date(d);
    fim.setHours(23, 59, 59, 999);
  } else if (periodo === "semanal") {
    fim = new Date(now);
    fim.setHours(23, 59, 59, 999);
    inicio = new Date(fim);
    inicio.setDate(inicio.getDate() - 6);
    inicio.setHours(0, 0, 0, 0);
  } else if (periodo === "mensal") {
    if (mes) {
      const [y, m] = mes.split("-").map(Number);
      inicio = new Date(y, m - 1, 1);
      fim = new Date(y, m, 0, 23, 59, 59, 999);
    } else {
      inicio = new Date(now.getFullYear(), now.getMonth(), 1);
      fim = new Date(now);
    }
  } else {
    // anual
    const y = ano ? parseInt(ano, 10) : now.getFullYear();
    inicio = new Date(y, 0, 1);
    fim = new Date(y, 11, 31, 23, 59, 59, 999);
  }
  return { inicio, fim };
}

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
  } catch (err: unknown) {
    const e = err as { message?: string };
    if (e.message === "Acesso negado" || e.message === "Não autenticado") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }
    throw err;
  }

  const { searchParams } = new URL(req.url);
  const secao = searchParams.get("secao");
  const periodo = (searchParams.get("periodo") || "mensal") as Periodo;
  const mes = searchParams.get("mes") || undefined;
  const data = searchParams.get("data") || undefined;
  const ano = searchParams.get("ano") || undefined;
  const filtro = searchParams.get("filtro") || "todos"; // para pagamentos: todos | agendamento | plano:bronze etc

  if (!secao) {
    return NextResponse.json({ error: "secao obrigatória" }, { status: 400 });
  }

  const { inicio, fim } = getDateRange(periodo, mes, data, ano);

  try {
    if (secao === "usuarios") {
      const users = await prisma.user.findMany({
        where: { createdAt: { gte: inicio, lte: fim } },
        select: { createdAt: true },
      });
      const buckets: { label: string; valor: number }[] = [];
      if (periodo === "diario") {
        for (let h = 0; h < 24; h++) {
          const hInicio = new Date(inicio);
          hInicio.setHours(h, 0, 0, 0);
          const hFim = new Date(inicio);
          hFim.setHours(h, 59, 59, 999);
          const count = users.filter(
            (u) => u.createdAt >= hInicio && u.createdAt <= hFim
          ).length;
          buckets.push({ label: `${h.toString().padStart(2, "0")}:00`, valor: count });
        }
      } else if (periodo === "semanal") {
        for (let d = 0; d < 7; d++) {
          const dayStart = new Date(inicio);
          dayStart.setDate(inicio.getDate() + d);
          dayStart.setHours(0, 0, 0, 0);
          const dayEnd = new Date(dayStart);
          dayEnd.setHours(23, 59, 59, 999);
          const count = users.filter(
            (u) => u.createdAt >= dayStart && u.createdAt <= dayEnd
          ).length;
          const label = dayStart.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" });
          buckets.push({ label, valor: count });
        }
      } else if (periodo === "mensal") {
        const daysInMonth = Math.ceil((fim.getTime() - inicio.getTime()) / (24 * 60 * 60 * 1000)) + 1;
        for (let d = 0; d < daysInMonth; d++) {
          const dayStart = new Date(inicio);
          dayStart.setDate(inicio.getDate() + d);
          if (dayStart > fim) break;
          dayStart.setHours(0, 0, 0, 0);
          const dayEnd = new Date(dayStart);
          dayEnd.setHours(23, 59, 59, 999);
          const count = users.filter(
            (u) => u.createdAt >= dayStart && u.createdAt <= dayEnd
          ).length;
          buckets.push({
            label: dayStart.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
            valor: count,
          });
        }
      } else {
        for (let m = 0; m < 12; m++) {
          const monthStart = new Date(inicio.getFullYear(), m, 1);
          const monthEnd = new Date(inicio.getFullYear(), m + 1, 0, 23, 59, 59, 999);
          if (monthStart < inicio || monthEnd > fim) continue;
          const count = users.filter(
            (u) => u.createdAt >= monthStart && u.createdAt <= monthEnd
          ).length;
          buckets.push({
            label: monthStart.toLocaleDateString("pt-BR", { month: "short" }),
            valor: count,
          });
        }
      }
      return NextResponse.json({ buckets, periodo, inicio: inicio.toISOString(), fim: fim.toISOString() });
    }

    if (secao === "pagamentos") {
      const where: { createdAt: { gte: Date; lte: Date }; status: string; type?: string; planId?: string } = {
        createdAt: { gte: inicio, lte: fim },
        status: "approved",
      };
      if (filtro !== "todos") {
        if (filtro === "agendamento") {
          where.type = "agendamento";
        } else if (filtro.startsWith("plano:")) {
          where.type = "plano";
          where.planId = filtro.slice(6);
        }
      }
      const payments = await prisma.payment.findMany({
        where,
        select: { createdAt: true, amount: true },
      });
      const buckets: { label: string; valor: number; valorTotal: number }[] = [];
      const daysInRange = Math.ceil((fim.getTime() - inicio.getTime()) / (24 * 60 * 60 * 1000)) + 1;
      for (let d = 0; d < daysInRange; d++) {
        const dayStart = new Date(inicio);
        dayStart.setDate(inicio.getDate() + d);
        if (dayStart > fim) break;
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dayStart);
        dayEnd.setHours(23, 59, 59, 999);
        const dayPayments = payments.filter(
          (p) => p.createdAt >= dayStart && p.createdAt <= dayEnd
        );
        buckets.push({
          label: dayStart.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
          valor: dayPayments.length,
          valorTotal: dayPayments.reduce((s, p) => s + p.amount, 0),
        });
      }
      return NextResponse.json({ buckets, periodo, inicio: inicio.toISOString(), fim: fim.toISOString() });
    }

    if (secao === "planos") {
      const [assinados, comFimNoPeriodo, canceladosNoPeriodo] = await Promise.all([
        prisma.userPlan.findMany({
          where: { createdAt: { gte: inicio, lte: fim } },
          select: { createdAt: true },
        }),
        prisma.userPlan.findMany({
          where: { endDate: { gte: inicio, lte: fim } },
          select: { endDate: true },
        }),
        prisma.userPlan.findMany({
          where: { status: "cancelled", updatedAt: { gte: inicio, lte: fim } },
          select: { updatedAt: true },
        }),
      ]);
      const daysInRange = Math.ceil((fim.getTime() - inicio.getTime()) / (24 * 60 * 60 * 1000)) + 1;
      const buckets: { label: string; assinados: number; cancelados: number }[] = [];
      for (let d = 0; d < daysInRange; d++) {
        const dayStart = new Date(inicio);
        dayStart.setDate(inicio.getDate() + d);
        if (dayStart > fim) break;
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dayStart);
        dayEnd.setHours(23, 59, 59, 999);
        const a = assinados.filter((p) => p.createdAt >= dayStart && p.createdAt <= dayEnd).length;
        const c1 = comFimNoPeriodo.filter((p) => p.endDate && p.endDate >= dayStart && p.endDate <= dayEnd).length;
        const c2 = canceladosNoPeriodo.filter((p) => p.updatedAt >= dayStart && p.updatedAt <= dayEnd).length;
        buckets.push({
          label: dayStart.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
          assinados: a,
          cancelados: c1 + c2,
        });
      }
      return NextResponse.json({ buckets, periodo, inicio: inicio.toISOString(), fim: fim.toISOString() });
    }

    if (secao === "agendamentos") {
      const appointments = await prisma.appointment.findMany({
        where: { data: { gte: inicio, lte: fim }, cancelledAt: null },
        select: { data: true },
      });
      const buckets: { label: string; valor: number }[] = [];
      if (periodo === "diario") {
        for (let h = 0; h < 24; h++) {
          const hInicio = new Date(inicio);
          hInicio.setHours(h, 0, 0, 0);
          const hFim = new Date(inicio);
          hFim.setHours(h, 59, 59, 999);
          const count = appointments.filter(
            (a) => a.data >= hInicio && a.data <= hFim
          ).length;
          buckets.push({ label: `${h.toString().padStart(2, "0")}:00`, valor: count });
        }
      } else {
        const daysInRange = periodo === "semanal" ? 7 : Math.ceil((fim.getTime() - inicio.getTime()) / (24 * 60 * 60 * 1000)) + 1;
        for (let d = 0; d < daysInRange; d++) {
          const dayStart = new Date(inicio);
          dayStart.setDate(inicio.getDate() + d);
          if (dayStart > fim) break;
          dayStart.setHours(0, 0, 0, 0);
          const dayEnd = new Date(dayStart);
          dayEnd.setHours(23, 59, 59, 999);
          const count = appointments.filter(
            (a) => a.data >= dayStart && a.data <= dayEnd
          ).length;
          buckets.push({
            label: dayStart.toLocaleDateString("pt-BR", periodo === "semanal" ? { weekday: "short", day: "2-digit", month: "2-digit" } : { day: "2-digit", month: "2-digit" }),
            valor: count,
          });
        }
      }
      return NextResponse.json({ buckets, periodo, inicio: inicio.toISOString(), fim: fim.toISOString() });
    }

    if (secao === "agendamentos-servicos") {
      // HS-02B: tipos operacionais a partir de Service.tipo (não Appointment.tipo)
      const services = await prisma.service.findMany({
        where: { createdAt: { gte: inicio, lte: fim } },
        select: { createdAt: true, tipo: true },
      });
      const allLabels: string[] = [];
      const byTipo = new Map<string, Map<string, number>>();

      const ensureTipo = (tipo: string) => {
        if (!byTipo.has(tipo)) byTipo.set(tipo, new Map());
      };
      const addPoint = (tipo: string, label: string, inc: number) => {
        ensureTipo(tipo);
        const m = byTipo.get(tipo)!;
        m.set(label, (m.get(label) ?? 0) + inc);
      };

      if (periodo === "diario") {
        for (let h = 0; h < 24; h++) {
          const label = `${h.toString().padStart(2, "0")}:00`;
          allLabels.push(label);
          const hInicio = new Date(inicio);
          hInicio.setHours(h, 0, 0, 0);
          const hFim = new Date(inicio);
          hFim.setHours(h, 59, 59, 999);
          services.forEach((s) => {
            if (s.createdAt >= hInicio && s.createdAt <= hFim) addPoint(s.tipo || "sessao", label, 1);
          });
        }
      } else {
        const daysInRange = periodo === "semanal" ? 7 : Math.ceil((fim.getTime() - inicio.getTime()) / (24 * 60 * 60 * 1000)) + 1;
        for (let d = 0; d < daysInRange; d++) {
          const dayStart = new Date(inicio);
          dayStart.setDate(inicio.getDate() + d);
          if (dayStart > fim) break;
          const label = dayStart.toLocaleDateString("pt-BR", periodo === "semanal" ? { weekday: "short", day: "2-digit", month: "2-digit" } : { day: "2-digit", month: "2-digit" });
          allLabels.push(label);
          dayStart.setHours(0, 0, 0, 0);
          const dayEnd = new Date(dayStart);
          dayEnd.setHours(23, 59, 59, 999);
          services.forEach((s) => {
            if (s.createdAt >= dayStart && s.createdAt <= dayEnd) addPoint(s.tipo || "sessao", label, 1);
          });
        }
      }

      const tipos = Array.from(new Set(services.map((s) => s.tipo || "sessao")));
      if (tipos.length === 0) tipos.push("(nenhum)");
      const series = tipos.map((tipo) => {
        ensureTipo(tipo);
        const pontos = allLabels.map((label) => ({
          label,
          valor: byTipo.get(tipo)?.get(label) ?? 0,
        }));
        return { tipo, pontos };
      });
      return NextResponse.json({ series, periodo, inicio: inicio.toISOString(), fim: fim.toISOString() });
    }

    if (secao === "servicos") {
      const services = await prisma.service.findMany({
        where: { createdAt: { gte: inicio, lte: fim } },
        select: { createdAt: true, status: true },
      });
      const allLabels: string[] = [];
      const bucketCounts = new Map<
        string,
        {
          pendentes: number;
          aceitos: number;
          emAndamento: number;
          concluidos: number;
          cancelados: number;
          recusados: number;
        }
      >();

      const getLabel = (d: Date, p: Periodo) => {
        if (p === "diario") return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
        if (p === "semanal") return d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" });
        return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      };
      const ensureBucket = (label: string) => {
        if (!bucketCounts.has(label)) {
          allLabels.push(label);
          bucketCounts.set(label, {
            pendentes: 0,
            aceitos: 0,
            emAndamento: 0,
            concluidos: 0,
            cancelados: 0,
            recusados: 0,
          });
        }
        return bucketCounts.get(label)!;
      };

      if (periodo === "diario") {
        for (let h = 0; h < 24; h++) {
          const label = `${String(h).padStart(2, "0")}:00`;
          ensureBucket(label);
        }
        services.forEach((s) => {
          const hour = s.createdAt.getHours();
          const label = `${String(hour).padStart(2, "0")}:00`;
          const b = bucketCounts.get(label);
          if (b) {
            if (s.status === "pendente") b.pendentes++;
            else if (s.status === "aceito") b.aceitos++;
            else if (s.status === "em_andamento") b.emAndamento++;
            else if (s.status === "concluido") b.concluidos++;
            else if (s.status === "cancelado") b.cancelados++;
            else if (s.status === "recusado") b.recusados++;
          }
        });
      } else {
        const daysInRange = periodo === "semanal" ? 7 : Math.ceil((fim.getTime() - inicio.getTime()) / (24 * 60 * 60 * 1000)) + 1;
        for (let d = 0; d < daysInRange; d++) {
          const dayStart = new Date(inicio);
          dayStart.setDate(inicio.getDate() + d);
          if (dayStart > fim) break;
          dayStart.setHours(0, 0, 0, 0);
          const dayEnd = new Date(dayStart);
          dayEnd.setHours(23, 59, 59, 999);
          const label = getLabel(dayStart, periodo);
          ensureBucket(label);
          services.forEach((s) => {
            if (s.createdAt >= dayStart && s.createdAt <= dayEnd) {
              const b = bucketCounts.get(label)!;
              if (s.status === "pendente") b.pendentes++;
              else if (s.status === "aceito") b.aceitos++;
              else if (s.status === "em_andamento") b.emAndamento++;
              else if (s.status === "concluido") b.concluidos++;
              else if (s.status === "cancelado") b.cancelados++;
              else if (s.status === "recusado") b.recusados++;
            }
          });
        }
      }

      const buckets = allLabels.map((label) => {
        const b = bucketCounts.get(label)!;
        return {
          label,
          solicitados:
            b.pendentes + b.aceitos + b.emAndamento + b.concluidos + b.cancelados + b.recusados,
          pendentes: b.pendentes,
          aceitos: b.aceitos,
          emAndamento: b.emAndamento,
          concluidos: b.concluidos,
          cancelados: b.cancelados,
          recusados: b.recusados,
        };
      });
      return NextResponse.json({ buckets, periodo, inicio: inicio.toISOString(), fim: fim.toISOString() });
    }

    if (secao === "servicos-tipos") {
      const services = await prisma.service.findMany({
        where: { createdAt: { gte: inicio, lte: fim } },
        select: { tipo: true, status: true, createdAt: true },
      });
      const byTipo = new Map<
        string,
        { total: number; pendentes: number; aceitos: number; concluidos: number; cancelados: number; recusados: number; datas: Date[] }
      >();
      services.forEach((s) => {
        if (!byTipo.has(s.tipo)) {
          byTipo.set(s.tipo, { total: 0, pendentes: 0, aceitos: 0, concluidos: 0, cancelados: 0, recusados: 0, datas: [] });
        }
        const row = byTipo.get(s.tipo)!;
        row.total++;
        row.datas.push(s.createdAt);
        if (s.status === "pendente") row.pendentes++;
        else if (s.status === "aceito") row.aceitos++;
        else if (s.status === "concluido") row.concluidos++;
        else if (s.status === "cancelado") row.cancelados++;
        else if (s.status === "recusado") row.recusados++;
      });
      const tipos = Array.from(byTipo.entries()).map(([tipo, row]) => ({
        tipo,
        total: row.total,
        pendentes: row.pendentes,
        aceitos: row.aceitos,
        concluidos: row.concluidos,
        cancelados: row.cancelados,
        recusados: row.recusados,
        primeiraData: row.datas.length ? new Date(Math.min(...row.datas.map((d) => d.getTime()))).toISOString() : null,
        ultimaData: row.datas.length ? new Date(Math.max(...row.datas.map((d) => d.getTime()))).toISOString() : null,
      }));
      tipos.sort((a, b) => b.total - a.total);
      return NextResponse.json({ tipos, inicio: inicio.toISOString(), fim: fim.toISOString() });
    }

    if (secao === "filtros-pagamentos") {
      const plans = await prisma.userPlan.findMany({ select: { planId: true, planName: true }, distinct: ["planId"] });
      const opts = [
        { id: "todos", label: "Todos" },
        { id: "agendamento", label: "Agendamentos" },
        ...plans.map((p) => ({ id: `plano:${p.planId}`, label: p.planName })),
      ];
      const seen = new Set<string>();
      const unique = opts.filter((o) => {
        if (seen.has(o.id)) return false;
        seen.add(o.id);
        return true;
      });
      return NextResponse.json({ filtros: unique });
    }

    return NextResponse.json({ error: "secao inválida" }, { status: 400 });
  } catch (e) {
    console.error("[Admin Stats Graficos]", e);
    return NextResponse.json({ error: "Erro ao gerar dados do gráfico" }, { status: 500 });
  }
}
