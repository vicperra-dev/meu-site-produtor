/**
 * SYNC-01A — Mapa central Evento → Superfícies / Escopo.
 * Única fonte de roteamento; telas não escolhem eventos manualmente.
 */

import type { SyncEventName, SyncScope, SyncSurface } from "@/app/lib/synchronization/types";

export type SyncRoute = {
  surfaces: SyncSurface[];
  /** Escopo primário do envelope. */
  scope: SyncScope;
  /** Também entrega ao canal público (agenda). */
  publicAgenda?: boolean;
  /** Também entrega a admins além do dono. */
  notifyAdmin?: boolean;
};

const ALL_OPS: SyncSurface[] = [
  "minha-conta",
  "dashboard",
  "servicos-gerais",
  "servicos-selecionados",
  "pagamentos",
  "cupons",
  "agenda",
  "admin-agendamentos",
  "estatisticas",
  "planos",
];

const ROUTE_MAP: Record<SyncEventName, SyncRoute> = {
  AppointmentReserved: {
    surfaces: ["agenda", "minha-conta", "admin-agendamentos", "dashboard", "estatisticas"],
    scope: "user",
    publicAgenda: true,
    notifyAdmin: true,
  },
  AppointmentAccepted: {
    surfaces: [
      "minha-conta",
      "agenda",
      "admin-agendamentos",
      "servicos-gerais",
      "servicos-selecionados",
      "dashboard",
      "estatisticas",
    ],
    scope: "user",
    publicAgenda: true,
    notifyAdmin: true,
  },
  AppointmentRejected: {
    surfaces: ["minha-conta", "agenda", "admin-agendamentos", "servicos-gerais", "dashboard", "estatisticas"],
    scope: "user",
    publicAgenda: true,
    notifyAdmin: true,
  },
  AppointmentCancelled: {
    surfaces: [
      "minha-conta",
      "agenda",
      "admin-agendamentos",
      "servicos-gerais",
      "servicos-selecionados",
      "cupons",
      "dashboard",
      "estatisticas",
    ],
    scope: "user",
    publicAgenda: true,
    notifyAdmin: true,
  },
  AppointmentRebooked: {
    surfaces: ["minha-conta", "agenda", "admin-agendamentos", "dashboard"],
    scope: "user",
    publicAgenda: true,
    notifyAdmin: true,
  },
  AppointmentStarted: {
    surfaces: [
      "minha-conta",
      "admin-agendamentos",
      "servicos-gerais",
      "servicos-selecionados",
      "dashboard",
      "estatisticas",
    ],
    scope: "user",
    notifyAdmin: true,
  },
  AppointmentCompleted: {
    surfaces: [
      "minha-conta",
      "admin-agendamentos",
      "servicos-gerais",
      "servicos-selecionados",
      "dashboard",
      "estatisticas",
    ],
    scope: "user",
    notifyAdmin: true,
  },
  ServiceAccepted: {
    surfaces: ["minha-conta", "servicos-gerais", "servicos-selecionados", "dashboard", "estatisticas"],
    scope: "user",
    notifyAdmin: true,
  },
  ServiceStarted: {
    surfaces: ["minha-conta", "servicos-gerais", "servicos-selecionados", "dashboard", "estatisticas"],
    scope: "user",
    notifyAdmin: true,
  },
  ServiceDelivered: {
    surfaces: ["minha-conta", "servicos-gerais", "servicos-selecionados", "dashboard", "estatisticas"],
    scope: "user",
    notifyAdmin: true,
  },
  ServiceCompleted: {
    surfaces: ["minha-conta", "servicos-gerais", "servicos-selecionados", "dashboard", "estatisticas"],
    scope: "user",
    notifyAdmin: true,
  },
  ServiceCancelled: {
    surfaces: ["minha-conta", "servicos-gerais", "servicos-selecionados", "dashboard", "estatisticas"],
    scope: "user",
    notifyAdmin: true,
  },
  ServiceRejected: {
    surfaces: ["minha-conta", "servicos-gerais", "servicos-selecionados", "dashboard", "estatisticas"],
    scope: "user",
    notifyAdmin: true,
  },
  PaymentReceived: {
    surfaces: ["minha-conta", "pagamentos", "agenda", "cupons", "planos", "dashboard", "estatisticas"],
    scope: "user",
    notifyAdmin: true,
  },
  PaymentConfirmed: {
    surfaces: ["minha-conta", "pagamentos", "agenda", "cupons", "planos", "dashboard", "estatisticas"],
    scope: "user",
    notifyAdmin: true,
  },
  PaymentRefunded: {
    surfaces: ["minha-conta", "pagamentos", "dashboard", "estatisticas", "cupons"],
    scope: "user",
    notifyAdmin: true,
  },
  CouponGenerated: {
    surfaces: ["minha-conta", "cupons", "planos", "dashboard"],
    scope: "user",
    notifyAdmin: true,
  },
  CouponConsumed: {
    surfaces: ["minha-conta", "cupons", "agenda", "planos", "dashboard"],
    scope: "user",
    notifyAdmin: true,
  },
  CouponExpired: {
    surfaces: ["minha-conta", "cupons", "planos"],
    scope: "user",
    notifyAdmin: true,
  },
  CouponCancelled: {
    surfaces: ["minha-conta", "cupons", "planos", "dashboard"],
    scope: "user",
    notifyAdmin: true,
  },
  PlanCancelled: {
    surfaces: ["minha-conta", "planos", "cupons", "dashboard", "estatisticas", "pagamentos"],
    scope: "user",
    notifyAdmin: true,
  },
  PlanRenewed: {
    surfaces: ["minha-conta", "planos", "cupons", "dashboard", "estatisticas", "pagamentos"],
    scope: "user",
    notifyAdmin: true,
  },
  DomainTransition: {
    surfaces: ["minha-conta", "dashboard"],
    scope: "user",
    notifyAdmin: true,
  },
  SyncSignal: {
    surfaces: ALL_OPS,
    scope: "all",
    publicAgenda: true,
    notifyAdmin: true,
  },
};

export function resolveSyncRoute(name: SyncEventName): SyncRoute {
  return ROUTE_MAP[name] || ROUTE_MAP.SyncSignal;
}

export function listRoutedEventNames(): SyncEventName[] {
  return Object.keys(ROUTE_MAP) as SyncEventName[];
}

export function surfacesForEvent(name: SyncEventName): SyncSurface[] {
  return [...resolveSyncRoute(name).surfaces];
}
