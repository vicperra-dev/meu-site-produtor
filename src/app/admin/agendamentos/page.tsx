import { redirect } from "next/navigation";

/**
 * GO-03B — rota legada /admin/agendamentos.
 * Mapeia os query params antigos (?status= / ?filtro= / ?highlight=) para as
 * novas rotas por status e redireciona. O painel vive em /admin/agendamentos/*.
 */
const LEGACY_STATUS_TO_SLUG: Record<string, string> = {
  pendente: "pendentes",
  aceitos: "aceitos",
  cancelado: "cancelados",
  recusado: "recusados",
};

const LEGACY_FILTRO_TO_SLUG: Record<string, string> = {
  em_andamento: "em-andamento",
  concluidos: "concluidos",
};

export default async function AdminAgendamentosLegacyRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const status = typeof params.status === "string" ? params.status : "";
  const filtro = typeof params.filtro === "string" ? params.filtro : "";
  const highlight = typeof params.highlight === "string" ? params.highlight : "";

  const slug = LEGACY_STATUS_TO_SLUG[status] || LEGACY_FILTRO_TO_SLUG[filtro] || "todos";
  const suffix = highlight ? `?highlight=${encodeURIComponent(highlight)}` : "";
  redirect(`/admin/agendamentos/${slug}${suffix}`);
}
