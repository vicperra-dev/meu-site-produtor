/** Portal do Cliente — definição das abas de navegação. */

import type { IconName } from "@/components/design-system";

export type TabKey =
  | "visao-geral"
  | "agendamentos"
  | "downloads"
  | "cupons"
  | "plano"
  | "historico"
  | "notificacoes"
  | "perfil"
  | "ajuda";

export const TABS: Array<{ key: TabKey; label: string; icon: IconName }> = [
  { key: "visao-geral", label: "Visão geral", icon: "home" },
  { key: "agendamentos", label: "Agendamentos", icon: "calendar" },
  { key: "downloads", label: "Downloads", icon: "download" },
  { key: "cupons", label: "Cupons", icon: "ticket" },
  { key: "plano", label: "Assinatura", icon: "box" },
  { key: "historico", label: "Histórico", icon: "history" },
  { key: "notificacoes", label: "Notificações", icon: "bell" },
  { key: "perfil", label: "Perfil", icon: "user" },
  { key: "ajuda", label: "Ajuda", icon: "help" },
];

export function isTabKey(v: string | null): v is TabKey {
  return TABS.some((t) => t.key === v);
}
