import { NextResponse } from "next/server";
import { requireAuth } from "@/app/lib/auth";
import { canUseSymbolicSimulation } from "@/app/lib/symbolic-payment";
import { runLabAction, type LabAction } from "@/app/lib/homologation/lab-actions";
import { SERVICE_ORDER_PHASES } from "@/app/lib/service-orders/phases";
import { goLiveBlockIfNeeded } from "@/app/lib/go-live-maintenance";

/**
 * POST /api/admin/homologation/lab
 * Modo Livre — ações admin-only sobre artefatos de Homologação.
 */
export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    if (!canUseSymbolicSimulation(user) || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }
    const blocked = goLiveBlockIfNeeded(user.role);
    if (blocked) return blocked;

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "") as LabAction["action"];
    if (!action) {
      return NextResponse.json({ error: "action obrigatória." }, { status: 400 });
    }

    let input: LabAction;
    switch (action) {
      case "approve_appointment":
      case "reject_appointment":
      case "start_appointment":
      case "advance_order_from_appointment":
        input = {
          action,
          appointmentId: Number(body.appointmentId),
          ...(action === "reject_appointment" ? { reason: body.reason } : {}),
        } as LabAction;
        break;
      case "set_appointment_datetime":
        input = {
          action,
          appointmentId: Number(body.appointmentId),
          data: String(body.data || ""),
          hora: body.hora ? String(body.hora) : undefined,
          duracaoMinutos: body.duracaoMinutos ? Number(body.duracaoMinutos) : undefined,
        };
        break;
      case "confirm_payment":
      case "cancel_payment":
        input = {
          action,
          providerPaymentId: String(body.providerPaymentId || ""),
        };
        break;
      case "set_order_phase":
        input = {
          action,
          serviceOrderId: String(body.serviceOrderId || ""),
          phase: body.phase,
        };
        break;
      case "start_service":
      case "simulate_delivery":
        input = {
          action,
          serviceId: String(body.serviceId || ""),
        };
        break;
      default:
        return NextResponse.json({ error: `Ação desconhecida: ${action}` }, { status: 400 });
    }

    const result = await runLabAction(input, user.id);
    return NextResponse.json({
      ...result,
      phases: SERVICE_ORDER_PHASES,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === "Não autenticado" || msg === "Acesso negado") {
      return NextResponse.json({ error: msg }, { status: 401 });
    }
    console.error("[homologation/lab]", err);
    return NextResponse.json({ error: msg || "Erro no Modo Livre." }, { status: 500 });
  }
}

export async function GET() {
  try {
    const user = await requireAuth();
    if (!canUseSymbolicSimulation(user) || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }
    return NextResponse.json({
      phases: SERVICE_ORDER_PHASES,
      actions: [
        "approve_appointment",
        "reject_appointment",
        "start_appointment",
        "set_appointment_datetime",
        "confirm_payment",
        "cancel_payment",
        "set_order_phase",
        "start_service",
        "simulate_delivery",
        "advance_order_from_appointment",
      ],
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 401 });
  }
}
