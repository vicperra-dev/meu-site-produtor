import { Suspense } from "react";
import { ServicosBoard } from "@/app/admin/servicos-ui/ServicosBoard";
import { BoardSkeleton } from "@/app/admin/servicos-ui/States";

/** GO-03A — Serviços Gerais (visão "Todos"). */
export default function AdminServicosPage() {
  return (
    <Suspense fallback={<BoardSkeleton />}>
      <ServicosBoard variant="gerais" status="todos" />
    </Suspense>
  );
}
