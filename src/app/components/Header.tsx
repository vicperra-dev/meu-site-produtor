"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "../context/AuthContext";
import { useUnreadChatCount } from "../hooks/useUnreadChatCount";
import { useUnreadFaqCount } from "../hooks/useUnreadFaqCount";
import { useUnreadAppointmentCount } from "../hooks/useUnreadAppointmentCount";
import { useUnreadPlanCount } from "../hooks/useUnreadPlanCount";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/agendamento", label: "Agendamento" },
  { href: "/planos", label: "Planos" },
  { href: "/faq", label: "FAQ" },
  { href: "/chat", label: "Chat" },
  { href: "/termos-contratos", label: "Termos" },
  { href: "/shopping", label: "Shopping" },
  { href: "/contato", label: "Contato" },
];

export default function Header() {
  const { user, logout, loading } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const unreadChatCount = useUnreadChatCount();
  const unreadFaqCount = useUnreadFaqCount();
  const unreadAppointmentCount = useUnreadAppointmentCount();
  const unreadPlanCount = useUnreadPlanCount();
  
  // Somar todas as notificações de "Minha Conta" (FAQ + Agendamentos + Planos)
  const totalMinhaContaNotifications = unreadFaqCount + unreadAppointmentCount + unreadPlanCount;

  // Debug: log do unreadChatCount
  useEffect(() => {
    if (unreadChatCount > 0) {
      console.log(`[Header] 🔔 Badge deve aparecer com ${unreadChatCount} mensagens`);
    } else {
      console.log(`[Header] ⚪ Sem mensagens não lidas (unreadChatCount = ${unreadChatCount})`);
    }
  }, [unreadChatCount]);

  if (loading) {
    return (
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-red-700/40 bg-zinc-950/95 backdrop-blur-md shadow-lg" style={{ height: "var(--header-h, 60px)" }}>
        <div className="mx-auto h-full max-w-6xl px-4 sm:px-6" />
      </header>
    );
  }

  const isAdmin = user?.role === "ADMIN";
  // Formato: primeiro nome + inicial do segundo com ponto (ex: Victor P.)
  const parts = user?.nomeArtistico?.trim().split(/\s+/).filter(Boolean) ?? [];
  const displayName = parts.length >= 2
    ? `${parts[0]} ${parts[1][0].toUpperCase()}.`
    : (parts[0] || user?.nomeArtistico || "Usuário");

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-red-700/40 bg-zinc-950/95 backdrop-blur-md shadow-lg" style={{ height: "var(--header-h, 60px)" }}>
      {/* Desktop: logo esq | links centro | user na extrema direita (coluna auto) - compacto */}
        <div className="hidden lg:grid lg:grid-cols-[auto_1fr_auto] lg:gap-4 xl:gap-5 mx-auto max-w-7xl w-full h-full items-center px-4 sm:px-6 py-2">
          {/* Zona 1: T House Rec na extrema esquerda */}
          <div className="flex justify-start min-w-0">
            <Link href="/" className="flex items-center gap-1.5 font-semibold flex-shrink-0">
              <div className="flex items-baseline gap-0.5">
                <span className="text-xl lg:text-2xl text-red-500" style={{ fontWeight: 900, letterSpacing: "-0.05em" }}>T</span>
                <span className="text-base lg:text-lg text-zinc-100">House Rec</span>
              </div>
            </Link>
          </div>

          {/* Zona 2: Links das páginas no meio */}
          <nav className="flex justify-center gap-2 xl:gap-4 text-xs lg:text-sm items-center flex-shrink-0">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-zinc-200 hover:text-red-400 transition-colors whitespace-nowrap flex items-center gap-2"
              >
                <span>{link.label}</span>
                {link.href === "/chat" && unreadChatCount > 0 && (
                  <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full bg-red-600 text-white text-[10px] font-bold leading-none">
                    {unreadChatCount > 99 ? "99+" : unreadChatCount}
                  </span>
                )}
              </Link>
            ))}
          </nav>

          {/* Zona 3: Admin + Olá + Minha Conta + Sair - compacto */}
          <div className="flex justify-end items-center gap-2 text-xs flex-nowrap flex-shrink-0 ml-auto">
          {isAdmin && (
            <Link
              href="/admin"
              className="rounded-full border-2 border-red-600 bg-red-600/10 px-3 py-1.5 font-bold text-red-400 hover:bg-red-600 hover:text-white transition-all whitespace-nowrap text-xs"
            >
              🔐 Admin
            </Link>
          )}
          {user ? (
            <>
              <span className="text-zinc-300 text-xs whitespace-nowrap" title={user.nomeArtistico}>
                Olá, <b>{displayName}</b>
              </span>

              <Link
                href="/minha-conta"
                className="rounded-full border border-zinc-600 px-2.5 py-1 hover:bg-zinc-800 transition-colors whitespace-nowrap text-xs flex items-center gap-1.5 flex-shrink-0"
              >
                <span>Minha Conta</span>
                {totalMinhaContaNotifications > 0 && (
                  <span className="flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full bg-red-600 text-white text-[9px] font-bold leading-none">
                    {totalMinhaContaNotifications > 99 ? "99+" : totalMinhaContaNotifications}
                  </span>
                )}
              </Link>

              <button
                onClick={logout}
                className="rounded-full bg-zinc-800 px-2.5 py-1 hover:bg-zinc-700 transition-colors whitespace-nowrap text-xs flex-shrink-0"
              >
                Sair
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-full border border-zinc-600 px-2.5 py-1 hover:bg-zinc-800 transition-colors whitespace-nowrap text-xs flex-shrink-0"
              >
                Entrar
              </Link>

              <Link
                href="/registro"
                className="rounded-full bg-red-600 px-2.5 py-1 text-white hover:bg-red-500 transition-colors whitespace-nowrap text-xs flex-shrink-0"
              >
                Registrar
              </Link>
            </>
          )}
          </div>
        </div>

        {/* Mobile: barra compacta, logo + hamburger */}
        <div className="flex lg:hidden items-center justify-between mx-auto max-w-7xl w-full h-full px-4 sm:px-6 py-2">
          <Link href="/" className="flex items-center gap-1.5 font-semibold flex-shrink-0">
            <div className="flex items-baseline gap-0.5">
              <span className="text-xl text-red-500" style={{ fontWeight: 900, letterSpacing: "-0.05em" }}>T</span>
              <span className="text-base text-zinc-100">House Rec</span>
            </div>
          </Link>
          <div className="flex items-center gap-2">
          {isAdmin && (
            <Link
              href="/admin"
              className="rounded-full border-2 border-red-600 bg-red-600/10 px-2 py-1.5 text-xs font-bold text-red-400"
            >
              Admin
            </Link>
          )}
          
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 text-zinc-200 hover:text-red-400 transition-colors"
            aria-label="Menu"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {menuOpen ? (
                <path d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Menu Mobile (lg: mantém em landscape) */}
      {menuOpen && (
        <div className="lg:hidden border-t border-red-700/40 bg-zinc-950/95 backdrop-blur">
          <nav className="px-4 py-4 space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="flex items-center justify-between py-2 px-3 text-zinc-200 hover:text-red-400 hover:bg-zinc-900/50 rounded-lg transition-colors"
              >
                <span>{link.label}</span>
                {link.href === "/chat" && unreadChatCount > 0 && (
                  <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full bg-red-600 text-white text-[10px] font-bold leading-none ml-2">
                    {unreadChatCount > 99 ? "99+" : unreadChatCount}
                  </span>
                )}
              </Link>
            ))}
            
            <div className="pt-4 border-t border-zinc-800 mt-4 space-y-2">
              {user ? (
                <>
                  <div className="px-3 py-2 text-zinc-300 text-sm break-words min-w-0" title={user.nomeArtistico}>
                    Olá, <b>{displayName}</b>
                  </div>
                  <Link
                    href="/minha-conta"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center justify-between py-2 px-3 text-zinc-200 hover:text-red-400 hover:bg-zinc-900/50 rounded-lg transition-colors"
                  >
                    <span>Minha Conta</span>
                    {totalMinhaContaNotifications > 0 && (
                      <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full bg-red-600 text-white text-[10px] font-bold leading-none ml-2">
                        {totalMinhaContaNotifications > 99 ? "99+" : totalMinhaContaNotifications}
                      </span>
                    )}
                  </Link>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      logout();
                    }}
                    className="w-full text-left py-2 px-3 text-zinc-200 hover:text-red-400 hover:bg-zinc-900/50 rounded-lg transition-colors"
                  >
                    Sair
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setMenuOpen(false)}
                    className="block py-2 px-3 text-zinc-200 hover:text-red-400 hover:bg-zinc-900/50 rounded-lg transition-colors"
                  >
                    Entrar
                  </Link>
                  <Link
                    href="/registro"
                    onClick={() => setMenuOpen(false)}
                    className="block py-2 px-3 bg-red-600 text-white hover:bg-red-500 rounded-lg transition-colors text-center"
                  >
                    Registrar
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
