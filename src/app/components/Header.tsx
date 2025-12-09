"use client";

import Link from "next/link";
import { useAuth } from "../context/AuthContext";

// 👉 MESMO email usado para liberar acesso ao painel Admin
const ADMIN_EMAIL = "vicperra@gmail.com";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/agendamento", label: "Agendamento" },
  { href: "/planos", label: "Planos" },
  { href: "/faq", label: "FAQ" },
  { href: "/chat", label: "Chat" },
  { href: "/termos-contratos", label: "Termos & Contratos" },
  { href: "/shopping", label: "Shopping" },
  { href: "/contato", label: "Contato" },
];

export default function Header() {
  const { user, logout } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;

  return (
    <header className="sticky top-0 z-20 border-b border-red-700/40 bg-black/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        
        {/* LOGO */}
        <Link href="/" className="flex items-baseline gap-1 font-semibold tracking-tight">
          <span className="text-3xl text-red-500 leading-none">T</span>
          <span className="text-xl text-zinc-100">House Rec</span>
        </Link>

        {/* MENU DESKTOP */}
        <nav className="hidden md:flex items-center gap-6 text-sm">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-zinc-200 transition hover:text-red-400"
            >
              {link.label}
            </Link>
          ))}

          {isAdmin && (
            <Link
              href="/admin"
              className="rounded-full border border-red-600 px-3 py-1 text-xs font-semibold text-red-300 hover:bg-red-600 hover:text-white transition"
            >
              Admin
            </Link>
          )}
        </nav>

        {/* LOGIN / CONTA */}
        <div className="flex items-center gap-3 text-xs">
          {user ? (
            <>
              <span className="hidden md:inline text-zinc-300">
                Olá, <span className="font-semibold">{user.nome}</span>
              </span>

              <Link
                href="/conta"
                className="rounded-full border border-zinc-600 px-3 py-1 hover:bg-zinc-800"
              >
                Conta
              </Link>

              <button
                onClick={logout}
                className="rounded-full bg-zinc-800 px-3 py-1 font-semibold text-zinc-200 hover:bg-zinc-700"
              >
                Sair
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-full border border-zinc-600 px-3 py-1 hover:bg-zinc-800"
              >
                Entrar
              </Link>

              <Link
                href="/registro"
                className="rounded-full bg-red-600 px-3 py-1 font-semibold text-white hover:bg-red-500"
              >
                Registrar
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
