"use client";

/**
 * GO-H10C — Minha Assinatura (entidade Subscription).
 */
import { useCallback, useEffect, useState } from "react";
import {
  Badge,
  Button,
  Callout,
  Card,
  EmptyState,
  Icon,
  LoadingBlock,
  Section,
  formatBRL,
  formatDate,
  useFeedback,
} from "@/components/design-system";
import {
  cancelarAssinaturaComReembolso,
  cancelarPlano,
  excluirPlano,
  previewCancelamentoAssinatura,
  solicitarReembolsoPlano,
} from "./actions";
import type { Cupom, Plano } from "./types";
import { isPlanFamilyCoupon } from "./helpers";

type AssinaturaItem = {
  id: string;
  status: string;
  statusLabel: string;
  paymentMethod: string;
  nextBillingDate: string;
  lastBillingDate: string | null;
  cyclesRemaining: number | null;
  userPlan: {
    id: string;
    planId: string;
    planName: string;
    modo: string;
    amount: number;
    status: string;
    startDate: string;
    endDate: string | null;
    refundProcessedAt: string | null;
    refundAmount: number | null;
  };
  benefitsThisMonth: Array<{
    id: string;
    code: string;
    serviceType: string | null;
    used: boolean;
  }>;
  cancelPreview: {
    amountPaid: number;
    used: Array<{ label: string; internalValue: number }>;
    unused: Array<{ label: string; internalValue: number }>;
    usedInternalTotal: number;
    refundAmount: number;
    refundAvailable: boolean;
    message: string;
  } | null;
};

