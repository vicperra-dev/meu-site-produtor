"use client";

/**
 * GO-H10A — Seleção de catálogo compartilhada (Agendamento + Homologação).
 * Fonte única: CHECKOUT_CATALOG. Alterações de catálogo refletem nos dois ambientes.
 */
import type { CSSProperties, ReactNode } from "react";
import {
  CHECKOUT_CATALOG,
  type CanonicalServiceId,
} from "@/app/lib/service-catalog";

const STUDIO_ORDER: CanonicalServiceId[] = [
  "sessao",
  "captacao",
  "mix",
  "master",
  "mix_master",
  "sonoplastia",
];

const BEATS_ORDER: CanonicalServiceId[] = [
  "beat1",
  "beat2",
  "beat3",
  "beat4",
  "beat_mix_master",
  "producao_completa",
];

export type CatalogQtyMap = Partial<Record<CanonicalServiceId, number>>;

const marketingShellStyle: CSSProperties = {
  background:
    "linear-gradient(to right, rgba(0,0,0,0) 0%, rgba(0,0,0,0.75) 8%, rgba(0,0,0,0.85) 20%, rgba(0,0,0,0.85) 80%, rgba(0,0,0,0.75) 92%, rgba(0,0,0,0) 100%)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
};

const fadeLineStyle: CSSProperties = {
  background:
    "linear-gradient(to right, transparent 0%, rgba(239, 68, 68, 0.3) 15%, rgba(239, 68, 68, 0.6) 50%, rgba(239, 68, 68, 0.3) 85%, transparent 100%)",
  boxShadow: "0 1px 10px rgba(239, 68, 68, 0.4)",
};

function QtyCard({
  id,
  nome,
  preco,
  subtitulo,
  porHora,
  quantidade,
  onChange,
}: {
  id: string;
  nome: string;
  preco: number;
  subtitulo?: string;
  porHora?: boolean;
  quantidade: number;
  onChange: (delta: number) => void;
}) {
  const isProducaoCompleta = id === "producao_completa";
  return (
    <div className="flex items-center justify-between rounded-xl border border-red-700/40 bg-zinc-900 p-4 text-sm">
      <div className="flex flex-col md:flex-row md:flex-wrap md:items-baseline gap-1">
        {isProducaoCompleta ? (
          <>
            <p className="font-semibold text-zinc-100">Produção Completa</p>
            <p className="text-xs text-zinc-300">
              (2h Sessão + 2h Captação + Beat + Mix + Master)
            </p>
          </>
        ) : (
          <div className="flex flex-wrap items-baseline gap-2">
            <p className="font-semibold text-zinc-100">{nome}</p>
            {subtitulo && <span className="text-xs text-zinc-400">{subtitulo}</span>}
          </div>
        )}
        <span className="text-xs text-red-300 mt-0.5">
          R$ {preco.toFixed(2).replace(".", ",")}
          {porHora ? " / hora" : ""}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(-1)}
          className="flex h-7 w-7 items-center justify-center rounded-full border border-zinc-600 text-xs hover:border-red-500"
          aria-label={`Diminuir ${nome}`}
        >
          -
        </button>
        <span className="w-6 text-center text-sm">{quantidade}</span>
        <button
          type="button"
          onClick={() => onChange(1)}
          className="flex h-7 w-7 items-center justify-center rounded-full border border-red-600 text-xs hover:bg-red-600 hover:text-white"
          aria-label={`Aumentar ${nome}`}
        >
          +
        </button>
      </div>
    </div>
  );
}

function MarketingPanel({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="flex justify-center">
      <div className="relative w-full max-w-4xl border border-red-500" style={{ borderWidth: "1px" }}>
        <div className="relative space-y-3 p-6 md:p-8" style={marketingShellStyle}>
          <h2
            className="text-center text-3xl font-semibold text-red-400"
            style={{ textShadow: "0 2px 4px rgba(0, 0, 0, 0.5)" }}
          >
            {title}
          </h2>
          <p
            className="mt-3 mb-6 text-center text-sm leading-relaxed text-white md:text-base"
            style={{ textShadow: "0 2px 8px rgba(0, 0, 0, 0.8)" }}
          >
            {description}
          </p>
          {children}
        </div>
        <div className="h-[1px]" style={fadeLineStyle} />
      </div>
    </section>
  );
}

