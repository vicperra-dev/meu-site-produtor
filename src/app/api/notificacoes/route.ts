/**
 * GO-H12 — Listar / marcar notificações da conta.
 */
import { NextResponse } from "next/server";
import { requireAuth } from "@/app/lib/auth";
import {
  countUnreadNotifications,
  listAccountNotifications,
  markNotificationsRead,
} from "@/app/lib/account-notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireAuth();
    const [notifications, unreadCount] = await Promise.all([
      listAccountNotifications(user.id, 80),
      countUnreadNotifications(user.id),
    ]);
    return NextResponse.json(
      { notifications, unreadCount },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro";
    if (message === "Não autenticado") {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    return NextResponse.json({ error: "Erro ao listar notificações" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await requireAuth();
    const body = (await req.json().catch(() => ({}))) as {
      ids?: string[];
      all?: boolean;
      id?: string;
    };
    const ids = [
      ...(Array.isArray(body.ids) ? body.ids : []),
      ...(body.id ? [body.id] : []),
    ].filter(Boolean);
    const updated = await markNotificationsRead({
      userId: user.id,
      ids,
      all: Boolean(body.all),
    });
    const unreadCount = await countUnreadNotifications(user.id);
    return NextResponse.json({ ok: true, updated, unreadCount });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro";
    if (message === "Não autenticado") {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    return NextResponse.json({ error: "Erro ao atualizar notificações" }, { status: 500 });
  }
}
