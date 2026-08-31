"use client";

/**
 * Testar email — utilitário interno. GO-03F: visual no Design System
 * (PageHeader + Card + Button + Callout). Chamada /api/test-email inalterada.
 */

import { useState } from "react";
import { Button, Callout, Card, PageHeader } from "@/components/design-system";

export default function TestarEmailPage() {
  const [resultado, setResultado] = useState<any>(null);
  const [carregando, setCarregando] = useState(false);

  async function testarEmail() {
    setCarregando(true);
    setResultado(null);

    try {
      const res = await fetch("/api/test-email");
      const data = await res.json();
      setResultado(data);
    } catch (err: any) {
      setResultado({
        success: false,
        error: "Erro ao fazer requisição",
        details: { message: err.message },
      });
    } finally {
      setCarregando(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12 text-zinc-100">
      <div className="w-full max-w-2xl space-y-6">
        <PageHeader
          title="Teste de Email"
          subtitle="Utilitário interno para verificar o envio de emails da plataforma."
          className="justify-center text-center"
        />

        <Button
          type="button"
          variant="primary"
          size="md"
          fullWidth
          loading={carregando}
          onClick={testarEmail}
        >
          {carregando ? "Testando..." : "Testar Envio de Email"}
        </Button>

        {resultado && (
          <Card className="space-y-4">
            <Callout
              intent={resultado.success ? "success" : "error"}
              icon={resultado.success ? "check-circle" : "x-circle"}
              title={resultado.success ? "Sucesso" : "Erro"}
            >
              {resultado.success
                ? "O email de teste foi enviado."
                : resultado.error || "Falha ao enviar o email de teste."}
            </Callout>
            <pre className="overflow-auto rounded-lg bg-zinc-950 p-4 text-xs text-zinc-300">
              {JSON.stringify(resultado, null, 2)}
            </pre>
          </Card>
        )}
      </div>
    </main>
  );
}
