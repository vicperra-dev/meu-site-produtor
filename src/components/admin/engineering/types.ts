import type { EngineeringReportsBundle } from "@/app/lib/engineering-dashboard-shared";

export type EngineeringData = EngineeringReportsBundle;

export type DashboardSection =
  | "overview"
  | "guardian"
  | "execution"
  | "quality"
  | "refactor"
  | "architecture"
  | "knowledge"
  | "roadmap"
  | "deploy";

export type DomainFilter =
  | "all"
  | "Financeiro"
  | "Appointment"
  | "Coupon"
  | "Webhook"
  | "Admin"
  | "Infraestrutura"
  | "Guardian";

export const SECTIONS: Array<{ id: DashboardSection; label: string; icon: string }> = [
  { id: "overview", label: "Visão Geral", icon: "📊" },
  { id: "guardian", label: "Guardian", icon: "🛡️" },
  { id: "execution", label: "Execução", icon: "⚙️" },
  { id: "quality", label: "Qualidade", icon: "💚" },
  { id: "refactor", label: "Refatoração", icon: "🔧" },
  { id: "architecture", label: "Arquitetura", icon: "🏛️" },
  { id: "knowledge", label: "Knowledge Graph", icon: "🕸️" },
  { id: "roadmap", label: "Roadmap", icon: "🗺️" },
  { id: "deploy", label: "Deploy", icon: "🚀" },
];

export const DOMAIN_FILTERS: Array<{ id: DomainFilter; label: string }> = [
  { id: "all", label: "Todos" },
  { id: "Financeiro", label: "Financeiro" },
  { id: "Appointment", label: "Appointment" },
  { id: "Coupon", label: "Coupon" },
  { id: "Webhook", label: "Webhook" },
  { id: "Admin", label: "Admin" },
  { id: "Infraestrutura", label: "Infraestrutura" },
  { id: "Guardian", label: "Guardian" },
];
