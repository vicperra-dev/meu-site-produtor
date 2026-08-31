import { Suspense } from "react";
import { notFound } from "next/navigation";
import { AppointmentsBoard } from "@/app/admin/agendamentos-ui/AppointmentsBoard";
import { BoardSkeleton } from "@/app/admin/servicos-ui/States";
import { STATUS_BY_SLUG } from "@/app/admin/servicos-ui/meta";

/**
 * GO-03B — Agendamentos por status:
 * /admin/agendamentos/todos|pendentes|aceitos|em-andamento|concluidos|cancelados|recusados
 * Todas as páginas usam o mesmo componente (AppointmentsBoard).
 */
export default async function AdminAgendamentosStatusPage({
  params,
}: {
  params: Promise<{ status: string }>;
}) {
  const { status } = await params;
  const meta = STATUS_BY_SLUG.get(status);
  if (!meta) notFound();
  return (
    <Suspense fallback={<BoardSkeleton />}>
      <AppointmentsBoard status={meta.key} />
    </Suspense>
  );
}
