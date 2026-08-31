/**
 * Domain Change Analyzer — impacto de mudanças Git no domínio THouse.
 *
 * Uso: node --experimental-strip-types scripts/domain-change-analyzer.ts
 *
 * Entrada (somente leitura): git diff, git status, git log -1
 * Saída: reports/domain-guardian/change-analysis.md
 */

import { execFile } from "child_process";
import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, "..");
const REPORTS_DIR = path.join(ROOT, "reports/domain-guardian");
const OUTPUT_PATH = path.join(REPORTS_DIR, "change-analysis.md");
const DOMAIN_MAP_PATH = path.join(ROOT, "docs/ai/domain-map.md");
const DOMAIN_INVARIANTS_PATH = path.join(ROOT, "docs/ai/domain-invariants.md");

type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
type ChangeKind = "modified" | "added" | "deleted" | "renamed" | "untracked" | "unknown";

type EntityProfile = {
  name: string;
  flows: string[];
  invariants: string[];
  guardianChecks: string[];
  files: string[];
};

type FileAnalysis = {
  path: string;
  changeKind: ChangeKind;
  entities: string[];
  flows: string[];
  invariants: string[];
  guardianChecks: string[];
  risk: RiskLevel;
  mappingSource: "domain-map" | "heuristic" | "none";
};

type GitContext = {
  statusPorcelain: string;
  diffUnstaged: string;
  diffStaged: string;
  logOne: string;
  headCommit: string;
  branch: string;
};

const RISK_ORDER: Record<RiskLevel, number> = {
  LOW: 0,
  MEDIUM: 1,
  HIGH: 2,
  CRITICAL: 3,
};

const CRITICAL_INVARIANT_IDS = new Set([
  "F1", "F2", "F3", "F6", "F8",
  "M1",
  "A1", "A2",
  "C1", "C4",
  "P3", "P5",
  "X1", "X2", "X4",
]);

const HIGH_IMPACT_PATH_PATTERNS: Array<{ pattern: RegExp; bump: RiskLevel }> = [
  { pattern: /webhooks\/asaas/i, bump: "CRITICAL" },
  { pattern: /process-payment-webhook/i, bump: "CRITICAL" },
  { pattern: /payment-effects/i, bump: "HIGH" },
  { pattern: /prisma\/schema\.prisma$/i, bump: "CRITICAL" },
  { pattern: /escolher-reembolso/i, bump: "HIGH" },
  { pattern: /coupon-refund/i, bump: "HIGH" },
  { pattern: /symbolic-payment/i, bump: "MEDIUM" },
  { pattern: /simulation-coupon/i, bump: "MEDIUM" },
  { pattern: /meus-dados\/route\.ts$/i, bump: "HIGH" },
  { pattern: /checkout-agendamento/i, bump: "HIGH" },
];

const LOW_IMPACT_PATH_PATTERNS = [
  /^docs\//i,
  /^reports\//i,
  /^scripts\/domain-guardian/i,
  /\.md$/i,
  /^\.github\//i,
];

async function runGit(args: string[]): Promise<string> {
  const { stdout } = await execFileAsync("git", args, {
    cwd: ROOT,
    maxBuffer: 10 * 1024 * 1024,
  });
  return stdout.trimEnd();
}

async function collectGitContext(): Promise<GitContext> {
  const [statusPorcelain, diffUnstaged, diffStaged, logOne, headCommit, branch] =
    await Promise.all([
      runGit(["status", "--porcelain"]),
      runGit(["diff", "--name-status"]),
      runGit(["diff", "--cached", "--name-status"]),
      runGit(["log", "-1", "--pretty=format:%H%n%an <%ae>%n%ad%n%s"]),
      runGit(["rev-parse", "--short", "HEAD"]),
      runGit(["branch", "--show-current"]).catch(() => "HEAD detached"),
    ]);

  return {
    statusPorcelain,
    diffUnstaged,
    diffStaged,
    logOne,
    headCommit,
    branch,
  };
}

function normalizeRepoPath(filePath: string): string {
  return filePath.replace(/\\/g, "/").replace(/^\.\//, "");
}

function parseNameStatusLine(line: string): { kind: ChangeKind; path: string } | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  const rename = trimmed.match(/^R\d+\s+(.+?)\s+(.+)$/);
  if (rename) {
    return { kind: "renamed", path: normalizeRepoPath(rename[2]) };
  }

  const match = trimmed.match(/^([AMD])\s+(.+)$/);
  if (match) {
    const code = match[1];
    const filePath = normalizeRepoPath(match[2]);
    const kind: ChangeKind =
      code === "A" ? "added" : code === "D" ? "deleted" : "modified";
    return { kind, path: filePath };
  }

  return null;
}

