"use client";

/**
 * Admin shell — GO-03E: Design System + navegação consistente.
 * Sem alteração de regras de acesso (role ADMIN).
 */

import Link from "next/link";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import {
  Breadcrumb,
  Button,
  Icon,
  LoadingBlock,
  cx,
} from "@/components/design-system";

const MENU = [
  { label: "Usuários", href: "/admin/usuarios" },
  { label: "Agendamentos", href: "/admin/agendamentos" },
  { label: "Controle", href: "/admin/controle-agendamento" },
  { label: "Planos e Cupons", href: "/admin/planos" },
  { label: "FAQ", href: "/admin/faq" },
  { label: "Serviços Selecionados", href: "/admin/servicos-selecionados" },
  { label: "Serviços Gerais", href: "/admin/servicos" },
  { label: "Pagamentos", href: "/admin/pagamentos" },
  { label: "Estatísticas", href: "/admin/estatisticas" },
  { label: "Engenharia", href: "/admin/engenharia" },
  { label: "Homologação", href: "/admin/homologacao" },
  { label: "Integridade", href: "/admin/integridade" },
  { label: "Chats Pendentes", href: "/admin/chats-pendentes" },
  { label: "Chats Gerais", href: "/admin/chats-gerais" },
  { label: "Pausa Virtual", href: "/admin/manutencao" },
];

function crumbFor(pathname: string): Array<{ label: string; href?: string }> {
  const items: Array<{ label: string; href?: string }> = [
    { label: "Admin", href: "/admin" },
  ];
  if (pathname === "/admin") {
    items.push({ label: "Dashboard" });
    return items;
  }
  const match = MENU.find(
    (m) => pathname === m.href || pathname.startsWith(`${m.href}/`)
  );
  if (match) {
    items.push({
      label: match.label,
      href: pathname === match.href ? undefined : match.href,
    });
    if (pathname !== match.href) {
      const tail = pathname.replace(match.href, "").replace(/^\//, "");
      if (tail) {
        items.push({
          label: tail
            .split("/")
            .map((p) => p.replace(/-/g, " "))
            .join(" / "),
        });
      }
    }
  } else {
    items.push({ label: pathname.replace("/admin/", "") || "Página" });
  }
  return items;
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && (!user || user.role !== "ADMIN")) {
      router.replace("/");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div data-admin-shell className="flex min-h-screen items-center justify-center bg-zinc-950">
        <LoadingBlock label="Verificando permissões…" />
      </div>
    );
  }

  if (!user || user.role !== "ADMIN") return null;

  const crumbs = crumbFor(pathname);

  return (
    <div data-admin-shell className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-3 sm:px-6 py-3 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-sm sm:text-base font-bold text-red-500 whitespace-nowrap">
                THouse Rec — Admin
              </span>
              <Breadcrumb items={crumbs} className="hidden md:flex" />
            </div>
            <Button variant="ghost" size="xs" onClick={() => router.push("/")}>
              ← Voltar ao site
            </Button>
          </div>

          <div className="flex justify-center">
            <Link
              href="/admin"
              className={cx(
                "inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition-all",
                pathname === "/admin"
                  ? "bg-red-600 text-white border-red-500 shadow-lg shadow-red-900/30"
                  : "bg-zinc-900 border-zinc-700 text-zinc-200 hover:border-red-500/60 hover:text-red-300"
              )}
            >
              <Icon name="home" className="w-4 h-4" />
              Dashboard
            </Link>
          </div>

          <nav
            className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-1.5"
            aria-label="Menu administrativo"
          >
            {MENU.map((item) => {
              const ativo =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cx(
                    "rounded-lg px-2.5 py-2 text-[11px] sm:text-xs font-medium transition text-center leading-snug border",
                    ativo
                      ? "bg-red-600 text-white border-red-500 shadow-md shadow-red-900/20"
                      : "text-zinc-400 border-zinc-800 hover:text-zinc-100 hover:bg-zinc-900 hover:border-zinc-700"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-3 sm:px-6 py-4 sm:py-6 animate-[fadeIn_.2s_ease]">
        <div className="md:hidden mb-3">
          <Breadcrumb items={crumbs} />
        </div>
        {children}
      </main>
    </div>
  );
}
