import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ServicosBoard } from "@/app/admin/servicos-ui/ServicosBoard";
import { BoardSkeleton } from "@/app/admin/servicos-ui/States";
import { STATUS_BY_SLUG } from "@/app/admin/servicos-ui/meta";

/**
 * GO-03A — Serviços Gerais por status:
 * /admin/servicos/todos|pendentes|aceitos|em-andamento|concluidos|cancelados|recusados
 * Todas as páginas usam o mesmo componente (ServicosBoard).
 */
export default async function AdminServicosStatusPage({
  params,
}: {
  params: Promise<{ status: string }>;
}) {
  const { status } = await params;
  const meta = STATUS_BY_SLUG.get(status);
  if (!meta) notFound();
  return (
    <Suspense fallback={<BoardSkeleton />}>
      <ServicosBoard variant="gerais" status={meta.key} />
    </Suspense>
  );
}
