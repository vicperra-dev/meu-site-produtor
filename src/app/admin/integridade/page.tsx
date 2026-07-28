"use client";

/**
 * GO-H10A — Integridade moveu-se para Homologação.
 * Mantém a rota antiga com redirect.
 */
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoadingBlock, PageHeader } from "@/components/design-system";

export default function IntegridadeRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin/homologacao?session=ferramentas&tool=integridade");
  }, [router]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Integridade"
        subtitle="Redirecionando para Homologação → Ferramentas…"
      />
      <LoadingBlock label="Abrindo sessão de Integridade…" />
    </div>
  );
}
