"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Header from "./Header";

function isAdminShellPath(pathname: string | null): boolean {
  return Boolean(pathname?.startsWith("/admin") || pathname === "/manutencao");
}

/**
 * Header do site é `position: fixed` e o body reserva `--header-h` via padding-top.
 * Em /admin e /manutencao o Header não é montado — o padding sobra e revela o
 * fundo texturizado (#606060) no topo. A classe `admin-shell` remove essa reserva
 * e unifica o background com o shell administrativo.
 */
export default function ConditionalHeader() {
  const pathname = usePathname();
  const adminShell = isAdminShellPath(pathname);

  useEffect(() => {
    document.body.classList.toggle("admin-shell", adminShell);
    document.documentElement.classList.toggle("admin-shell", adminShell);
    return () => {
      document.body.classList.remove("admin-shell");
      document.documentElement.classList.remove("admin-shell");
    };
  }, [adminShell]);

  if (adminShell) return null;

  return <Header />;
}
