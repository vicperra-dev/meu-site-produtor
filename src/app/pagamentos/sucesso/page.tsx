"use client";

/**
 * Pagamento aprovado — GO-03E/F Design System.
 * GO-04A.2 RC-09: timeout, retry controlado, botão Atualizar status, orientação ao usuário.
 * Domínio / DomainSync inalterados — apenas UX resiliente.
 */

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, Suspense } from "react";
import { useDomainSync } from "@/app/lib/synchronization/DomainSyncProvider";
import {
  Button,
  Callout,
  Card,
  LinkButton,
  LoadingBlock,
  StatusPage,
  Spinner,
} from "@/components/design-system";

const POLL_INTERVAL_MS = 5000;
const TIMEOUT_MS = 90_000;
const MAX_AUTO_RETRIES = 18;

function SucessoContent() {
  const searchParams = useSearchParams();
  const isTeste = searchParams.get("teste") === "true";
  const tipo = searchParams.get("tipo");
  const operationId = searchParams.get("operationId");
  const { connected, lastEvent } = useDomainSync();
  const [confirmado, setConfirmado] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [checking, setChecking] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [statusHint, setStatusHint] = useState(
    "O pagamento foi iniciado. Estamos verificando automaticamente a confirmação."
  );
  const startedAt = useRef(Date.now());
  const autoRetries = useRef(0);

  const markConfirmed = useCallback(() => {
    setConfirmado(true);
    setTimedOut(false);
  }, []);

  const pollStatus = useCallback(async () => {
    if (!operationId || confirmado) return false;
    setChecking(true);
    try {
      const res = await fetch(
        `/api/pagamentos/verificar?operationId=${encodeURIComponent(operationId)}`
      );
      if (!res.ok) {
        setStatusHint(
          "Ainda não conseguimos confirmar. Continuamos verificando automaticamente."
        );
        return false;
      }
      const data = await res.json();
      if (data.processed && data.effectsReady) {
        markConfirmed();
        return true;
      }
      if (data.processed) {
        setStatusHint(
          "Pagamento ainda está sendo confirmado. Estamos verificando automaticamente."
        );
      } else {
        setStatusHint(
          "Pagamento ainda está sendo confirmado. Estamos verificando automaticamente."
        );
      }
      return false;
    } catch {
      setStatusHint(
        "Não foi possível atualizar agora. Tente novamente em instantes com \"Atualizar status\"."
      );
      return false;
    } finally {
      setChecking(false);
    }
  }, [operationId, confirmado, markConfirmed]);

  useEffect(() => {
    if (
      lastEvent?.name !== "PaymentConfirmed" ||
      lastEvent.metadata?.effectsReady !== true ||
      !operationId ||
      lastEvent.metadata?.operationId !== operationId
    ) {
      return;
    }
    markConfirmed();
  }, [lastEvent, operationId, markConfirmed]);

  useEffect(() => {
    if (confirmado || !operationId) return;

    const tick = async () => {
      const elapsed = Date.now() - startedAt.current;
      if (elapsed >= TIMEOUT_MS || autoRetries.current >= MAX_AUTO_RETRIES) {
        setTimedOut(true);
        setStatusHint(
          'A confirmação está demorando mais que o usual. Use "Atualizar status" ou acesse Minha Conta — o pagamento pode já ter sido processado.'
        );
        return;
      }
      autoRetries.current += 1;
      setRetryCount(autoRetries.current);
      await pollStatus();
    };

    void tick();
    const interval = setInterval(() => {
      void tick();
    }, POLL_INTERVAL_MS);

    const timeout = setTimeout(() => {
      setTimedOut(true);
      setStatusHint(
        'Caso demore mais que alguns minutos, utilize "Atualizar status". Você também pode acompanhar em Minha Conta.'
      );
    }, TIMEOUT_MS);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [confirmado, operationId, pollStatus]);

  useEffect(() => {
    if (!confirmado) return;
    const redirect = setTimeout(() => {
      window.location.href = "/minha-conta";
    }, 1200);
    return () => clearTimeout(redirect);
  }, [confirmado]);

  if (!confirmado) {
    return (
      <StatusPage
        intent={timedOut ? "warning" : "info"}
        icon={timedOut ? "clock" : "refresh"}
        title={timedOut ? "Confirmação em andamento" : "Aguardando confirmação"}
        description={statusHint}
        actions={
          <>
            <Button
              variant="primary"
              size="md"
              loading={checking}
              onClick={() => {
                void pollStatus();
              }}
            >
              Atualizar status
            </Button>
            <LinkButton href="/minha-conta" variant="outline" size="md">
              Ir para Minha Conta
            </LinkButton>
          </>
        }
      >
        <div className="flex flex-col items-center gap-3">
          {!timedOut && <Spinner className="w-6 h-6" />}
          <p className="text-xs text-zinc-500 text-center">
            Sincronização {connected ? "conectada" : "reconectando…"}
            {operationId ? ` · verificação automática (${retryCount})` : ""}
          </p>
          <Callout intent="info" title="O que fazer">
            Pagamento ainda está sendo confirmado. Estamos verificando automaticamente. Caso
            demore mais que alguns minutos, utilize &quot;Atualizar status&quot;.
          </Callout>
        </div>
      </StatusPage>
    );
  }

  const body =
    tipo === "plano" ? (
      <>
        <p className="text-sm font-semibold text-emerald-300 mb-1">
          Plano ativado com sucesso
        </p>
        <p className="text-sm text-zinc-400 leading-relaxed">
          Seu pagamento foi concluído. O plano foi ativado e os cupons de serviços já estão
          disponíveis na sua conta.
          {!isTeste && " Você receberá um email de confirmação em breve."}
        </p>
      </>
    ) : (
      <>
        <p className="text-sm font-semibold text-emerald-300 mb-1">
          Obrigado por agendar com a THouse Rec
        </p>
        <p className="text-sm text-zinc-400 leading-relaxed">
          Seu pagamento foi concluído com sucesso. Aguarde a confirmação do agendamento pelo seu
          email.
        </p>
      </>
    );

  return (
    <StatusPage
      intent="success"
      icon="check-circle"
      title="Pagamento aprovado"
      actions={
        <>
          <LinkButton href="/" variant="primary" size="md">
            Voltar ao início
          </LinkButton>
          <LinkButton href="/minha-conta" variant="outline" size="md">
            Ver Minha Conta
          </LinkButton>
        </>
      }
    >
      {isTeste && (
        <Callout intent="warning" title="Pagamento de teste">
          Este foi um pagamento de teste (R$ 5,00).
        </Callout>
      )}
      <Card className="!border-emerald-500/30 !bg-emerald-500/5">{body}</Card>
      {!operationId && (
        <Callout intent="info" title="Dica">
          Se você não foi redirecionado automaticamente após o pagamento, não se preocupe. O
          pagamento foi processado e você receberá um email de confirmação em breve.
        </Callout>
      )}
      <p className="text-center text-xs text-zinc-500">
        Redirecionando para{" "}
        <Link href="/minha-conta" className="text-red-400 hover:underline">
          Minha Conta
        </Link>
        …
      </p>
    </StatusPage>
  );
}

export default function Sucesso() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[50vh] flex items-center justify-center">
          <LoadingBlock label="Carregando…" />
        </div>
      }
    >
      <SucessoContent />
    </Suspense>
  );
}
