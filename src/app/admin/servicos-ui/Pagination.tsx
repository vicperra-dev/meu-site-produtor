"use client";

/**
 * GO-03A — Paginação client-side com estado na URL (?page=N).
 */
import { Icons } from "./meta";

export function Pagination({
  page,
  totalPages,
  onPage,
}: {
  page: number;
  totalPages: number;
  onPage: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  const pages: number[] = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, start + 4);
  for (let p = Math.max(1, end - 4); p <= end; p++) pages.push(p);

  return (
    <div className="flex items-center justify-center gap-1.5 pt-2">
      <button
        type="button"
        onClick={() => onPage(page - 1)}
        disabled={page <= 1}
        className="rounded-lg border border-zinc-700 p-1.5 text-zinc-400 transition-colors hover:border-zinc-500 hover:text-zinc-100 disabled:opacity-40"
        aria-label="Página anterior"
      >
        <Icons.chevronLeft className="w-4 h-4" />
      </button>
      {pages[0] > 1 && <span className="px-1 text-xs text-zinc-600">…</span>}
      {pages.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onPage(p)}
          className={`min-w-[2rem] rounded-lg border px-2 py-1.5 text-xs font-medium tabular-nums transition-colors ${
            p === page
              ? "border-red-500/60 bg-red-500/15 text-red-300"
              : "border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-100"
          }`}
        >
          {p}
        </button>
      ))}
      {pages[pages.length - 1] < totalPages && <span className="px-1 text-xs text-zinc-600">…</span>}
      <button
        type="button"
        onClick={() => onPage(page + 1)}
        disabled={page >= totalPages}
        className="rounded-lg border border-zinc-700 p-1.5 text-zinc-400 transition-colors hover:border-zinc-500 hover:text-zinc-100 disabled:opacity-40"
        aria-label="Próxima página"
      >
        <Icons.chevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
