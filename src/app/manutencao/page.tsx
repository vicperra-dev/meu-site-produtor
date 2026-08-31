"use client";

/**
 * Manutenção — GO-03F: Design System (Card + Spinner + LinkButton).
 * Lógica do modo go-live (query ?mode=golive) inalterada.
 */

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { GO_LIVE_MAINTENANCE_MESSAGE } from "@/app/lib/go-live-maintenance";
import { Card, LinkButton, Spinner } from "@/components/design-system";

function ManutencaoContent() {
  const searchParams = useSearchParams();
  const isGoLive = searchParams.get("mode") === "golive";

  return (
    <Card className="border-red-700/40 bg-zinc-900/80 text-center space-y-6 p-6 sm:p-10">
      <h1 className="text-2xl md:text-3xl font-bold text-zinc-100">
        {isGoLive ? "Preparativos para o lançamento" : "Site em Manutenção"}
      </h1>

      <p className="text-base md:text-lg text-zinc-300 leading-relaxed">
        {isGoLive ? (
          GO_LIVE_MAINTENANCE_MESSAGE
        ) : (
          <>
            Estamos realizando atualizações para melhorar sua experiência.
            <br />
            Voltaremos em breve!
          </>
        )}
      </p>

      <div className="flex justify-center py-2">
        <Spinner className="w-12 h-12 border-4 border-red-500 border-t-transparent" />
      </div>

      <p className="text-sm text-zinc-400">Obrigado pela sua paciência.</p>

      <div className="flex justify-center">
        <LinkButton href="/" variant="outline" size="sm">
          Tentar acessar o site
        </LinkButton>
      </div>
    </Card>
  );
}

export default function ManutencaoPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 flex items-center justify-center px-4">
      <div className="max-w-2xl w-full space-y-8">
        <div className="text-center text-6xl md:text-8xl font-bold text-white">
          <span className="text-red-500">T</span>House Rec
        </div>

        <Suspense
          fallback={
            <div className="flex justify-center py-10">
              <Spinner className="w-12 h-12 border-4 border-red-500 border-t-transparent" />
            </div>
          }
        >
          <ManutencaoContent />
        </Suspense>
      </div>
    </div>
  );
}
