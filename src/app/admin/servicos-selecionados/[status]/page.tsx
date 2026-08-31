import { redirect } from "next/navigation";
import { STATUS_BY_SLUG } from "@/app/admin/servicos-ui/meta";

/**
 * Rota legada: /admin/servicos-selecionados/[status]
 * → equivalente em Serviços Gerais.
 */
export default async function AdminServicosSelecionadosStatusRedirect({
  params,
}: {
  params: Promise<{ status: string }>;
}) {
  const { status } = await params;
  const meta = STATUS_BY_SLUG.get(status);
  redirect(meta ? `/admin/servicos/${meta.slug}` : "/admin/servicos/todos");
}