function parseStatusPorcelain(line: string): { kind: ChangeKind; path: string } | null {
  if (line.length < 4) return null;
  const x = line[0];
  const y = line[1];
  const filePath = normalizeRepoPath(line.slice(3).trim());
  if (!filePath) return null;

  if (x === "?" && y === "?") return { kind: "untracked", path: filePath };
  if (x === "D" || y === "D") return { kind: "deleted", path: filePath };
  if (x === "A" || y === "A") return { kind: "added", path: filePath };
  if (x === "M" || y === "M" || x === "R" || y === "R") {
    return { kind: "modified", path: filePath };
  }
  return { kind: "unknown", path: filePath };
}

function collectChangedFiles(ctx: GitContext): Map<string, ChangeKind> {
  const files = new Map<string, ChangeKind>();

  const add = (filePath: string, kind: ChangeKind) => {
    const existing = files.get(filePath);
    if (!existing || RISK_ORDER[kind as RiskLevel] === undefined) {
      files.set(filePath, kind);
      return;
    }
    files.set(filePath, kind);
  };

  for (const line of [...ctx.diffUnstaged.split("\n"), ...ctx.diffStaged.split("\n")]) {
    const parsed = parseNameStatusLine(line);
    if (parsed) add(parsed.path, parsed.kind);
  }

  for (const line of ctx.statusPorcelain.split("\n")) {
    const parsed = parseStatusPorcelain(line);
    if (parsed) add(parsed.path, parsed.kind);
  }

  return files;
}

function parseListSection(section: string, label: string): string[] {
  const regex = new RegExp(`\\*\\*${label}:\\*\\*\\s*\\r?\\n([\\s\\S]*?)(?=\\r?\\n\\*\\*|\\r?\\n---|\\r?\\n## |$)`);
  const match = section.match(regex);
  if (!match) return [];

  const items: string[] = [];
  for (const line of match[1].split(/\r?\n/)) {
    const bullet = line.match(/^- (.+)$/);
    if (bullet) items.push(bullet[1].trim().replace(/^`(.+)`$/, "$1"));
  }
  return items;
}

function parseInvariantTokens(raw: string): string[] {
  const tokens = new Set<string>();
  const ranges = raw.match(/[A-Z]\d+(?:\s*[–-]\s*[A-Z]\d+)?/g) ?? [];
  for (const range of ranges) {
    const span = range.match(/^([A-Z])(\d+)\s*[–-]\s*\1(\d+)$/);
    if (span) {
      const letter = span[1];
      const start = Number(span[2]);
      const end = Number(span[3]);
      for (let i = start; i <= end; i++) tokens.add(`${letter}${i}`);
      continue;
    }
    const single = range.match(/^([A-Z]\d+)$/);
    if (single) tokens.add(single[1]);
  }
  return [...tokens];
}

function parseGuardianChecks(raw: string): string[] {
  const checks = new Set<string>();
  for (const token of raw.match(/[A-Z]\d+/g) ?? []) {
    if (/^[FACPXS]\d+$/.test(token)) checks.add(token);
  }
  return [...checks].sort();
}

