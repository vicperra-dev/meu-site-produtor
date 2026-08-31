import { redirect } from "next/navigation";

/** GO-03A — rota legada. Serviços Gerais agora vivem em /admin/servicos. */
export default function AdminServicosAceitosLegacyRedirect() {
  redirect("/admin/servicos/todos");
}
