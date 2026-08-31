/**
 * Domain Guardian Diff — compara latest.json com o relatório anterior.
 *
 * Uso: node --experimental-strip-types scripts/domain-guardian-diff.ts
 */

import { readFile, readdir } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const REPORTS_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../reports/domain-guardian"
);

const TIMESTAMPED_REPORT = /^\d{4}-\d{2}-\d{2}-\d{2}-\d{2}\.json$/;

type CheckCode = "F1" | "F4" | "A5" | "A8" | "C1" | "C2" | "P2" | "X1" | "X2";
type FindingSeverity = "ERROR" | "WARN";

type Finding = {
  id: CheckCode;
  severity: FindingSeverity;
  message: string;
};

type JsonCheckResult = {
  code: CheckCode;
  severity: "OK" | "WARN" | "ERROR";
  scanned: number;
  errorCount: number;
  warningCount: number;
  findings: Finding[];
};

type DomainGuardianReport = {
  generatedAt: string;
  executionMs: number;
  summary: {
    errors: number;
    warnings: number;
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

function formatFindingLine(item: FlatFinding): string {
  return `${item.code}: ${item.message}`;
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

function diffFindings(
  currentItems: FlatFinding[],
  previousItems: FlatFinding[],
  severity: FindingSeverity
) {
  const currentSet = new Set(
    currentItems.filter((i) => i.severity === severity).map((i) => i.key)
  );
  const previousSet = new Set(
    previousItems.filter((i) => i.severity === severity).map((i) => i.key)
  );

  const added = currentItems.filter(
    (i) => i.severity === severity && !previousSet.has(i.key)
  );
  const resolved = previousItems.filter(
    (i) => i.severity === severity && !currentSet.has(i.key)
  );

  return { added, resolved };
}

function sectionLines(label: string, items: FlatFinding[]): string[] {
  if (items.length === 0) return [label, "  (nenhum)"];
  return [label, ...items.map((i) => `  - ${formatFindingLine(i)}`)];
}

function formatDiffReport(params: {
  current: DomainGuardianReport;
  previous: DomainGuardianReport;
  previousPath: string;
  newErrors: FlatFinding[];
  resolvedErrors: FlatFinding[];
  newWarnings: FlatFinding[];
  resolvedWarnings: FlatFinding[];
}): string {
  const {
    current,
    previous,
    previousPath,
    newErrors,
    resolvedErrors,
    newWarnings,
    resolvedWarnings,
  } = params;

  const lines: string[] = [
    "Guardian Diff Report",
    "",
    `Atual:   ${current.generatedAt} (latest.json)`,
    `Anterior: ${previous.generatedAt} (${path.basename(previousPath)})`,
    "",
    ...sectionLines("Novos erros:", newErrors),
    "",
    ...sectionLines("Erros resolvidos:", resolvedErrors),
    "",
    ...sectionLines("Novos alertas:", newWarnings),
    "",
    ...sectionLines("Alertas resolvidos:", resolvedWarnings),
    "",
    "Resumo:",
    `  * ${newErrors.length} erros`,
    `  - ${resolvedErrors.length} erros`,
    `  * ${newWarnings.length} alertas`,
    `  - ${resolvedWarnings.length} alertas`,
    "",
    `  erros:    ${previous.summary.errors} → ${current.summary.errors}`,
    `  alertas:  ${previous.summary.warnings} → ${current.summary.warnings}`,
  ];

  return lines.join("\n");
}

async function main() {
  const latestPath = path.join(REPORTS_DIR, "latest.json");

  let current: DomainGuardianReport;
  try {
    current = await readReport(latestPath);
  } catch {
    console.error(
      "domain_guardian_diff_error: latest.json não encontrado. Execute domain-guardian-audit.ts primeiro."
    );
    process.exitCode = 1;
    return;
  }

  const previousPath = await resolvePreviousReportPath(current);
  if (!previousPath) {
    console.log("Guardian Diff Report");
    console.log("");
    console.log("Primeira execução disponível.");
    console.log("");
    console.log(`Atual: ${current.generatedAt} (latest.json)`);
    console.log(
      `Resumo: ${current.summary.errors} erro(s), ${current.summary.warnings} alerta(s)`
    );
    return;
  }

  const previous = await readReport(previousPath);
  const currentFindings = flattenFindings(current);
  const previousFindings = flattenFindings(previous);

  const { added: newErrors, resolved: resolvedErrors } = diffFindings(
    currentFindings,
    previousFindings,
    "ERROR"
  );
  const { added: newWarnings, resolved: resolvedWarnings } = diffFindings(
    currentFindings,
    previousFindings,
    "WARN"
  );

  console.log(
    formatDiffReport({
      current,
      previous,
      previousPath,
      newErrors,
      resolvedErrors,
      newWarnings,
      resolvedWarnings,
    })
  );

  if (newErrors.length > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(
    "domain_guardian_diff_error:",
    err instanceof Error ? err.message : err
  );
  process.exitCode = 1;
});
