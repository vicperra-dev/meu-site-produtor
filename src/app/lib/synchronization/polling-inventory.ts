/**
 * SYNC-01A — Inventário oficial de polling.
 * Classificação: necessario | desnecessario | fallback
 */

import type { PollingInventoryItem } from "@/app/lib/synchronization/types";

/** Inventário esperado após SYNC-01A (fonte para audit). */
export const POLLING_INVENTORY: PollingInventoryItem[] = [
  {
    file: "src/app/lib/synchronization/DomainSyncProvider.tsx",
    what: "SSE reconnect + visibility recovery fetch cursor",
    intervalMs: 15000,
    classification: "fallback",
    notes: "Único polling de recuperação do Sync Engine; não refetcha dados de domínio por conta própria sem evento.",
  },
  {
    file: "src/app/api/sync/events/route.ts",
    what: "SSE heartbeat + outbox tail between Vercel instances",
    intervalMs: 4000,
    classification: "fallback",
    notes: "Heartbeat 15s + tail 4s do SynchronizationEvent para fan-out cross-instance sem Redis.",
  },
  {
    file: "src/app/hooks/useIntelligentRefresh.ts",
    what: "Agenda calendar smart refresh (~5min)",
    intervalMs: 300000,
    classification: "fallback",
    notes: "Fallback longo para slots se SSE perdida; refresh principal via surface agenda.",
  },
  {
    file: "src/app/pagamentos/sucesso/page.tsx",
    what: "Payment verification retry loop",
    intervalMs: 3000,
    classification: "necessario",
    notes: "Retentativa financeira até webhook/status; não é sync de domínio UI.",
  },
  {
    file: "src/app/chat/page.tsx",
    what: "Chat message polling",
    intervalMs: 60000,
    classification: "necessario",
    notes: "Chat fora do escopo SYNC-01A domínio operacional.",
  },
  {
    file: "src/app/admin/chat/page.tsx",
    what: "Admin chat sessions polling",
    intervalMs: 60000,
    classification: "necessario",
    notes: "Chat fora do escopo SYNC-01A.",
  },
  {
    file: "src/app/admin/chats-gerais/page.tsx",
    what: "Admin chats gerais polling",
    intervalMs: 60000,
    classification: "necessario",
    notes: "Chat fora do escopo SYNC-01A.",
  },
  {
    file: "src/app/admin/chats-pendentes/page.tsx",
    what: "Admin chats pendentes polling",
    intervalMs: 60000,
    classification: "necessario",
    notes: "Chat fora do escopo SYNC-01A.",
  },
  {
    file: "src/app/hooks/useUnreadChatCount.ts",
    what: "Unread chat badge",
    intervalMs: 60000,
    classification: "necessario",
    notes: "Chat; fora do Sync Engine operacional.",
  },
  {
    file: "src/app/faq/page.tsx",
    what: "FAQ polling",
    intervalMs: 60000,
    classification: "necessario",
    notes: "FAQ fora do escopo SYNC-01A.",
  },
  {
    file: "src/app/components/ChatNotification.tsx",
    what: "Chat notification toast polling",
    intervalMs: 0,
    classification: "necessario",
    notes: "Chat UI.",
  },
  // Removidos / migrados para Sync Engine (audit deve falhar se setInterval ainda existir nestes):
  {
    file: "src/app/minha-conta/page.tsx",
    what: "REMOVED 30s domain poll → useDomainRefresh",
    intervalMs: 0,
    classification: "desnecessario",
    notes: "Substituído por SSE/sync subscription.",
  },
  {
    file: "src/app/admin/servicos-aceitos/page.tsx",
    what: "REMOVED 30s poll",
    intervalMs: 0,
    classification: "desnecessario",
    notes: "Substituído por Sync Engine.",
  },
  {
    file: "src/app/admin/servicos-solicitados/page.tsx",
    what: "REMOVED 30s poll",
    intervalMs: 0,
    classification: "desnecessario",
    notes: "Substituído por Sync Engine.",
  },
  {
    file: "src/app/admin/estatisticas/page.tsx",
    what: "REMOVED 45s poll",
    intervalMs: 0,
    classification: "desnecessario",
    notes: "Substituído por Sync Engine.",
  },
  {
    file: "src/app/admin/planos/page.tsx",
    what: "REMOVED 60s poll",
    intervalMs: 0,
    classification: "desnecessario",
    notes: "Substituído por Sync Engine.",
  },
  {
    file: "src/app/hooks/useUnreadAppointmentCount.ts",
    what: "Badge appointments — fallback leve via sync events",
    intervalMs: 0,
    classification: "desnecessario",
    notes: "Refresh via sync surface minha-conta / domain subscription.",
  },
  {
    file: "src/app/hooks/useUnreadPlanCount.ts",
    what: "Badge plans — via sync",
    intervalMs: 0,
    classification: "desnecessario",
    notes: "Refresh via sync.",
  },
  {
    file: "src/app/hooks/useUnreadFaqCount.ts",
    what: "FAQ badge polling mantido (fora domínio)",
    intervalMs: 60000,
    classification: "necessario",
    notes: "FAQ não faz parte do Sync Engine operacional nesta sprint.",
  },
];

export function classifyKnownPolling(file: string): PollingInventoryItem | undefined {
  return POLLING_INVENTORY.find((i) => i.file.replace(/\\/g, "/") === file.replace(/\\/g, "/"));
}
