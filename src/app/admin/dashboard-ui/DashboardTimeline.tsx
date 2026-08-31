"use client";

/**
 * GO-03C — Timeline de atividade recente + calendário operacional.
 */
import Link from "next/link";
import { appointmentReservesCalendar } from "@/app/lib/domain/statuses";
import { Icons, formatDateTime, serviceTypeLabel } from "@/app/admin/servicos-ui/meta";
import { StatusBadge } from "@/app/admin/servicos-ui/Badges";
import type { DashAppointment, DashCoupon, DashPayment, DashService } from "./types";
import { formatCurrency } from "./aggregates";

export interface TimelineItem {
  id: string;
  at: string;
  title: string;
  subtitle: string;
  status?: string;
  href: string;
  kind: string;
}

export function buildTimeline(input: {
  payments: DashPayment[];
  appointments: DashAppointment[];
  services: DashService[];
  coupons: DashCoupon[];
}): TimelineItem[] {
  const items: TimelineItem[] = [];

  for (const p of input.payments) {
    items.push({
      id: `pay-${p.id}`,
      at: p.createdAt,
      title: "Pagamento",
      subtitle: `${p.user?.nomeArtistico || "Cliente"} · ${formatCurrency(Number(p.amount) || 0)} · ${p.status}`,
      status: p.status,
      href: "/admin/pagamentos",
      kind: "payment",
    });
    if (p.refundProcessedAt) {
      items.push({
        id: `ref-${p.id}`,
        at: p.refundProcessedAt,
        title: "Reembolso processado",
        subtitle: `${p.user?.nomeArtistico || "Cliente"} · ${formatCurrency(Number(p.refundAmount || p.amount) || 0)}`,
        href: "/admin/pagamentos",
        kind: "refund",
      });
    }
  }

  for (const a of input.appointments.slice(0, 40)) {
    items.push({
      id: `apt-${a.id}`,
      at: a.createdAt,
      title: a.status === "cancelado" ? "Cancelamento" : "Agendamento",
      subtitle: `${a.user?.nomeArtistico || "Cliente"} · ${serviceTypeLabel(a.tipo)} · #${a.id}`,
      status: a.status,
      href: `/admin/agendamentos/todos?highlight=${a.id}`,
      kind: a.status === "cancelado" ? "cancel" : "appointment",
    });
  }

  for (const s of input.services) {
    if (s.status === "concluido") {
      items.push({
        id: `svc-done-${s.id}`,
        at: s.updatedAt || s.createdAt,
        title: "Serviço concluído",
        subtitle: `${s.user.nomeArtistico} · ${serviceTypeLabel(s.tipo)}`,
        status: s.status,
        href: "/admin/servicos/concluidos",
        kind: "service",
      });
    }
    if (s.deliveryAudioUrl) {
      items.push({
        id: `upl-${s.id}`,
        at: s.updatedAt || s.createdAt,
        title: "Upload de entrega",
        subtitle: `${s.user.nomeArtistico} · ${serviceTypeLabel(s.tipo)}`,
        href: "/admin/servicos/em-andamento",
        kind: "upload",
      });
    }
  }

  for (const c of input.coupons.slice(0, 30)) {
    items.push({
      id: `cup-${c.id}`,
      at: c.createdAt,
      title: "Cupom emitido",
      subtitle: `${c.code} · ${c.user?.nomeArtistico || "—"}`,
      href: "/admin/planos",
      kind: "coupon",
    });
  }

  return items
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 18);
}

export function DashboardTimeline({ items }: { items: TimelineItem[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-700 bg-zinc-900/40 px-4 py-10 text-center text-xs text-zinc-500">
        Nenhuma atividade recente.
      </div>
    );
  }
  return (
    <ol className="space-y-0 overflow-hidden rounded-xl border border-zinc-700/80 bg-zinc-900/60">
      {items.map((item, i) => (
        <li key={item.id} className={i > 0 ? "border-t border-zinc-800" : ""}>
          <Link
            href={item.href}
            className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-zinc-800/50"
          >
            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-red-400" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium text-zinc-100">{item.title}</p>
                {item.status && <StatusBadge status={item.status} />}
              </div>
              <p className="mt-0.5 truncate text-xs text-zinc-400">{item.subtitle}</p>
              <p className="mt-0.5 text-[11px] text-zinc-600">{formatDateTime(item.at)}</p>
            </div>
            <Icons.chevronRight className="mt-1 w-4 h-4 shrink-0 text-zinc-600" />
          </Link>
        </li>
      ))}
    </ol>
  );
}

function dayLabel(d: Date): string {
  return d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" });
}

export function DashboardCalendar({ appointments }: { appointments: DashAppointment[] }) {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  const tomorrowEnd = new Date(tomorrowStart);
  tomorrowEnd.setHours(23, 59, 59, 999);
  const weekEnd = new Date(todayStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  weekEnd.setHours(23, 59, 59, 999);

  const active = appointments.filter(
    (a) => a.user?.nomeArtistico && appointmentReservesCalendar(a.status)
  );

  const today = active.filter((a) => {
    const t = new Date(a.data).getTime();
    return t >= todayStart.getTime() && t < tomorrowStart.getTime();
  });
  const tomorrow = active.filter((a) => {
    const t = new Date(a.data).getTime();
    return t >= tomorrowStart.getTime() && t <= tomorrowEnd.getTime();
  });
  const week = active.filter((a) => {
    const t = new Date(a.data).getTime();
    return t >= todayStart.getTime() && t <= weekEnd.getTime();
  });

  if (active.length === 0 || (today.length === 0 && tomorrow.length === 0 && week.length === 0)) {
    return (
      <div className="flex min-h-[140px] flex-col items-center justify-center gap-1 rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-8 text-center">
        <p className="text-sm font-medium text-zinc-300">Nenhum agendamento operacional.</p>
        <p className="text-xs text-zinc-500">
          Assim que existirem sessões agendadas elas aparecerão aqui.
        </p>
      </div>
    );
  }

  const columns = [
    { title: "Hoje", date: dayLabel(todayStart), items: today, href: "/admin/agendamentos/todos" },
    { title: "Amanhã", date: dayLabel(tomorrowStart), items: tomorrow, href: "/admin/agendamentos/todos" },
    { title: "Esta semana", date: `${today.length + tomorrow.length}→${week.length} itens`, items: week.slice(0, 8), href: "/admin/agendamentos/todos" },
  ];

  return (
    <div className="grid gap-3 md:grid-cols-3">
      {columns.map((col) => (
        <div key={col.title} className="rounded-xl border border-zinc-700/80 bg-zinc-900/60 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">{col.title}</p>
              <p className="text-[11px] text-zinc-600">{col.date}</p>
            </div>
            <Link href={col.href} className="text-[11px] text-red-400 hover:underline">
              Abrir
            </Link>
          </div>
          {col.items.length === 0 ? (
            <p className="text-xs text-zinc-500">Nenhum agendamento.</p>
          ) : (
            <ul className="space-y-2">
              {col.items.map((a) => (
                <li key={a.id}>
                  <Link
                    href={`/admin/agendamentos/todos?highlight=${a.id}`}
                    className="block rounded-lg border border-zinc-800 bg-zinc-800/40 px-2.5 py-2 transition-colors hover:border-zinc-600"
                  >
                    <p className="truncate text-xs font-medium text-zinc-200">{a.user?.nomeArtistico}</p>
                    <p className="truncate text-[11px] text-zinc-500">
                      {serviceTypeLabel(a.tipo)} ·{" "}
                      {new Date(a.data).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                    <div className="mt-1">
                      <StatusBadge status={a.status} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}
