"use client";

/**
 * GO-03A — Barra superior de navegação por status (PARTE 2 / PARTE 9).
 * Cada aba mostra contagem + badge colorido + ícone e navega para a página do status.
 */
import Link from "next/link";
import { Icons, STATUS_META, type StatusKey } from "./meta";

export function StatusTabs({
  basePath,
  active,
  counts,
}: {
  basePath: string;
  active: StatusKey;
  counts: Record<StatusKey, number>;
}) {
  return (
    <nav
      className="flex gap-1 overflow-x-auto rounded-xl border border-zinc-700 bg-zinc-900/60 p-1.5"
      aria-label="Filtrar por status"
    >
      {STATUS_META.map((m) => {
        const Icon = Icons[m.icon];
        const isActive = m.key === active;
        const href = m.key === "todos" ? `${basePath}/todos` : `${basePath}/${m.slug}`;
        return (
          <Link
            key={m.key}
            href={href}
            className={`flex shrink-0 items-center gap-2 rounded-lg border-b-2 px-3 py-2 text-xs font-medium transition-colors ${
              isActive
                ? `bg-zinc-800 ${m.activeTab}`
                : "border-transparent text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span className="whitespace-nowrap">{m.label}</span>
            <span
              className={`inline-flex min-w-[1.4rem] items-center justify-center rounded-full border px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${m.chip} ${m.text}`}
            >
              {counts[m.key] ?? 0}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
