"use client";

/**
 * Pagamento pendente — GO-03E: StatusPage do Design System.
 */

import { Callout, LinkButton, StatusPage } from "@/components/design-system";

export default function PagamentoPendentePage() {
  return (
    <StatusPage
      intent="warning"
      icon="clock"
      title="Pagamento pendente"
      description="Seu pagamento ainda está sendo processado pelo sistema."
      actions={
        <>
          <LinkButton href="/minha-conta" variant="primary" size="md">
            Ver Minha Conta
          </LinkButton>
          <LinkButton href="/" variant="outline" size="md">
            Voltar ao início
          </LinkButton>
        </>
      }
    >
      <Callout intent="warning">
        Assim que for confirmado, você receberá acesso ao serviço adquirido. Se já pagou, aguarde
        alguns minutos e atualize a página ou acompanhe em Minha Conta.
      </Callout>
    </StatusPage>
  );
}
