"use client";

/**
 * Minha Conta — Portal Premium do Cliente (GO-03D / GO-03E).
 */

import { Suspense } from "react";
import { LoadingBlock } from "@/components/design-system";
import { ClientPortal } from "./portal-ui/ClientPortal";

export default function MinhaContaPage() {
    return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
          <LoadingBlock label="Carregando seu portal…" />
        </div>
      }
    >
      <ClientPortal />
    </Suspense>
  );
}
