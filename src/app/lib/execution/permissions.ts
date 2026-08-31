/**
 * EC-01 — Permissões unificadas (TE + SIM).
 */

import type { ExecutionGateResult, ExecutionActor } from "@/app/lib/execution/types";

const OWNER_EMAIL = "thouse.rec.tremv@gmail.com";

function isAdminActor(actor: ExecutionActor): boolean {
  if (!actor) return false;
  if (actor.role === "ADMIN") return true;
  if ((actor.email || "").trim().toLowerCase() === OWNER_EMAIL) return true;
  return false;
}

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "").trim();
}

export function isLocalOrDevelopmentRuntime(): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  const site = siteUrl();
  return /localhost|127\.0\.0\.1/i.test(site);
}

export function isPreviewRuntime(): boolean {
  return process.env.VERCEL_ENV === "preview";
}

export function isProductionRuntimeBlocked(): boolean {
  if (isLocalOrDevelopmentRuntime()) return false;
  if (isPreviewRuntime()) return false;
  return process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";
}

export function assertExecutionAllowed(opts: {
  actor?: ExecutionActor;
  cliToken?: string | null;
  /** Cenários TE — simula gate Production sem mutar process.env (webpack-safe). */
  simulateProductionBlocked?: boolean;
}): ExecutionGateResult {
  const warnings: string[] = [];

  if (opts.simulateProductionBlocked || isProductionRuntimeBlocked()) {
    return {
      allowed: false,
      reason: "Execution Core bloqueado em Production (EC-01).",
      warnings,
    };
  }

  if (
    isPreviewRuntime() &&
    process.env.EXECUTION_CORE_ENABLED !== "1" &&
    process.env.SIM_ENGINE_ENABLED !== "1" &&
    process.env.TEST_ENGINE_ENABLED !== "1"
  ) {
    return {
      allowed: false,
      reason: "Preview exige EXECUTION_CORE_ENABLED=1, SIM_ENGINE_ENABLED=1 ou TEST_ENGINE_ENABLED=1.",
      warnings,
    };
  }

  if (isAdminActor(opts.actor)) {
    return { allowed: true, warnings };
  }

  const secrets = [
    process.env.EXECUTION_CORE_CLI_SECRET || "",
    process.env.SIM_ENGINE_CLI_SECRET || "",
    process.env.TEST_ENGINE_CLI_SECRET || "",
  ].filter(Boolean);
  const provided = (opts.cliToken || "").trim();

  if (secrets.length && provided && secrets.includes(provided)) {
    return { allowed: true, warnings };
  }

  if (isLocalOrDevelopmentRuntime() && secrets.length === 0) {
    warnings.push(
      "EXECUTION_CORE_CLI_SECRET ausente — localhost permitido com warning (somente development)."
    );
    return { allowed: true, warnings };
  }

  return {
    allowed: false,
    reason: "Execution Core exige ADMIN ou CLI secret válido.",
    warnings,
  };
}
