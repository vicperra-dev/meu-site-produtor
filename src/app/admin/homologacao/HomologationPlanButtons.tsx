"use client";

/**
 * GO-H10A/B — Botões dedicados de planos (Mensal/Anual × Bronze/Prata/Ouro).
 * Preços e benefícios vêm de PLAN_DEFINITIONS.
 */
import { Button } from "@/components/design-system";
import {
  PLAN_DEFINITIONS,
  formatPlanPriceBRL,
  type PlanTierId,
} from "@/app/lib/plan-definitions";

export type PlanTier = PlanTierId;
export type PlanModo = "mensal" | "anual";

const TIERS: PlanTierId[] = ["bronze", "prata", "ouro"];

export function HomologationPlanButtons({
  busy,
  onSelect,
}: {
  busy?: boolean;
  onSelect: (planId: PlanTier, modo: PlanModo) => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-400">
        Cada botão dispara imediatamente o cenário no mesmo pipeline da Homologação
        (SimulationProvider → webhook oficial → cupons de{" "}
        <code className="text-zinc-300">PLAN_DEFINITIONS</code>).
      </p>
      <div className="grid gap-4 md:grid-cols-3">
        {TIERS.map((id) => {
          const tier = PLAN_DEFINITIONS[id];
          return (
            <div
              key={id}
              className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-3"
            >
              <h3 className="text-base font-semibold text-zinc-100">{tier.nome}</h3>
              <p className="text-xs text-zinc-500">
                {tier.cycleBenefits.reduce((n, g) => n + g.quantity, 0)} cupons/ciclo
                {tier.hasPromotionAccess ? " · Shopping liberado" : " · Sem Shopping"}
              </p>
              <div className="flex flex-col gap-2">
                <Button
                  variant="primary"
                  disabled={busy}
                  onClick={() => onSelect(id, "mensal")}
                  className="!justify-between"
                >
                  <span>Mensal</span>
                  <span className="text-xs opacity-80">
                    {formatPlanPriceBRL(tier.mensal)}
                  </span>
                </Button>
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => onSelect(id, "anual")}
                  className="!justify-between"
                >
                  <span>Anual</span>
                  <span className="text-xs opacity-80">
                    {formatPlanPriceBRL(tier.anual)}
                  </span>
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
