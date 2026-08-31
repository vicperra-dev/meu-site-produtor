import { NextResponse } from "next/server";

/** Mensagem oficial do modo preparação Go Live (GO-01). */
export const GO_LIVE_MAINTENANCE_MESSAGE =
  "Estamos realizando os preparativos finais para o lançamento. Voltaremos em instantes.";

/**
 * Ativar em Vercel Production/Preview: GO_LIVE_MAINTENANCE_MODE=1
 * Não altera layout — bloqueia apenas cadastro, compra e agendamento para não-admin.
 */
export function isGoLiveMaintenanceMode(): boolean {
  const v = (process.env.GO_LIVE_MAINTENANCE_MODE || "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

const BLOCKED_PAGE_PREFIXES = [
  "/registro",
  "/agendamento",
  "/carrinho",
  "/planos",
  "/shopping",
  "/pagamentos",
];

export function isGoLiveBlockedPage(pathname: string): boolean {
  return BLOCKED_PAGE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** Bloqueia API de cadastro/compra/agendamento para usuários comuns. Admin continua. */
export function goLiveBlockIfNeeded(userRole?: string | null): NextResponse | null {
  if (!isGoLiveMaintenanceMode()) return null;
  if (userRole === "ADMIN") return null;
  return NextResponse.json(
    { error: GO_LIVE_MAINTENANCE_MESSAGE, code: "GO_LIVE_MAINTENANCE" },
    { status: 503 }
  );
}
