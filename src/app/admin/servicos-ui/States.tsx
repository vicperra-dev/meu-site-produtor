"use client";

/**
 * GO-03A/F — Skeleton / spinner / empty (adapters sobre Design System).
 */
import {
  Spinner as DsSpinner,
  EmptyState as DsEmptyState,
  Skeleton,
} from "@/components/design-system";
import { statusMetaFor, type StatusKey } from "./meta";

export function BoardSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Carregando serviços">
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-32 w-full" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-800/40 p-4">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-5 w-24 rounded-full" />
            </div>
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function Spinner({ className = "w-4 h-4" }: { className?: string }) {
  return <DsSpinner className={className} />;
}

export function EmptyState({
  status,
  filtered,
  noun = "serviço",
  hint = "Quando um cliente concluir um pagamento ou resgatar um cupom, o serviço aparece aqui automaticamente.",
}: {
  status: StatusKey;
  filtered: boolean;
  noun?: string;
  hint?: string;
}) {
  const meta = statusMetaFor(status === "todos" ? "" : status);
  const label = status === "todos" ? "" : ` ${meta.label.toLowerCase()}`;
  const title = filtered
    ? `Nenhum ${noun} encontrado com esses filtros`
    : `Nenhum ${noun}${label} por aqui`;
  const description = filtered
    ? "Ajuste a pesquisa ou limpe os filtros para ver mais resultados."
    : hint;

  return <DsEmptyState icon="box" title={title} description={description} />;
}
