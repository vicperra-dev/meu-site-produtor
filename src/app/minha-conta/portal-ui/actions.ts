/**
 * Portal do Cliente (GO-03D) — ações do cliente.
 * Cada função chama exatamente o mesmo endpoint, método e payload que a
 * página Minha Conta original usava. Nenhuma API nova, nenhum contrato novo.
 */

type ActionResult = { ok: boolean; data: any };

async function post(url: string, body?: unknown): Promise<ActionResult> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

export function cancelarPlano(userPlanId: string): Promise<ActionResult> {
  return post("/api/assinatura/cancel", {
    userPlanId,
    confirm: true,
    requestRefund: false,
  });
}

export function cancelarAssinaturaComReembolso(userPlanId: string): Promise<ActionResult> {
  return post("/api/assinatura/cancel", {
    userPlanId,
    confirm: true,
    requestRefund: true,
  });
}

export async function previewCancelamentoAssinatura(userPlanId: string): Promise<ActionResult> {
  const res = await fetch(
    `/api/assinatura/cancel-preview?userPlanId=${encodeURIComponent(userPlanId)}`,
    { cache: "no-store" }
  );
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

export function solicitarReembolsoPlano(userPlanId: string): Promise<ActionResult> {
  return post("/api/planos/solicitar-reembolso", { userPlanId });
}

export async function excluirPlano(userPlanId: string): Promise<ActionResult> {
  const res = await fetch(
    `/api/planos/excluir?userPlanId=${encodeURIComponent(userPlanId)}`,
    { method: "DELETE" }
  );
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

export function renunciarCupom(couponId: string): Promise<ActionResult> {
  return post("/api/cupons/renunciar", { couponId });
}

export function escolherReembolso(
  appointmentId: number,
  opcao: "reembolso" | "cupom"
): Promise<ActionResult> {
  return post("/api/agendamentos/escolher-reembolso", { appointmentId, opcao });
}

export function cancelarAgendamento(
  appointmentId: number,
  refundType: "direct" | "coupon"
): Promise<ActionResult> {
  return post("/api/agendamentos/cancelar", { appointmentId, refundType });
}
