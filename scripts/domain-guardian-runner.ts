/**
 * Domain Guardian Runner — orquestra auditoria, diff e summary operacional.
 *
 * Uso: node --experimental-strip-types scripts/domain-guardian-runner.ts
 */

import { spawn } from "child_process";
import { readFile, writeFile, readdir } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, "..");
const REPORTS_DIR = path.join(ROOT, "reports/domain-guardian");
const LATEST_PATH = path.join(REPORTS_DIR, "latest.json");
const SUMMARY_PATH = path.join(REPORTS_DIR, "summary.md");
const TIMESTAMPED_REPORT = /^\d{4}-\d{2}-\d{2}-\d{2}-\d{2}\.json$/;
const NODE_STRIP_TYPES = ["--experimental-strip-types"];

type CheckCode =
  | "F1"
  | "F4"
  | "A5"
  | "A8"
  | "A9"
  | "C1"
  | "C2"
  | "P2"
  | "X1"
  | "X2"
  | "S1"
  | "S2"
  | "S3"
  | "S4";
type FindingSeverity = "ERROR" | "WARN" | "INFO";
type CheckSeverity = "OK" | "WARN" | "ERROR" | "INFO";
type FinalStatus = "HEALTHY" | "WARNING" | "CRITICAL";

type Finding = {
  id: CheckCode;
  severity: FindingSeverity;
  message: string;
};

type JsonCheckResult = {
  code: CheckCode;
  severity: CheckSeverity;
  scanned: number;
  errorCount: number;
  warningCount: number;
  infoCount: number;
  findings: Finding[];
};

type DomainGuardianReport = {
  generatedAt: string;
  executionMs: number;
  summary: {
    errors: number;
    warnings: number;
    info: number;
    checks: number;
  };
  results: JsonCheckResult[];
};

type FlatFinding = {
  key: string;
  code: CheckCode;
  message: string;
  severity: FindingSeverity;
};

function runNodeScript(scriptName: string): Promise<number> {
  const scriptPath = path.join(SCRIPT_DIR, scriptName);

  return new Promise((resolve, reject) => {
    const child = spawn("node", [...NODE_STRIP_TYPES, scriptPath], {
      cwd: ROOT,
      stdio: "inherit",
      env: process.env,
    });

    child.on("error", reject);
    child.on("close", (code) => resolve(code ?? 1));
  });
}

async function readReport(filePath: string): Promise<DomainGuardianReport> {
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw) as DomainGuardianReport;
}

async function listTimestampedReports(): Promise<string[]> {
  const entries = await readdir(REPORTS_DIR);
  return entries
    .filter((name) => TIMESTAMPED_REPORT.test(name))
    .sort((a, b) => b.localeCompare(a));
}

async function resolvePreviousReportPath(
  current: DomainGuardianReport
): Promise<string | null> {
  const timestamped = await listTimestampedReports();
  if (timestamped.length < 2) return null;

  const newestPath = path.join(REPORTS_DIR, timestamped[0]);
  try {
    const newest = await readReport(newestPath);
    if (newest.generatedAt === current.generatedAt) {
      return path.join(REPORTS_DIR, timestamped[1]);
    }
  } catch {
    // usa o segundo mais recente por nome de arquivo
  }

  return path.join(REPORTS_DIR, timestamped[1]);
}

function findingKey(code: CheckCode, message: string): string {
  return `${code}|${message}`;
}

function flattenFindings(report: DomainGuardianReport): FlatFinding[] {
  const items: FlatFinding[] = [];
  for (const result of report.results) {
    for (const finding of result.findings) {
      items.push({
        key: findingKey(result.code, finding.message),
        code: result.code,
        message: finding.message,
        severity: finding.severity,
      });
    }
  }
  return items;
}

function diffFindings(
  currentItems: FlatFinding[],
  previousItems: FlatFinding[],
  severity: FindingSeverity
) {
  const currentSet = new Set(
    currentItems.filter((item) => item.severity === severity).map((item) => item.key)
  );
  const previousSet = new Set(
    previousItems.filter((item) => item.severity === severity).map((item) => item.key)
  );

  const added = currentItems.filter(
    (item) => item.severity === severity && !previousSet.has(item.key)
  );
  const resolved = previousItems.filter(
    (item) => item.severity === severity && !currentSet.has(item.key)
  );

  return { added, resolved };
}

