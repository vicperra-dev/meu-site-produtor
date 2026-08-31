"use client";

/**
 * Pagamento não concluído — GO-03E: StatusPage do Design System.
 */

import { Callout, LinkButton, StatusPage } from "@/components/design-system";

export default function PagamentoFalhaPage() {
  return (
    <StatusPage
      intent="error"
      icon="x-circle"
      title="Pagamento não concluído"
      description="Ocorreu um problema ao processar o seu pagamento."
      actions={
        <>
          <LinkButton href="/planos" variant="primary" size="md">
            Ver planos novamente
          </LinkButton>
          <LinkButton href="/agendamento" variant="outline" size="md">
            Ir para agendamento
          </LinkButton>
          <LinkButton href="/" variant="ghost" size="md">
            Voltar ao início
          </LinkButton>
        </>
      }
    >
      <Callout intent="info">
        Se o valor tiver sido debitado, o Asaas poderá realizar o estorno automaticamente. Em caso
        de dúvida, fale pelo chat ou pela página de contato.
      </Callout>
    </StatusPage>
  );
}
