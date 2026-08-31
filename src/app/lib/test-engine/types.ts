/**
 * TE-01B / TE-02A — tipos do núcleo do Test Engine.
 * Nenhum fluxo paralelo de domínio.
 */

export type ScenarioId =
  | "TE-S01"
  | "TE-S02"
  | "TE-S03"
  | "TE-S04"
  | "TE-S05"
  | "TE-S06"
  | "TE-S07"
  | "TE-S08"
  | "TE-S09"
  | "TE-S10"
  | "TE-S11"
  | "TE-S12"
  | "TE-S13"
  | "SRV-001"
  | "SRV-002"
  | "CPN-001"
  | "CPN-002"
  | "CPN-003"
  | "CPN-004"
  | "PLN-001"
  | "PLN-002"
  | "PLN-003"
  | "PLN-004"
  | "PLN-005"
  | "APT-001"
  | "APT-002"
  | "APT-003"
  | "APT-004"
  | "PAY-001"
  | "ADM-001"
  | "ADM-002"
  | "ADM-003"
  | "ADM-004"
  | "USR-001"
  | "SYNC-001"
  | "SYNC-002"
  | "SYNC-003"
  | "SYNC-004"
  | "SYNC-005"
  | "SYNC-006"
  | "SYNC-007"
  | "PH01-001"
  | "PH01-002"
  | "PH01-003"
  | "PH01-004"
  | "PH01-005"
  | "GL01-001"
  | "GL01-002"
  | "GL01-003"
  | "GL01-004"
  | "RC01-001"
  | "RC01-002"
  | "RC01-003"
  | "RC01-004"
  | "RC01-005"
  | "RC01-006"
  | "RC02-001"
  | "RC02-002"
  | "RC02-003"
  | "RC02-004"
  | "RC02-005"
  | "RC02-006"
  | "RC02-007"
  | "RC03-001"
  | "RC03-002"
  | "RC03-003"
  | "RC03-004"
  | "RC03-005"
  | "RC03-006"
  | "RC03-007"
  | "RC03-008"
  | "RC03-009"
  | "RC03-010";

export type ScenarioStatus = "implemented" | "stub" | "skipped" | "pass" | "fail" | "error";

export type AssertResult = {
  name: string;
  ok: boolean;
  message?: string;
  evidence?: Record<string, unknown>;
};

export type ScenarioContext = {
  runId: string;
  startedAt: string;
  actor?: { role: string | null; email: string | null } | null;
  cliToken?: string | null;
  /** Prefixo para emails/artefacts de teste */
  artifactPrefix: string;
};

export type ScenarioResult = {
  id: ScenarioId;
  name: string;
  status: ScenarioStatus;
  durationMs: number;
  asserts: AssertResult[];
  errors: string[];
  warnings: string[];
  artifacts?: Record<string, unknown>;
};

export type ScenarioDefinition = {
  id: ScenarioId;
  name: string;
  description: string;
  status: "implemented" | "stub";
  run: (ctx: ScenarioContext) => Promise<
    Omit<ScenarioResult, "id" | "name" | "durationMs"> & {
      status: ScenarioStatus;
      asserts: AssertResult[];
      errors: string[];
      warnings: string[];
      artifacts?: Record<string, unknown>;
    }
  >;
};

export type ExecutionReport = {
  reportId: "TE-01B-execution" | "TE-02A-execution" | "SYNC-01A-execution" | "PH-01-execution" | "RC-01-execution" | "RC-02-execution" | "RC-03-execution";
  runId: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  environment: {
    nodeEnv: string | undefined;
    siteUrl: string;
    vercelEnv: string | undefined;
    testEngineEnabled: boolean;
  };
  gate: { allowed: boolean; reason?: string; warnings: string[] };
  results: ScenarioResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    stubs: number;
    skipped: number;
    errors: number;
  };
};
