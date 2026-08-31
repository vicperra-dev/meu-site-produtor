/**
 * Persistência de runs Homologation — banco (Prisma), sem filesystem.
 * GO-06E: corrige ENOENT em /var/task/reports/homologation no Vercel serverless.
 */
import { prisma } from "@/app/lib/prisma";
import type { HomologationRun } from "@/app/lib/homologation/types";

export async function saveHomologationRun(run: HomologationRun): Promise<string> {
  const payload = JSON.stringify(run);
  await prisma.homologationRunRecord.upsert({
    where: { id: run.runId },
    create: {
      id: run.runId,
      payload,
      ok: Boolean(run.ok),
    },
    update: {
      payload,
      ok: Boolean(run.ok),
    },
  });
  return run.runId;
}

export async function loadHomologationRun(runId: string): Promise<HomologationRun | null> {
  try {
    const row = await prisma.homologationRunRecord.findUnique({ where: { id: runId } });
    if (!row) return null;
    return JSON.parse(row.payload) as HomologationRun;
  } catch {
    return null;
  }
}

export async function loadLatestHomologationRun(): Promise<HomologationRun | null> {
  try {
    const row = await prisma.homologationRunRecord.findFirst({
      orderBy: { createdAt: "desc" },
    });
    if (!row) return null;
    return JSON.parse(row.payload) as HomologationRun;
  } catch {
    return null;
  }
}

export async function listHomologationRuns(limit = 20): Promise<HomologationRun[]> {
  try {
    const rows = await prisma.homologationRunRecord.findMany({
      orderBy: { createdAt: "desc" },
      take: Math.max(1, Math.min(limit, 100)),
    });
    const runs: HomologationRun[] = [];
    for (const row of rows) {
      try {
        runs.push(JSON.parse(row.payload) as HomologationRun);
      } catch {
        /* skip corrupt */
      }
    }
    return runs;
  } catch {
    return [];
  }
}