export function PlanSection({
  planos,
  cupons,
  onChanged,
}: {
  planos: Plano[];
  cupons: Cupom[];
  onChanged: () => Promise<void> | void;
}) {
  const { notifySuccess, notifyError, ask } = useFeedback();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [subscriptions, setSubscriptions] = useState<AssinaturaItem[]>([]);
  const [loadingSub, setLoadingSub] = useState(true);

  const loadSubscriptions = useCallback(async () => {
    setLoadingSub(true);
    try {
      const res = await fetch("/api/assinatura", { cache: "no-store" });
      const data = await res.json();
      setSubscriptions(Array.isArray(data.subscriptions) ? data.subscriptions : []);
    } catch {
      setSubscriptions([]);
    } finally {
      setLoadingSub(false);
    }
  }, []);

  useEffect(() => {
    void loadSubscriptions();
  }, [loadSubscriptions, planos]);

  async function handleCancelar(userPlanId: string, withRefund: boolean) {
    const previewRes = await previewCancelamentoAssinatura(userPlanId);
    const preview = previewRes.data?.preview;
    if (!previewRes.ok || !preview) {
      notifyError("Não foi possível montar o resumo do cancelamento");
      return;
    }

    const usedList =
      preview.used?.map((u: { label: string }) => u.label).join(", ") || "nenhum";
    const unusedList =
      preview.unused?.map((u: { label: string }) => u.label).join(", ") || "nenhum";
    const msg = [
      `Plano: ${preview.planName} (${preview.modo})`,
      `Valor pago: ${formatBRL(preview.amountPaid)}`,
      `Benefícios utilizados: ${usedList}`,
      `Benefícios não utilizados: ${unusedList}`,
      `Valor estimado do reembolso: ${formatBRL(preview.refundAmount)}`,
      "",
      preview.message,
      withRefund && preview.refundAvailable
        ? "Confirmar cancelamento COM solicitação de estorno no Asaas?"
        : "Confirmar cancelamento SEM reembolso automático?",
    ].join("\n");

    if (!(await ask("Cancelar assinatura", msg))) return;

    setBusyId(userPlanId);
    try {
      const { ok, data } = withRefund
        ? await cancelarAssinaturaComReembolso(userPlanId)
        : await cancelarPlano(userPlanId);
      if (ok) {
        notifySuccess(
          "Assinatura cancelada",
          data.refund?.requested
            ? `Estorno solicitado: ${formatBRL(data.refund.amount)}`
            : data.message || "Cancelamento concluído."
        );
        await onChanged();
        await loadSubscriptions();
      } else {
        notifyError("Erro ao cancelar", data.error || undefined);
      }
    } catch {
      notifyError("Erro ao cancelar assinatura");
    } finally {
      setBusyId(null);
    }
  }

  async function handleReembolso(plano: Plano) {
    if (
      !(await ask(
        "Solicitar reembolso",
        "O reembolso usa valores internos dos benefícios utilizados (não os preços públicos). Continuar?"
      ))
    )
      return;
    setBusyId(plano.id);
    try {
      const { ok, data } = await solicitarReembolsoPlano(plano.id);
      if (ok) {
        notifySuccess(
          "Reembolso solicitado",
          `Valor: ${formatBRL(data.refundAmount ?? 0)}`
        );
        await onChanged();
        await loadSubscriptions();
      } else {
        notifyError("Erro ao solicitar reembolso", data.error || undefined);
      }
    } catch {
      notifyError("Erro ao solicitar reembolso");
    } finally {
      setBusyId(null);
    }
  }

  async function handleExcluir(plano: Plano) {
    if (
      !(await ask(
        "Excluir plano",
        "Excluir este plano inativo da sua lista?",
        true
      ))
    )
      return;
    setBusyId(plano.id);
    try {
      const { ok, data } = await excluirPlano(plano.id);
      if (ok) {
        await onChanged();
        await loadSubscriptions();
      } else {
        notifyError("Erro ao excluir", data.error || undefined);
      }
    } catch {
      notifyError("Erro ao excluir plano");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Section title="Minha Assinatura" icon="box">
      {loadingSub ? (
        <LoadingBlock label="Carregando assinatura…" />
      ) : subscriptions.length === 0 && planos.length === 0 ? (
        <EmptyState
          icon="box"
          title="Você não possui assinatura"
          description="Assine um plano na página Planos."
          action={
            <a
              href="/planos"
              className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 hover:bg-red-500 px-4 py-2 text-sm font-semibold text-white"
            >
              <Icon name="sparkles" className="w-4 h-4" />
              Conhecer os planos
            </a>
          }
        />
      ) : (
        <div className="space-y-4">
          {subscriptions.map((s) => {
            const ativo = s.status === "active";
            return (
              <Card
                key={s.id}
                className={ativo ? "!border-emerald-500/40 !bg-emerald-500/5" : undefined}
              >
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-bold text-zinc-100">
                      {s.userPlan.planName}
                    </h3>
                    <Badge intent={ativo ? "success" : "warning"} dot>
                      {s.statusLabel}
                    </Badge>
                  </div>
                  <p className="text-sm text-zinc-400">
                    {s.userPlan.modo === "mensal" ? "Mensal" : "Anual"} ·{" "}
                    {formatBRL(s.userPlan.amount)} · Pagamento: {s.paymentMethod}
                  </p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
                    <span>Início: {formatDate(s.userPlan.startDate)}</span>
                    {s.userPlan.endDate && (
                      <span>Vigência até: {formatDate(s.userPlan.endDate)}</span>
                    )}
                    <span>Próxima cobrança: {formatDate(s.nextBillingDate)}</span>
                    {s.cyclesRemaining != null && (
                      <span>Ciclos restantes: {s.cyclesRemaining}</span>
                    )}
                  </div>
                  <div className="text-xs text-zinc-400">
                    Benefícios do mês:{" "}
                    <strong className="text-emerald-300">
                      {s.benefitsThisMonth.length}
                    </strong>{" "}
                    disponíveis
                    {s.benefitsThisMonth.length > 0 && (
                      <span className="ml-1">
                        (
                        {s.benefitsThisMonth
                          .map((b) => b.serviceType || "cupom")
                          .join(", ")}
                        )
                      </span>
                    )}
                  </div>
                  {ativo && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button
                        variant="danger"
                        disabled={busyId === s.userPlan.id}
                        onClick={() => void handleCancelar(s.userPlan.id, true)}
                      >
                        Cancelar assinatura
                      </Button>
                      <Button
                        variant="outline"
                        disabled={busyId === s.userPlan.id}
                        onClick={() => void handleCancelar(s.userPlan.id, false)}
                      >
                        Cancelar sem reembolso
                      </Button>
                    </div>
                  )}
                  {!ativo && !s.userPlan.refundProcessedAt && (
                    <Button
                      variant="secondary"
                      icon="wallet"
                      disabled={busyId === s.userPlan.id}
                      onClick={() =>
                        void handleReembolso({
                          id: s.userPlan.id,
                          planId: s.userPlan.planId,
                          planName: s.userPlan.planName,
                          modo: s.userPlan.modo,
                          amount: s.userPlan.amount,
                          status: s.userPlan.status,
                          startDate: s.userPlan.startDate,
                          endDate: s.userPlan.endDate,
                          ativo: false,
                          expiraEm: s.userPlan.endDate,
                        })
                      }
                    >
                      Solicitar reembolso
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}

          {/* Planos legados sem Subscription */}
          {planos
            .filter((p) => !subscriptions.some((s) => s.userPlan.id === p.id))
            .map((plano) => {
              const cuponsDoPlano = cupons.filter(
                (c) => c.userPlanId === plano.id && isPlanFamilyCoupon(c)
              );
              return (
                <Card key={plano.id}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
                    <div>
                      <h3 className="font-bold text-zinc-100">{plano.planName}</h3>
                      <p className="text-sm text-zinc-400">
                        {plano.modo} · {formatBRL(plano.amount)} (legado)
                      </p>
                      <p className="text-xs text-zinc-500">
                        Cupons: {cuponsDoPlano.filter((c) => c.status === "disponivel").length}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {plano.ativo ? (
                        <Button
                          variant="danger"
                          disabled={busyId === plano.id}
                          onClick={() => void handleCancelar(plano.id, true)}
                        >
                          Cancelar
                        </Button>
                      ) : (
                        <>
                          {!plano.refundProcessedAt && (
                            <Button
                              variant="secondary"
                              disabled={busyId === plano.id}
                              onClick={() => void handleReembolso(plano)}
                            >
                              Reembolso
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            disabled={busyId === plano.id}
                            onClick={() => void handleExcluir(plano)}
                          >
                            Excluir
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}

          <Callout intent="info" title="Como funciona o reembolso">
            O estorno desconta apenas os benefícios efetivamente utilizados, com base nos
            valores internos do plano — não nos preços públicos do site. O pedido é feito
            diretamente no Asaas.
          </Callout>
        </div>
      )}
    </Section>
  );
}
