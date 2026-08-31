import { redirect } from "next/navigation";

/** GO-03A — rota legada. Serviços agora vivem em /admin/servicos. */
export default function AdminServicosSolicitadosLegacyRedirect() {
  redirect("/admin/servicos/todos");
}
