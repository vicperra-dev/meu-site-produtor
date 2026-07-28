"use client";

/**
 * Shopping — GO-H10B: promoções exclusivas só para Prata/Ouro (API + UI).
 */

import { useEffect, useState } from "react";
import {
  ComingSoon,
  LinkButton,
  PageHeader,
  Section,
  Callout,
  LoadingBlock,
} from "@/components/design-system";

type Promotion = {
  id: string;
  title: string;
  description: string;
};

export default function ShoppingPage() {
  const [loading, setLoading] = useState(true);
  const [hasPromotionAccess, setHasPromotionAccess] = useState(false);
  const [promotions, setPromotions] = useState<Promotion[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/shopping/promotions", { cache: "no-store" });
        const data = await res.json();
        if (cancelled) return;
        setHasPromotionAccess(Boolean(data.hasPromotionAccess));
        setPromotions(Array.isArray(data.promotions) ? data.promotions : []);
      } catch {
        if (!cancelled) {
          setHasPromotionAccess(false);
          setPromotions([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="relative mx-auto max-w-3xl px-4 py-10 text-zinc-100 min-h-[70vh]">
      <div
        className="fixed inset-0 z-0 bg-no-repeat bg-zinc-950 page-bg-image opacity-40"
        style={{
          backgroundImage: "url(/shopping-bg.png.png)",
          ["--page-bg-size" as string]: "cover",
          ["--page-bg-position" as string]: "center center",
        }}
        aria-hidden
      />
      <div className="relative z-10 space-y-6">
        <PageHeader
          title="Shopping THouse Rec"
          subtitle="Catálogo de compra em preparação. Promoções exclusivas para Prata/Ouro."
          icon="sparkles"
        />

        <Section>
          <ComingSoon
            title="Shopping em preparação"
            description="Estamos finalizando uma experiência de compra organizada, segura e alinhada à proposta criativa do estúdio."
            actions={
              <>
                <LinkButton href="/agendamento" variant="primary">
                  Agendar serviço
                </LinkButton>
                <LinkButton href="/planos" variant="outline">
                  Ver planos
                </LinkButton>
                <LinkButton href="/minha-conta" variant="ghost">
                  Minha Conta
                </LinkButton>
              </>
            }
          />
        </Section>

        <Section title="Promoções exclusivas">
          {loading ? (
            <LoadingBlock label="Verificando acesso…" />
          ) : hasPromotionAccess && promotions.length > 0 ? (
            <div className="space-y-3">
              <Callout intent="success" title="Acesso liberado (Prata / Ouro)">
                Seu plano ativo inclui promoções exclusivas do Shopping.
              </Callout>
              <ul className="space-y-3">
                {promotions.map((p) => (
                  <li
                    key={p.id}
                    className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4"
                  >
                    <p className="font-semibold text-zinc-100">{p.title}</p>
                    <p className="mt-1 text-sm text-zinc-400">{p.description}</p>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <Callout intent="info" title="Disponível nos planos Prata e Ouro">
              As promoções exclusivas do Shopping são liberadas automaticamente para
              assinantes Prata e Ouro (mensal ou anual). O plano Bronze não inclui este
              benefício.{" "}
              <LinkButton href="/planos" variant="ghost" className="!inline !px-1">
                Ver planos
              </LinkButton>
            </Callout>
          )}
        </Section>
      </div>
    </main>
  );
}
