/**
 * EC-01 — Execution History (preparação Timeline StudioOS).
 */

import type { ExecutionHistoryEntry, ExecutionReport, ExecutionSession } from "@/app/lib/execution/types";

const history: ExecutionHistoryEntry[] = [];
const MAX_HISTORY = 500;

export function recordExecutionHistory(report: ExecutionReport): ExecutionHistoryEntry[] {
  const entries: ExecutionHistoryEntry[] = [];
  for (const s of report.sessions) {
    const entry = sessionToHistoryEntry(report.runId, s);
    history.push(entry);
    entries.push(entry);
  }
  while (history.length > MAX_HISTORY) history.shift();
  return entries;
}

function sessionToHistoryEntry(runId: string, s: ExecutionSession): ExecutionHistoryEntry {
  const assertsPassed = s.asserts.filter((a) => a.ok).length;
  const assertsFailed = s.asserts.filter((a) => !a.ok).length;
  return {
    executionId: s.executionId,
    runId,
    scenarioId: s.scenarioId,
    suite: s.suite,
    result: s.result,
    durationMs: s.durationMs,
    timestamp: s.timestamp,
    eventsCount: s.eventsProduced.length,
    assertsPassed,
    assertsFailed,
    cleanup: s.cleanup,
    warnings: s.warnings,
  };
}

export function getExecutionHistory(limit = 50): ExecutionHistoryEntry[] {
  return history.slice(-limit);
}

export function clearExecutionHistory(): void {
  history.length = 0;
}
