"use client";

/**
 * GO-03B — Breadcrumb contextual (PARTE 10).
 * Ex.: Dashboard > Agendamentos > Pendentes > Sessão de Gravação
 */
import Link from "next/link";
import { Icons } from "@/app/admin/servicos-ui/meta";

export interface Crumb {
  label: string;
  href?: string;
}

export function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Navegação estrutural" className="flex flex-wrap items-center gap-1 text-xs text-zinc-500">
      {items.map((item, i) => {
        const last = i === items.length - 1;
        return (
          <span key={`${item.label}-${i}`} className="flex items-center gap-1">
            {i > 0 && <Icons.chevronRight className="w-3 h-3 text-zinc-600" />}
            {item.href && !last ? (
              <Link href={item.href} className="transition-colors hover:text-zinc-200">
                {item.label}
              </Link>
            ) : (
              <span className={last ? "font-medium text-zinc-300" : undefined}>{item.label}</span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
