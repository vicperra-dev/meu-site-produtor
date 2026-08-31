/**
 * EC-01 — Impact Analysis (preparação — não executa automaticamente).
 */

import { listExecutionScenarios } from "@/app/lib/execution/registry";
import {
  entitiesDependingOn,
  simulationsForEntity,
  testsCoveringEntity,
} from "@/app/lib/domain/graph/queries";
import { listGraphEntityIds } from "@/app/lib/domain/graph/nodes";
import type { GraphEntityId } from "@/app/lib/domain/graph/types";

export type ImpactReport = {
  changedFiles: string[];
  entitiesAffected: GraphEntityId[];
  dependencies: GraphEntityId[];
  testsAffected: string[];
  simulationsAffected: string[];
  workflowsAffected: string[];
  assertionsAffected: string[];
  modulesAffected: string[];
  scenariosAffected: string[];
  preparedOnly: true;
};

const FILE_ENTITY_MAP: Record<string, GraphEntityId[]> = {
  "process-payment-webhook": ["Payment", "Appointment", "Plan", "Coupon"],
  "workflow.ts": ["Workflow", "Appointment", "Service", "Payment", "Coupon"],
  "state-machine": ["Workflow"],
  "synchronization": ["Synchronization"],
  "simulation": ["Workflow", "Synchronization"],
  "test-engine": ["Workflow"],
  "validate-coupon": ["Coupon"],
  "agendamentos": ["Appointment"],
  "servicos": ["Service"],
  "planos": ["Plan"],
  "asaas": ["Payment", "Plan"],
  "coupons": ["Coupon"],
  "admin": ["Admin", "Dashboard"],
};

function entitiesForFile(filePath: string): GraphEntityId[] {
  const normalized = filePath.replace(/\\/g, "/").toLowerCase();
  const found = new Set<GraphEntityId>();
  for (const [key, entities] of Object.entries(FILE_ENTITY_MAP)) {
    if (normalized.includes(key)) {
      for (const e of entities) found.add(e);
    }
  }
  return [...found];
}

export function analyzeImpact(changedFiles: string[]): ImpactReport {
  const entitiesAffected = new Set<GraphEntityId>();
  for (const f of changedFiles) {
    for (const e of entitiesForFile(f)) entitiesAffected.add(e);
  }

  const dependencies = new Set<GraphEntityId>();
  for (const e of entitiesAffected) {
    for (const d of entitiesDependingOn(e)) dependencies.add(d);
  }

  const testsAffected = new Set<string>();
  const simulationsAffected = new Set<string>();
  for (const e of entitiesAffected) {
    for (const t of testsCoveringEntity(e)) testsAffected.add(t);
    for (const s of simulationsForEntity(e)) simulationsAffected.add(s);
  }

  const scenariosAffected = new Set<string>([...testsAffected, ...simulationsAffected]);
  for (const s of listExecutionScenarios()) {
    const modHit = changedFiles.some((f) =>
      s.modules?.some((m) => f.includes(m)) || false
    );
    if (modHit) scenariosAffected.add(s.id);
  }

  const workflowsAffected = [...entitiesAffected].filter((e) =>
    ["Workflow", "Appointment", "Service", "Payment"].includes(e)
  ).map(String);

  const assertionsAffected = [
    "assertPayment",
    "assertAppointment",
    "assertService",
    "assertCoupon",
    "assertSynchronization",
    "assertWorkflow",
    "assertStateMachine",
  ].filter((a) => {
    if (entitiesAffected.has("Payment") && a.includes("Payment")) return true;
    if (entitiesAffected.has("Appointment") && a.includes("Appointment")) return true;
    if (entitiesAffected.has("Service") && a.includes("Service")) return true;
    if (entitiesAffected.has("Coupon") && a.includes("Coupon")) return true;
    if (entitiesAffected.has("Synchronization") && a.includes("Synchronization")) return true;
    if (entitiesAffected.has("Workflow") && (a.includes("Workflow") || a.includes("StateMachine")))
      return true;
    return false;
  });

  const modulesAffected = changedFiles.map((f) => f.replace(/\\/g, "/"));

  return {
    changedFiles,
    entitiesAffected: [...entitiesAffected],
    dependencies: [...dependencies],
    testsAffected: [...testsAffected],
    simulationsAffected: [...simulationsAffected],
    workflowsAffected,
    assertionsAffected,
    modulesAffected,
    scenariosAffected: [...scenariosAffected],
    preparedOnly: true,
  };
}

export function graphEntityCount(): number {
  return listGraphEntityIds().length;
}
