"use client";

/**
 * Verificar pagamento — GO-03F: Design System (StatusPage + LinkButton/Button).
 * Lógica de verificação de pagamento (fetch /api/pagamentos/verificar) inalterada.
 */

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { StatusPage, Spinner, Button, LinkButton, Callout } from "@/components/design-system";

function VerificarPagamentoContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"verificando" | "sucesso" | "pendente" | "erro">("verificando");
  const [mensagem, setMensagem] = useState("Verificando status do pagamento...");
  const paymentId = searchParams.get("paymentId");
  const tipo = searchParams.get("tipo") || "agendamento";

  useEffect(() => {
    if (!paymentId) {
      setStatus("erro");
      setMensagem("ID do pagamento não encontrado.");
      return;
    }

    // Verificar status do pagamento
    verificarPagamento(paymentId);
  }, [paymentId]);

  async function verificarPagamento(id: string) {
    try {
      const res = await fetch(`/api/pagamentos/verificar?paymentId=${id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.status === "RECEIVED" || data.status === "CONFIRMED") {
          setStatus("sucesso");
          setMensagem("Pagamento confirmado com sucesso!");
          // Redirecionar após 2 segundos
          setTimeout(() => {
            router.push(`/pagamentos/sucesso?tipo=${tipo}`);
          }, 2000);
        } else if (data.status === "PENDING") {
          setStatus("pendente");
          setMensagem("Pagamento ainda está sendo processado. Aguarde alguns instantes.");
        } else {
          setStatus("erro");
          setMensagem("Pagamento não foi confirmado. Entre em contato com o suporte.");
        }
      } else {
        setStatus("erro");
        setMensagem("Erro ao verificar pagamento. Tente novamente.");
      }
    } catch (error) {
      console.error("Erro ao verificar pagamento:", error);
      setStatus("erro");
      setMensagem("Erro ao verificar pagamento. Você pode acessar manualmente a página de sucesso.");
    }
  }

  if (status === "verificando") {
    return (
      <StatusPage intent="info" icon="refresh" title="Verificando pagamento...">
        <p className="text-center text-zinc-300">{mensagem}</p>
      </StatusPage>
    );
  }

  if (status === "sucesso") {
    return (
      <StatusPage intent="success" icon="check-circle" title="Pagamento confirmado! 🎉">
        <p className="text-center text-zinc-300">{mensagem}</p>
        <p className="text-center text-zinc-400 text-sm">Redirecionando...</p>
      </StatusPage>
    );
  }

  if (status === "pendente") {
    return (
      <StatusPage
        intent="warning"
        icon="clock"
        title="Pagamento pendente"
        actions={
          <>
            <Button variant="secondary" onClick={() => verificarPagamento(paymentId!)}>
              Verificar novamente
            </Button>
            <LinkButton href="/conta" variant="outline">
              Ver minha conta
            </LinkButton>
          </>
        }
      >
        <p className="text-center text-zinc-300">{mensagem}</p>
      </StatusPage>
    );
  }

  return (
    <StatusPage
      intent="error"
      icon="x-circle"
      title="Erro ao verificar"
      actions={
        <>
          <Button variant="danger" onClick={() => verificarPagamento(paymentId!)}>
            Tentar novamente
          </Button>
          <LinkButton href="/conta" variant="outline">
            Ver minha conta
          </LinkButton>
        </>
      }
    >
      <p className="text-center text-zinc-300">{mensagem}</p>
      <Callout intent="warning">
        Se você já realizou o pagamento, pode acessar manualmente a{" "}
        <a href={`/pagamentos/sucesso?tipo=${tipo}`} className="underline underline-offset-2">
          página de confirmação de pagamento
        </a>
        .
      </Callout>
    </StatusPage>
  );
}

export default function VerificarPagamento() {
  return (
    <Suspense
      fallback={
        <StatusPage intent="info" icon="refresh" title="Carregando...">
          <div className="flex justify-center">
            <Spinner className="w-10 h-10" />
          </div>
        </StatusPage>
      }
    >
      <VerificarPagamentoContent />
    </Suspense>
  );
}
