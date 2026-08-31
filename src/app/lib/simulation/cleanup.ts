/**
 * SIM-01 — Cleanup automático pós-cenário (reusa TE helpers oficiais).
 */

import { cleanupTeUserArtifacts } from "@/app/lib/test-engine/te02a-helpers";

export async function cleanupSimulationUser(userId: string): Promise<Record<string, number>> {
  const result = await cleanupTeUserArtifacts(userId);
  return result.deleted;
}