function parseDomainMap(content: string): EntityProfile[] {
  const entities: EntityProfile[] = [];
  const sections = content.split(/^## /m).slice(1);

  for (const block of sections) {
    const nameMatch = block.match(/^([A-Za-z]+)/);
    if (!nameMatch) continue;
    const name = nameMatch[1];
    if (name === "Matriz" || name === "Referência") continue;

    const files = parseListSection(block, "Arquivos principais");

    const invariantsRaw =
      block.match(/\*\*Invariantes relacionados:\*\*\s*(.+)/)?.[1] ?? "";
    const guardianRaw = block.match(/\*\*Guardian:\*\*\s*(.+)/)?.[1] ?? "";

    entities.push({
      name,
      flows: parseListSection(block, "Fluxos de negócio impactados"),
      invariants: parseInvariantTokens(invariantsRaw),
      guardianChecks: parseGuardianChecks(guardianRaw),
      files,
    });
  }

  const simSection = content.match(/## Referência cruzada — simulação([\s\S]*?)(?:\n---|$)/);
  if (simSection) {
    for (const line of simSection[1].split("\n")) {
      const row = line.match(/^\|[^|]+\|[^|]+\|\s*`([^`]+)`/);
      if (!row) continue;
      const fileRef = row[1].trim();
      for (const entity of entities) {
        if (entity.name === "Payment" || entity.name === "Coupon") {
          if (!entity.files.includes(fileRef)) entity.files.push(fileRef);
        }
      }
    }
    const tableRows = simSection[1].matchAll(/\|[^|]+\|[^|]+\|\s*`([^`]+)`/g);
    for (const row of tableRows) {
      const refs = row[1].split(",").map((s) => s.trim());
      for (const ref of refs) {
        if (ref.includes("symbolic-payment")) {
          const payment = entities.find((e) => e.name === "Payment");
          const meta = entities.find((e) => e.name === "PaymentMetadata");
          for (const entity of [payment, meta]) {
            if (entity && !entity.files.some((f) => f.includes(ref))) {
              entity.files.push(`src/app/lib/${ref}`);
            }
          }
        }
      }
    }
  }

  return entities;
}

function parseInvariantClassifications(content: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const line of content.split("\n")) {
    const match = line.match(/^\|\s*\*\*([A-Z]\d+)\*\*\s*\|[^|]+\|\s*([^|]+)\|/);
    if (!match) continue;
    map.set(match[1], match[2].trim());
  }
  return map;
}

function fileMatchesEntityPath(filePath: string, entityFile: string): boolean {
  const normalized = normalizeRepoPath(filePath);
  const entity = normalizeRepoPath(entityFile);

  if (normalized === entity) return true;
  if (normalized.endsWith(`/${entity}`)) return true;
  if (normalized.endsWith(entity)) return true;

  if (entity.endsWith("/")) {
    return normalized.startsWith(entity);
  }

  const entityBase = path.posix.basename(entity);
  if (normalized.endsWith(`/${entityBase}`)) return true;

  return false;
}

function resolveEntitiesForFile(
  filePath: string,
  entities: EntityProfile[]
): EntityProfile[] {
  const matched: EntityProfile[] = [];
  for (const entity of entities) {
    if (entity.files.some((f) => fileMatchesEntityPath(filePath, f))) {
      matched.push(entity);
    }
  }
  return matched;
}

function applyHeuristics(filePath: string): Partial<FileAnalysis> | null {
  const normalized = normalizeRepoPath(filePath);

  if (LOW_IMPACT_PATH_PATTERNS.some((p) => p.test(normalized))) {
    return {
      entities: [],
      flows: ["Documentação / tooling"],
      invariants: [],
      guardianChecks: [],
      risk: "LOW",
      mappingSource: "heuristic",
    };
  }

  if (/prisma\/schema\.prisma$/i.test(normalized)) {
    return {
      entities: [
        "Payment",
        "PaymentMetadata",
        "Appointment",
        "Coupon",
        "UserPlan",
        "Service",
        "User",
      ],
      flows: ["Schema / migrations", "Todos os fluxos de domínio"],
      invariants: ["F1", "F4", "C1", "X1", "A1", "P2"],
      guardianChecks: ["F1", "F4", "A5", "A8", "C1", "C2", "P2", "X1", "X2"],
      risk: "CRITICAL",
      mappingSource: "heuristic",
    };
  }

  if (/process-payment-webhook/i.test(normalized)) {
    return {
      entities: ["Payment", "PaymentMetadata", "Appointment", "UserPlan"],
      flows: ["Webhook Asaas", "Checkout", "Reembolso"],
      invariants: ["F1", "F3", "F4", "F5", "M3", "M4"],
      guardianChecks: ["F1", "F4"],
      risk: "CRITICAL",
      mappingSource: "heuristic",
    };
  }

  if (/src\/app\/api\/webhooks/i.test(normalized)) {
    return {
      entities: ["Payment", "PaymentMetadata", "Appointment", "UserPlan", "Coupon"],
      flows: ["Webhook Asaas", "Reembolso inbound"],
      invariants: ["F1", "F3", "F7", "F4", "F5"],
      guardianChecks: ["F1", "F4", "P2"],
      risk: "CRITICAL",
      mappingSource: "heuristic",
    };
  }

  return null;
}

function maxRisk(a: RiskLevel, b: RiskLevel): RiskLevel {
  return RISK_ORDER[a] >= RISK_ORDER[b] ? a : b;
}

function calculateFileRisk(params: {
  filePath: string;
  changeKind: ChangeKind;
  invariants: string[];
  guardianChecks: string[];
  invariantClassifications: Map<string, string>;
  hasDomainMapping: boolean;
}): RiskLevel {
  const { filePath, changeKind, invariants, guardianChecks, invariantClassifications, hasDomainMapping } =
    params;

  let risk: RiskLevel = hasDomainMapping ? "MEDIUM" : "LOW";

  for (const id of invariants) {
    if (CRITICAL_INVARIANT_IDS.has(id)) {
      risk = maxRisk(risk, "CRITICAL");
      continue;
    }
    const classification = invariantClassifications.get(id) ?? "";
    if (/CRÍTICO/i.test(classification)) risk = maxRisk(risk, "CRITICAL");
    else if (/ALTO/i.test(classification)) risk = maxRisk(risk, "HIGH");
    else if (/MÉDIO/i.test(classification)) risk = maxRisk(risk, "MEDIUM");
    else risk = maxRisk(risk, "LOW");
  }

  if (guardianChecks.some((c) => ["F1", "X1", "X2", "C1"].includes(c))) {
    risk = maxRisk(risk, "CRITICAL");
  } else if (guardianChecks.some((c) => ["F4", "A8", "C2", "P2"].includes(c))) {
    risk = maxRisk(risk, "HIGH");
  }

  for (const { pattern, bump } of HIGH_IMPACT_PATH_PATTERNS) {
    if (pattern.test(filePath)) risk = maxRisk(risk, bump);
  }

  if (changeKind === "deleted" && hasDomainMapping) {
    risk = maxRisk(risk, "HIGH");
  }

  if (!hasDomainMapping && LOW_IMPACT_PATH_PATTERNS.some((p) => p.test(filePath))) {
    risk = "LOW";
  }

  return risk;
}

function analyzeFile(
  filePath: string,
  changeKind: ChangeKind,
  entities: EntityProfile[],
  invariantClassifications: Map<string, string>
): FileAnalysis {
  const heuristic = applyHeuristics(filePath);
  if (heuristic) {
    return {
      path: filePath,
      changeKind,
      entities: heuristic.entities ?? [],
      flows: heuristic.flows ?? [],
      invariants: heuristic.invariants ?? [],
      guardianChecks: heuristic.guardianChecks ?? [],
      risk: heuristic.risk ?? "LOW",
      mappingSource: heuristic.mappingSource ?? "heuristic",
    };
  }

  const matched = resolveEntitiesForFile(filePath, entities);
  const entityNames = matched.map((e) => e.name);
  const flows = [...new Set(matched.flatMap((e) => e.flows))];
  const invariants = [...new Set(matched.flatMap((e) => e.invariants))].sort();
  const guardianChecks = [...new Set(matched.flatMap((e) => e.guardianChecks))].sort();

  const risk = calculateFileRisk({
    filePath,
    changeKind,
    invariants,
    guardianChecks,
    invariantClassifications,
    hasDomainMapping: matched.length > 0,
  });

  return {
    path: filePath,
    changeKind,
    entities: entityNames,
    flows,
    invariants,
    guardianChecks,
    risk,
    mappingSource: matched.length > 0 ? "domain-map" : "none",
  };
}

function aggregateRisk(analyses: FileAnalysis[]): RiskLevel {
  return analyses.reduce<RiskLevel>(
    (max, item) => maxRisk(max, item.risk),
    "LOW"
  );
}

function formatRiskBadge(risk: RiskLevel): string {
  return risk;
}

function formatList(items: string[], empty = "(nenhum)"): string {
  if (items.length === 0) return empty;
  return items.map((i) => `- ${i}`).join("\n");
}

function buildMarkdown(params: {
  git: GitContext;
  analyses: FileAnalysis[];
  overallRisk: RiskLevel;
}): string {
  const { git, analyses, overallRisk } = params;
  const logLines = git.logOne.split("\n");
  const [commitHash = git.headCommit, author = "", date = "", ...subjectParts] = logLines;
  const subject = subjectParts.join("\n");

  const allEntities = [...new Set(analyses.flatMap((a) => a.entities))].sort();
  const allFlows = [...new Set(analyses.flatMap((a) => a.flows))].sort();
  const allInvariants = [...new Set(analyses.flatMap((a) => a.invariants))].sort();
  const allChecks = [...new Set(analyses.flatMap((a) => a.guardianChecks))].sort();

  const lines: string[] = [
    "# Domain Change Analysis",
    "",
    `**Branch:** ${git.branch}`,
    `**HEAD:** ${git.headCommit}`,
    `**Último commit:** ${commitHash}`,
    `**Autor:** ${author}`,
    `**Data:** ${date}`,
    `**Mensagem:** ${subject}`,
    "",
    "## Contexto Git",
    "",
    "### git status --porcelain",
    "",
    "```",
    git.statusPorcelain || "(working tree clean)",
    "```",
    "",
    "### git diff --name-status (unstaged)",
    "",
    "```",
    git.diffUnstaged || "(nenhum)",
    "```",
    "",
    "### git diff --cached --name-status",
    "",
    "```",
    git.diffStaged || "(nenhum)",
    "```",
    "",
    "### git log -1",
    "",
    "```",
    git.logOne,
    "```",
    "",
    "---",
    "",
    "## Resumo final",
    "",
    `**Risco geral:** ${formatRiskBadge(overallRisk)}`,
    "",
    "**Arquivos alterados:**",
    "",
    formatList(analyses.map((a) => `\`${a.path}\` (${a.changeKind}, ${a.risk})`)),
    "",
    "**Entidades impactadas:**",
    "",
    formatList(allEntities),
    "",
    "**Fluxos impactados:**",
    "",
    formatList(allFlows),
    "",
    "**Invariantes impactados:**",
    "",
    formatList(allInvariants),
    "",
    "**Checks Guardian relacionados:**",
    "",
    formatList(allChecks),
    "",
    "---",
    "",
    "## Análise por arquivo",
    "",
  ];

  if (analyses.length === 0) {
    lines.push("_Nenhum arquivo alterado detectado._");
  } else {
    for (const analysis of analyses.sort((a, b) => RISK_ORDER[b.risk] - RISK_ORDER[a.risk])) {
      lines.push(
        `### \`${analysis.path}\``,
        "",
        `* **Alteração:** ${analysis.changeKind}`,
        `* **Risco:** ${formatRiskBadge(analysis.risk)}`,
        `* **Mapeamento:** ${analysis.mappingSource}`,
        "",
        "**Entidade(s) afetada(s):**",
        "",
        formatList(analysis.entities, "- (não mapeado no domain-map)"),
        "",
        "**Fluxos afetados:**",
        "",
        formatList(analysis.flows, "- (não identificado)"),
        "",
        "**Invariantes relacionados:**",
        "",
        formatList(analysis.invariants, "- (nenhum)"),
        "",
        "**Checks Guardian:**",
        "",
        formatList(analysis.guardianChecks, "- (nenhum)"),
        "",
        "---",
        ""
      );
    }
  }

  lines.push(
    "_Análise somente leitura — nenhuma correção ou alteração de negócio foi executada._",
    "_Fontes: `docs/ai/domain-map.md`, `docs/ai/domain-invariants.md`_"
  );

  return `${lines.join("\n")}\n`;
}

async function main() {
  const [domainMapRaw, invariantsRaw] = await Promise.all([
    readFile(DOMAIN_MAP_PATH, "utf8"),
    readFile(DOMAIN_INVARIANTS_PATH, "utf8"),
  ]);

  const entities = parseDomainMap(domainMapRaw);
  const invariantClassifications = parseInvariantClassifications(invariantsRaw);

  const git = await collectGitContext();
  const changedFiles = collectChangedFiles(git);

  const analyses: FileAnalysis[] = [...changedFiles.entries()]
    .map(([filePath, changeKind]) =>
      analyzeFile(filePath, changeKind, entities, invariantClassifications)
    )
    .sort((a, b) => a.path.localeCompare(b.path));

  const overallRisk = aggregateRisk(analyses);
  const markdown = buildMarkdown({ git, analyses, overallRisk });

  await mkdir(REPORTS_DIR, { recursive: true });
  await writeFile(OUTPUT_PATH, markdown, "utf8");

  console.log(`Change analysis gerado: ${OUTPUT_PATH}`);
  console.log(`Arquivos analisados: ${analyses.length}`);
  console.log(`Risco geral: ${overallRisk}`);
  console.log("");
  console.log(markdown);

  if (overallRisk === "CRITICAL") {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(
    "domain_change_analyzer_error:",
    err instanceof Error ? err.message : err
  );
  process.exitCode = 1;
});
