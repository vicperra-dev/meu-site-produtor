/**
 * EC-01 — Knowledge Graph — arestas e consultas.
 */

import { DOMAIN_GRAPH_NODES, listGraphEntityIds } from "@/app/lib/domain/graph/nodes";
import type { GraphEdge, GraphEntityId, GraphQueryResult } from "@/app/lib/domain/graph/types";

export function buildGraphEdges(): GraphEdge[] {
  const edges: GraphEdge[] = [];
  for (const node of Object.values(DOMAIN_GRAPH_NODES)) {
    for (const dep of node.dependsOn) {
      edges.push({ from: node.id, to: dep, relation: "depends" });
    }
    for (const aff of node.affects) {
      edges.push({ from: node.id, to: aff, relation: "affects" });
    }
  }
  return edges;
}

export function queryEntity(entity: GraphEntityId): GraphQueryResult {
  const node = DOMAIN_GRAPH_NODES[entity];
  const dependents = listGraphEntityIds().filter((id) =>
    DOMAIN_GRAPH_NODES[id].dependsOn.includes(entity)
  );
  return {
    entity,
    node,
    dependents,
    affectedSurfaces: [...new Set([...node.surfaces, ...dependents.flatMap((d) => DOMAIN_GRAPH_NODES[d].surfaces)])],
    relatedEvents: [...new Set([...node.producesEvents, ...node.consumesEvents])],
  };
}

export function entitiesDependingOn(entity: GraphEntityId): GraphEntityId[] {
  return listGraphEntityIds().filter((id) => DOMAIN_GRAPH_NODES[id].dependsOn.includes(entity));
}

export function entitiesAffectedBy(entity: GraphEntityId): GraphEntityId[] {
  return DOMAIN_GRAPH_NODES[entity].affects;
}

export function workflowsUsingEntity(entity: GraphEntityId): string[] {
  if (entity === "Workflow") return ["workflow.ts", "state-machine"];
  const node = DOMAIN_GRAPH_NODES[entity];
  return node.usedBy.filter((u) => u.includes("workflow") || u === "workflow");
}

export function eventsAffectingSurface(surface: string): string[] {
  const events = new Set<string>();
  for (const node of Object.values(DOMAIN_GRAPH_NODES)) {
    if (node.surfaces.includes(surface)) {
      for (const e of node.consumesEvents) events.add(e);
      for (const e of node.producesEvents) events.add(e);
    }
  }
  if (surface === "dashboard" || surface === "estatisticas") {
    events.add("PaymentConfirmed");
    events.add("ServiceCompleted");
  }
  return [...events];
}

export function testsCoveringEntity(entity: GraphEntityId): string[] {
  const map: Partial<Record<GraphEntityId, string[]>> = {
    Payment: ["PAY-001", "SIM-001", "SIM-002", "SIM-003", "SIM-008", "SYNC-001"],
    Appointment: ["APT-001", "APT-002", "APT-003", "APT-004", "SIM-004", "SIM-009", "SIM-010", "SYNC-002"],
    Service: ["SRV-001", "SRV-002", "SIM-004", "SYNC-003"],
    Coupon: ["CPN-001", "CPN-002", "CPN-003", "CPN-004", "SIM-006", "SIM-007", "SYNC-006"],
    Plan: ["PLN-001", "PLN-002", "PLN-003", "PLN-004", "PLN-005", "SIM-005", "SYNC-007"],
    Synchronization: ["SYNC-001", "SYNC-002", "SYNC-003", "SYNC-004", "SYNC-005", "SYNC-006", "SYNC-007"],
    Workflow: ["ADM-001", "ADM-002", "ADM-003", "ADM-004", "SIM-009", "SIM-010"],
  };
  return map[entity] || [];
}

export function simulationsForEntity(entity: GraphEntityId): string[] {
  return testsCoveringEntity(entity).filter((id) => id.startsWith("SIM-"));
}

export function surfacesConsumingEvent(eventName: string): string[] {
  const surfaces = new Set<string>();
  for (const node of Object.values(DOMAIN_GRAPH_NODES)) {
    if (node.consumesEvents.includes(eventName) || node.producesEvents.includes(eventName)) {
      for (const s of node.surfaces) surfaces.add(s);
    }
  }
  const sync = DOMAIN_GRAPH_NODES.Synchronization;
  if (sync.consumesEvents.includes(eventName)) {
    for (const s of sync.surfaces) surfaces.add(s);
  }
  return [...surfaces];
}
