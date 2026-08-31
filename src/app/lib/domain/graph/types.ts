/**
 * EC-01 — Knowledge Graph types.
 */

export type GraphEntityId =
  | "User"
  | "Payment"
  | "Appointment"
  | "Service"
  | "Coupon"
  | "Plan"
  | "Statistics"
  | "Dashboard"
  | "Admin"
  | "Notification"
  | "Synchronization"
  | "Workflow";

export type GraphNode = {
  id: GraphEntityId;
  label: string;
  dependsOn: GraphEntityId[];
  affects: GraphEntityId[];
  usedBy: string[];
  producesEvents: string[];
  consumesEvents: string[];
  surfaces: string[];
  modules: string[];
};

export type GraphEdge = {
  from: GraphEntityId;
  to: GraphEntityId;
  relation: "depends" | "affects" | "produces" | "consumes";
  label?: string;
};

export type GraphQueryResult = {
  entity: GraphEntityId;
  node: GraphNode;
  dependents: GraphEntityId[];
  affectedSurfaces: string[];
  relatedEvents: string[];
};
