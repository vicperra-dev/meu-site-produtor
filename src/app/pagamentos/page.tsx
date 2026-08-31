"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoadingBlock } from "@/components/design-system";

/** Rota legada /pagamentos → carrinho. */
export default function PagamentosPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/carrinho");
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-6 py-12">
      <LoadingBlock label="Redirecionando para o carrinho…" />
    </main>
  );
}
