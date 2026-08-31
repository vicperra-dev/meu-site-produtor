import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/auth";
import { pagePathLabel, deleteAllPageViews } from "@/app/lib/analytics-pageview";
import { toIsoDateStudio } from "@/app/lib/calendar-time";
import {
  lastNStudioDays,
  studioRangeForIsoDay,
  studioTodayIso,
} from "@/app/lib/analytics-stats";

function emptyVisitacao() {
  return {
    hoje: {
      visualizacoes: 0,
      visitantesUnicos: 0,
      sessoes: 0,
      pageviewsLogados: 0,
      pageviewsAnonimos: 0,
    },
    ultimos7Dias: { visualizacoes: 0, visitantesUnicos: 0, sessoes: 0 },
    ultimos30Dias: { visualizacoes: 0, visitantesUnicos: 0, sessoes: 0 },
    porDia: [] as Array<{
      data: string;
      visualizacoes: number;
      logados: number;
      anonimos: number;
    }>,
    porPagina: [] as Array<{
      path: string;
      label: string;
      visualizacoes: number;
    }>,
    logadosVsAnonimos: { logados: 0, anonimos: 0 },
  };
}

export async function GET() {
  try {
    await requireAdmin();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "";
    if (message === "Acesso negado" || message === "Não autenticado") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }
    throw err;
  }

  const payload = emptyVisitacao();

  try {
    const days30 = lastNStudioDays(30);
    const from = studioRangeForIsoDay(days30[0]).gte;
    const todayIso = studioTodayIso();
    const todayRange = studioRangeForIsoDay(todayIso);
    const from7 = studioRangeForIsoDay(days30[days30.length - 7]).gte;

    const [todayRows, weekRows, monthRows] = await Promise.all([
      prisma.pageView.findMany({
        where: { createdAt: { gte: todayRange.gte, lt: todayRange.lt } },
        select: { visitorId: true, visitSessionId: true, userId: true },
      }),
      prisma.pageView.findMany({
        where: { createdAt: { gte: from7 } },
        select: { visitorId: true, visitSessionId: true },
      }),
      prisma.pageView.findMany({
        where: { createdAt: { gte: from } },
        select: {
          visitorId: true,
          visitSessionId: true,
          userId: true,
          path: true,
          createdAt: true,
        },
      }),
    ]);

    payload.hoje.visualizacoes = todayRows.length;
    payload.hoje.visitantesUnicos = new Set(todayRows.map((r) => r.visitorId)).size;
    payload.hoje.sessoes = new Set(todayRows.map((r) => r.visitSessionId)).size;
    payload.hoje.pageviewsLogados = todayRows.filter((r) => r.userId).length;
    payload.hoje.pageviewsAnonimos = todayRows.length - payload.hoje.pageviewsLogados;

    payload.ultimos7Dias.visualizacoes = weekRows.length;
    payload.ultimos7Dias.visitantesUnicos = new Set(weekRows.map((r) => r.visitorId)).size;
    payload.ultimos7Dias.sessoes = new Set(weekRows.map((r) => r.visitSessionId)).size;

    payload.ultimos30Dias.visualizacoes = monthRows.length;
    payload.ultimos30Dias.visitantesUnicos = new Set(monthRows.map((r) => r.visitorId)).size;
    payload.ultimos30Dias.sessoes = new Set(monthRows.map((r) => r.visitSessionId)).size;

    const byDay = new Map<string, { visualizacoes: number; logados: number; anonimos: number }>();
    for (const iso of days30) {
      byDay.set(iso, { visualizacoes: 0, logados: 0, anonimos: 0 });
    }
    const byPath = new Map<string, number>();
    let logados = 0;
    let anonimos = 0;
    for (const row of monthRows) {
      const iso = toIsoDateStudio(row.createdAt);
      const bucket = byDay.get(iso);
      if (bucket) {
        bucket.visualizacoes += 1;
        if (row.userId) bucket.logados += 1;
        else bucket.anonimos += 1;
      }
      byPath.set(row.path, (byPath.get(row.path) || 0) + 1);
      if (row.userId) logados += 1;
      else anonimos += 1;
    }

    payload.porDia = days30.map((data) => ({
      data,
      ...(byDay.get(data) || { visualizacoes: 0, logados: 0, anonimos: 0 }),
    }));
    payload.porPagina = [...byPath.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 40)
      .map(([path, visualizacoes]) => ({
        path,
        label: pagePathLabel(path),
        visualizacoes,
      }));
    payload.logadosVsAnonimos = { logados, anonimos };
  } catch (e) {
    console.warn("[Admin Stats] Visitação:", e);
  }

  return NextResponse.json(payload);
}

export async function DELETE() {
  try {
    await requireAdmin();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "";
    if (message === "Acesso negado" || message === "Não autenticado") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }
    throw err;
  }

  const deleted = await deleteAllPageViews(prisma);
  return NextResponse.json({ deleted });
}