function formatDatePtBr(iso: string): string {
  const date = new Date(iso);
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "full",
    timeStyle: "medium",
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

function resolveFinalStatus(report: DomainGuardianReport): FinalStatus {
  if (report.summary.errors > 0) return "CRITICAL";
  if (report.summary.warnings > 0) return "WARNING";
  return "HEALTHY";
}

function checksWithProblems(report: DomainGuardianReport): JsonCheckResult[] {
  return report.results.filter(
    (result) =>
      result.severity !== "OK" ||
      result.errorCount > 0 ||
      result.warningCount > 0 ||
      result.infoCount > 0
  );
}

function formatCheckProblemLine(result: JsonCheckResult): string {
  const parts: string[] = [];
  if (result.errorCount > 0) parts.push(`${result.errorCount} erro(s)`);
  if (result.warningCount > 0) parts.push(`${result.warningCount} alerta(s)`);
  if (result.infoCount > 0) parts.push(`${result.infoCount} info`);
  const summary = parts.length > 0 ? ` — ${parts.join(", ")}` : "";
  return `- **${result.code}** (${result.severity})${summary}`;
}

function formatFindingBullets(items: FlatFinding[]): string[] {
  if (items.length === 0) return ["- (nenhum)"];
  return items.map((item) => `- ${item.code}: ${item.message}`);
}

function buildSummaryMarkdown(params: {
  report: DomainGuardianReport;
  previousReport: DomainGuardianReport | null;
  previousPath: string | null;
  newProblems: FlatFinding[];
  resolvedProblems: FlatFinding[];
}): string {
  const { report, previousReport, previousPath, newProblems, resolvedProblems } = params;
  const status = resolveFinalStatus(report);
  const problematicChecks = checksWithProblems(report);

  const lines: string[] = [
    "# Domain Guardian Report",
    "",
    formatDatePtBr(report.generatedAt),
    "",
    "Resumo:",
    "",
    `* Errors: ${report.summary.errors}`,
    `* Warnings: ${report.summary.warnings}`,
    `* Info: ${report.summary.info}`,
    "",
    "Checks com problemas:",
    "",
  ];

  if (problematicChecks.length === 0) {
    lines.push("- (nenhum)");
  } else {
    for (const result of problematicChecks) {
      lines.push(formatCheckProblemLine(result));
      for (const finding of result.findings) {
        lines.push(`  - ${finding.severity}: ${finding.message}`);
      }
    }
  }

  lines.push("", "Novos problemas", "", ...formatFindingBullets(newProblems));
  lines.push("", "Problemas resolvidos", "", ...formatFindingBullets(resolvedProblems));

  if (previousReport && previousPath) {
    lines.push(
      "",
      `Comparado com: ${path.basename(previousPath)} (${formatDatePtBr(previousReport.generatedAt)})`
    );
  } else {
    lines.push("", "Comparado com: (primeira execução — sem baseline anterior)");
  }

  lines.push(
    "",
    "Status final:",
    "",
    status,
    "",
    `Execução: ${report.executionMs} ms · ${report.summary.checks} check(s)`
  );

  return `${lines.join("\n")}\n`;
}

async function main() {
  console.log("Domain Guardian Runner");
  console.log("");

  const auditExitCode = await runNodeScript("domain-guardian-audit.ts");
  if (auditExitCode !== 0) {
    console.warn(
      `[domain-guardian-runner] Auditoria finalizou com código ${auditExitCode}.`
    );
  }

  console.log("");
  const diffExitCode = await runNodeScript("domain-guardian-diff.ts");
  if (diffExitCode !== 0) {
    console.warn(`[domain-guardian-runner] Diff finalizou com código ${diffExitCode}.`);
  }

  console.log("");

  let report: DomainGuardianReport;
  try {
    report = await readReport(LATEST_PATH);
  } catch {
    console.error(
      "domain_guardian_runner_error: latest.json não encontrado após a auditoria."
    );
    process.exitCode = 1;
    return;
  }

  const previousPath = await resolvePreviousReportPath(report);
  const previousReport = previousPath ? await readReport(previousPath) : null;

  const currentFindings = flattenFindings(report);
  const previousFindings = previousReport ? flattenFindings(previousReport) : [];

  const newErrors = previousReport
    ? diffFindings(currentFindings, previousFindings, "ERROR").added
    : currentFindings.filter((item) => item.severity === "ERROR");
  const resolvedErrors = previousReport
    ? diffFindings(currentFindings, previousFindings, "ERROR").resolved
    : [];
  const newWarnings = previousReport
    ? diffFindings(currentFindings, previousFindings, "WARN").added
    : currentFindings.filter((item) => item.severity === "WARN");
  const resolvedWarnings = previousReport
    ? diffFindings(currentFindings, previousFindings, "WARN").resolved
    : [];

  const newProblems = [...newErrors, ...newWarnings];
  const resolvedProblems = [...resolvedErrors, ...resolvedWarnings];

  const summary = buildSummaryMarkdown({
    report,
    previousReport,
    previousPath,
    newProblems,
    resolvedProblems,
  });

  await writeFile(SUMMARY_PATH, summary, "utf8");

  console.log(`Summary gerado: ${SUMMARY_PATH}`);
  console.log("");
  console.log(summary);

  const status = resolveFinalStatus(report);
  if (status === "CRITICAL" || auditExitCode !== 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(
    "domain_guardian_runner_error:",
    err instanceof Error ? err.message : err
  );
  process.exitCode = 1;
});
