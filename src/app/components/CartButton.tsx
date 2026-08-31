"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Botão Carrinho em posição fixa (igual produção): todas as páginas exceto conta, minha-conta, admin e manutenção.
 */
export default function CartButton() {
  const pathname = usePathname();
  if (pathname === "/conta" || pathname?.startsWith("/minha-conta") || pathname?.startsWith("/admin") || pathname === "/manutencao") {
    return null;
  }
  return (
    <Link
      href="/carrinho"
      className="fixed right-4 z-40 rounded-full bg-red-600 px-3 py-2 text-xs font-semibold text-white shadow-lg hover:bg-red-500 transition-colors flex items-center gap-1.5"
      style={{ top: "calc(var(--header-h, 60px) + 0.5rem)" }}
      aria-label="Ir para o carrinho"
    >
      <span aria-hidden>🛒</span>
      <span>Carrinho</span>
    </Link>
  );
}
