"use client";

/**
 * /conta — GO-03E: unifica perfil no Portal do Cliente.
 * Redireciona para /minha-conta?tab=perfil (mesma lógica de edição via /api/conta).
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoadingBlock } from "@/components/design-system";

export default function ContaRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/minha-conta?tab=perfil");
  }, [router]);

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <LoadingBlock label="Abrindo seu perfil…" />
    </div>
  );
}