export function CatalogSelectionPanels({
  qty,
  onBump,
  showStudio = true,
  showBeats = true,
  sectionStyle = "marketing",
}: {
  qty: CatalogQtyMap;
  onBump: (id: CanonicalServiceId, delta: number) => void;
  showStudio?: boolean;
  showBeats?: boolean;
  /** marketing = visual do Agendamento; admin = painel zinc da Homologação */
  sectionStyle?: "marketing" | "admin";
}) {
  const studioGrid = (
    <div className="grid gap-4 md:grid-cols-2">
      {STUDIO_ORDER.map((id) => {
        const s = CHECKOUT_CATALOG[id];
        const isPorHora = id === "sessao" || id === "captacao";
        return (
          <QtyCard
            key={id}
            id={id}
            nome={id === "sonoplastia" ? "Sonoplastia" : s.nome}
            preco={s.preco}
            subtitulo={id === "sonoplastia" ? "(a partir de)" : undefined}
            porHora={isPorHora}
            quantidade={qty[id] || 0}
            onChange={(d) => onBump(id, d)}
          />
        );
      })}
    </div>
  );

  const beatsGrid = (
    <div className="grid gap-4 md:grid-cols-2">
      {BEATS_ORDER.map((id) => {
        const s = CHECKOUT_CATALOG[id];
        return (
          <QtyCard
            key={id}
            id={id}
            nome={s.nome}
            preco={s.preco}
            quantidade={qty[id] || 0}
            onChange={(d) => onBump(id, d)}
          />
        );
      })}
    </div>
  );

  if (sectionStyle === "admin") {
    return (
      <div className="space-y-10">
        {showStudio && (
          <section className="w-full rounded-xl border border-zinc-800 bg-zinc-950/40">
            <div className="space-y-3 p-4 md:p-5">
              <h2 className="text-lg font-semibold text-zinc-100">Serviços de Estúdio</h2>
              <p className="text-sm text-zinc-500 mb-4">
                Selecione os serviços avulsos. Sessão e Captação usam o calendário presencial.
              </p>
              {studioGrid}
            </div>
          </section>
        )}
        {showBeats && (
          <section className="w-full rounded-xl border border-zinc-800 bg-zinc-950/40">
            <div className="space-y-3 p-4 md:p-5">
              <h2 className="text-lg font-semibold text-zinc-100">Beats e Pacotes Especiais</h2>
              <p className="text-sm text-zinc-500 mb-4">
                Pacotes comerciais e beats — mesma decomposição do Agendamento (GO-H5).
              </p>
              {beatsGrid}
            </div>
          </section>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-16">
      {showStudio && (
        <MarketingPanel
          title="Serviços de Estúdio e Avulsos"
          description="Selecione os serviços que você deseja para essa sessão. Você pode combinar captação, mix, master, sonoplastia e outras opções para montar um fluxo de trabalho completo ou apenas o que precisa no momento."
        >
          {studioGrid}
        </MarketingPanel>
      )}
      {showBeats && (
        <MarketingPanel
          title="Beats e Pacotes Especiais"
          description="Se você já tem uma ideia de sonoridade ou quer um beat exclusivo, pode selecionar aqui os pacotes de beats e produções completas."
        >
          {beatsGrid}
        </MarketingPanel>
      )}
    </div>
  );
}

export function CatalogPurchaseSummary({ qty }: { qty: CatalogQtyMap }) {
  const lines = (Object.keys(qty) as CanonicalServiceId[])
    .filter((id) => (qty[id] || 0) > 0)
    .map((id) => {
      const item = CHECKOUT_CATALOG[id];
      const n = qty[id] || 0;
      return { id, nome: item.nome, n, subtotal: item.preco * n };
    });
  const total = lines.reduce((a, l) => a + l.subtotal, 0);
  if (lines.length === 0) {
    return <p className="text-sm text-zinc-500">Nenhum item selecionado.</p>;
  }
  return (
    <div className="space-y-2 text-sm">
      {lines.map((l) => (
        <div key={l.id} className="flex justify-between gap-3 text-zinc-300">
          <span>
            {l.n}× {l.nome}
          </span>
          <span className="text-zinc-100">
            R$ {l.subtotal.toFixed(2).replace(".", ",")}
          </span>
        </div>
      ))}
      <div className="flex justify-between border-t border-zinc-700 pt-2 font-semibold text-zinc-100">
        <span>Total</span>
        <span>R$ {total.toFixed(2).replace(".", ",")}</span>
      </div>
    </div>
  );
}

export { STUDIO_ORDER, BEATS_ORDER };
