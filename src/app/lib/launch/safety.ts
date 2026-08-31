export type ResetTarget = "local" | "preview" | "production";

/**
 * Detecta o alvo do reset.
 * Regra de ouro: URL remota (Neon) sem LAUNCH01_TARGET explícito = production
 * (máximo de confirmações). Preview NÃO pode ser inferido só por VERCEL_ENV se
 * DATABASE_URL apontar para host de produção conhecido.
 */
export function detectResetTarget(dbUrl: string, env: NodeJS.ProcessEnv = process.env): ResetTarget {
  if (/localhost|127\.0\.0\.1/.test(dbUrl)) return "local";

  const explicit = (env.LAUNCH01_TARGET || "").trim().toLowerCase();
  if (explicit === "local") {
    // Nunca tratar host remoto como local
    return "production";
  }
  if (explicit === "preview") return "preview";
  if (explicit === "production") return "production";

  if (env.VERCEL_ENV === "preview") return "preview";
  if (env.VERCEL_ENV === "production") return "production";

  // Remoto sem marcador → production (fail-safe)
  return "production";
}

export type ResetConfirmationResult = { ok: true } | { ok: false; error: string; required: string[] };

/**
 * Confirmações explícitas — nunca executar reset sem flags corretas (GO-01 / LAUNCH-02).
 */
export function validateResetConfirmation(
  target: ResetTarget,
  argv: string[],
  env: NodeJS.ProcessEnv = process.env
): ResetConfirmationResult {
  const execute = argv.includes("--execute");
  if (!execute) return { ok: true };

  if (target === "local") {
    if (!argv.includes("--confirm-local")) {
      return {
        ok: false,
        error: "Reset LOCAL bloqueado: use --execute --confirm-local",
        required: ["--execute", "--confirm-local"],
      };
    }
    return { ok: true };
  }

  if (target === "preview") {
    const required = [
      "--execute",
      "--confirm-preview",
      "LAUNCH01_TARGET=preview",
      "LAUNCH01_CONFIRM_PREVIEW=1",
    ];
    if (env.LAUNCH01_TARGET !== "preview") {
      return { ok: false, error: "Reset PREVIEW bloqueado: defina LAUNCH01_TARGET=preview", required };
    }
    if (env.LAUNCH01_CONFIRM_PREVIEW !== "1") {
      return { ok: false, error: "Reset PREVIEW bloqueado: defina LAUNCH01_CONFIRM_PREVIEW=1", required };
    }
    if (!argv.includes("--confirm-preview")) {
      return { ok: false, error: "Reset PREVIEW bloqueado: use --confirm-preview", required };
    }
    // Anti-acidente: preview apontando para o mesmo host de produção
    const prodHost = (env.LAUNCH01_PRODUCTION_DB_HOST || "").trim().toLowerCase();
    const dbUrl = (env.DATABASE_URL || "").toLowerCase();
    if (prodHost && dbUrl.includes(prodHost)) {
      if (env.LAUNCH01_CONFIRM_PREVIEW_ON_PROD_HOST !== "1") {
        return {
          ok: false,
          error:
            "Reset PREVIEW bloqueado: DATABASE_URL contém LAUNCH01_PRODUCTION_DB_HOST — " +
            "defina LAUNCH01_CONFIRM_PREVIEW_ON_PROD_HOST=1 apenas se for intencional",
          required: [...required, "LAUNCH01_CONFIRM_PREVIEW_ON_PROD_HOST=1"],
        };
      }
    }
    return { ok: true };
  }

  const required = [
    "--execute",
    "--confirm-production",
    "LAUNCH01_CONFIRM_PRODUCTION=1",
    'LAUNCH01_CONFIRM_PHRASE="RESET THOUSE PRODUCTION"',
  ];
  if (env.LAUNCH01_CONFIRM_PRODUCTION !== "1") {
    return { ok: false, error: "Reset PRODUCTION bloqueado: LAUNCH01_CONFIRM_PRODUCTION=1", required };
  }
  if (!argv.includes("--confirm-production")) {
    return { ok: false, error: "Reset PRODUCTION bloqueado: --confirm-production", required };
  }
  if (env.LAUNCH01_CONFIRM_PHRASE !== "RESET THOUSE PRODUCTION") {
    return {
      ok: false,
      error: 'Reset PRODUCTION bloqueado: LAUNCH01_CONFIRM_PHRASE="RESET THOUSE PRODUCTION"',
      required,
    };
  }
  // Exige LAUNCH01_TARGET=production OU ausência de target (default production)
  if (env.LAUNCH01_TARGET && env.LAUNCH01_TARGET !== "production") {
    return {
      ok: false,
      error: `Reset PRODUCTION bloqueado: LAUNCH01_TARGET=${env.LAUNCH01_TARGET} incompatível`,
      required,
    };
  }
  return { ok: true };
}
