import { redirect } from "next/navigation";

/** Rota legada: Serviços Selecionados consolidado em Serviços Gerais. */
export default function AdminServicosSelecionadosLegacyRedirect() {
  redirect("/admin/servicos/todos");
}
