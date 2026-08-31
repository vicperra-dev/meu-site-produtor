/**
 * Refactor Agent V1 — Arquiteto especializado em refatoração (read-only).
 *
 * Não modifica código, banco, APIs ou UI.
 * Analisa o projeto e produz plano de refatoração.
 *
 * Uso: node --experimental-strip-types scripts/refactor-agent.ts
 *
 * Saída:
 *   reports/domain-guardian/refactor-report.json
 *   reports/domain-guardian/refactor-report.md
 *
 * Exit code: sempre 0 (agente informativo).
 */

import { execFile } from "child_process";
import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { promisify } from "util";
import { createHash } from "crypto";

const execFileAsync = promisify(execFile);

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, "..");
const GUARDIAN_DIR = path.join(ROOT, "reports/domain-guardian");
const DOCS_DIR = path.join(ROOT, "docs/ai");

const AGENT_VERSION = "1.0.0";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";
type Domain =
  | "Backend"
  | "Frontend"
  | "Financeiro"
  | "Webhook"
  | "Admin"
  | "MinhaConta"
  | "Coupon"
  | "Appointment"
  | "Guardian"
  | "Scripts"
  | "Prisma"
  | "Infraestrutura";

type RefactorIssue = {
  id: string;
  type: string;
  severity: Severity;
  description: string;
  impact: string;
  complexity: "Baixa" | "Média" | "Alta" | "Muito Alta";
  risk: "Baixo" | "Médio" | "Alto" | "Crítico";
  files: string[];
  functions: string[];
  entities: string[];
  flows: string[];
  guardianChecks: string[];
  relatedAdrs: string[];
  dependencies: string[];
  expectedBenefit: string;
  domain: Domain;
  metrics?: Record<string, number | string>;
};

type FileAnalysis = {
  path: string;
  lines: number;
  imports: number;
  exports: string[];
  functions: Array<{ name: string; lines: number; startLine: number }>;
  domains: Domain[];
  entities: string[];
  prismaQueries: string[];
  legacyMarkers: Array<{ kind: string; line: number; text: string }>;
  maxIfDepth: number;
  switchCases: number;
  complexityScore: number;
  importPaths: string[];
};

type RefactorReport = {
  agentVersion: string;
  generatedAt: string;
  language: "pt-BR";
  summary: {
    projectName: string;
    headline: string;
    filesAnalyzed: number;
    issuesFound: number;
    technicalDebtScore: number;
    debtLevel: string;
    topDomains: string[];
    executiveSummary: string;
  };
  technicalDebtScore: {
    score: number;
    level: string;
    breakdown: Record<string, number>;
    formula: string;
  };
  duplications: RefactorIssue[];
  deadCode: RefactorIssue[];
  complexity: RefactorIssue[];
  largeFiles: RefactorIssue[];
  largeFunctions: RefactorIssue[];
  duplicateQueries: RefactorIssue[];
  duplicateHelpers: RefactorIssue[];
  duplicateTypes: RefactorIssue[];
  duplicateSchemas: RefactorIssue[];
  unusedImports: RefactorIssue[];
  unusedFunctions: RefactorIssue[];
  unusedComponents: RefactorIssue[];
  unusedApis: RefactorIssue[];
  unusedScripts: RefactorIssue[];
  legacyCode: RefactorIssue[];
  dependencies: RefactorIssue[];
  coupling: RefactorIssue[];
  quickWins: RefactorIssue[];
  majorRefactors: RefactorIssue[];
  topOpportunities: RefactorIssue[];
  technicalDebtMap: Record<Domain, { score: number; issues: number; topFiles: string[] }>;
  roadmap: {
    sprint1: string[];
    sprint2: string[];
    sprint3: string[];
    sprint4: string[];
  };
  guardian: { status: string; checksRelevant: string[] };
  adrs: Array<{ id: string; title: string; relevance: string }>;
  entities: string[];
  files: FileAnalysis[];
  metrics: {
    totalLines: number;
    filesOver300: number;
    filesOver500: number;
    filesOver800: number;
    filesOver1000: number;
    functionsOver40: number;
    functionsOver80: number;
    functionsOver150: number;
    avgImportsPerFile: number;
    circularDependencies: number;
    legacyMarkerCount: number;
    prismaQueryPatterns: number;
    duplicateBlocks: number;
  };
  recommendations: string[];
  context: { sourcesConsulted: Array<{ path: string; loaded: boolean }> };
  limitations: string[];
};

// ---------------------------------------------------------------------------
// Domain / entity rules
// ---------------------------------------------------------------------------

const DOMAIN_RULES: Array<{ domain: Domain; patterns: RegExp[] }> = [
  { domain: "Financeiro", patterns: [/payment|pagamento|asaas|checkout|refund|symbolic/i] },
  { domain: "Webhook", patterns: [/webhook/i] },
  { domain: "Coupon", patterns: [/coupon|cupom/i] },
  { domain: "Appointment", patterns: [/appointment|agendamento/i] },
  { domain: "MinhaConta", patterns: [/meus-dados|minha-conta|\/conta\//i] },
  { domain: "Admin", patterns: [/src\/app\/admin\//i, /admin-/i] },
  { domain: "Guardian", patterns: [/domain-guardian|domain-decision|reports\/domain-guardian/i, /-agent\.ts$/i] },
  { domain: "Scripts", patterns: [/^scripts\//i] },
  { domain: "Prisma", patterns: [/prisma\//i, /schema\.prisma/i] },
  { domain: "Frontend", patterns: [/\.tsx$/i, /components\//i, /hooks\//i] },
  { domain: "Backend", patterns: [/src\/app\/api\//i, /src\/app\/lib\//i] },
];

const ENTITY_PATTERNS: Array<{ entity: string; patterns: RegExp[] }> = [
  { entity: "Payment", patterns: [/payment|pagamento|asaas|webhook|checkout|symbolic/i] },
  { entity: "Coupon", patterns: [/coupon|cupom/i] },
  { entity: "Appointment", patterns: [/appointment|agendamento/i] },
  { entity: "User", patterns: [/user|usuario|auth|login|conta/i] },
  { entity: "UserPlan", patterns: [/plan|plano/i] },
  { entity: "Service", patterns: [/servico|service/i] },
];

const GUARDIAN_BY_DOMAIN: Partial<Record<Domain, string[]>> = {
  Financeiro: ["F1", "F2", "F3", "F4", "F6", "F8"],
  Webhook: ["F1", "F2", "F3"],
  Coupon: ["C1", "C4", "X1", "X2"],
  Appointment: ["A5", "A8", "A9"],
  MinhaConta: ["A7", "A8"],
  Admin: ["A5", "A9"],
  Guardian: ["F1", "F4", "A5", "A8"],
};

// ---------------------------------------------------------------------------
// I/O
// ---------------------------------------------------------------------------

async function tryReadJson<T>(p: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(p, "utf8")) as T;
  } catch {
    return null;
  }
}

async function tryReadText(p: string): Promise<string | null> {
  try {
    return await readFile(p, "utf8");
  } catch {
    return null;
  }
}

async function runGit(args: string[]): Promise<string> {
  try {
    const { stdout } = await execFileAsync("git", args, { cwd: ROOT, maxBuffer: 20 * 1024 * 1024 });
    return stdout.trimEnd();
  } catch {
    return "";
  }
}

function normalizePath(p: string): string {
  return p.replace(/\\/g, "/").replace(/^\.\//, "");
}

function classifyDomain(filePath: string): Domain[] {
  const n = normalizePath(filePath);
  const domains = new Set<Domain>();
  for (const rule of DOMAIN_RULES) {
    if (rule.patterns.some((p) => p.test(n))) domains.add(rule.domain);
  }
  if (domains.size === 0) {
    if (n.endsWith(".tsx")) domains.add("Frontend");
    else if (n.includes("src/app/api")) domains.add("Backend");
    else domains.add("Infraestrutura");
  }
  return [...domains];
}

function classifyEntities(filePath: string, content: string): string[] {
  const text = filePath + " " + content.slice(0, 2000);
  return ENTITY_PATTERNS.filter((e) => e.patterns.some((p) => p.test(text))).map((e) => e.entity);
}

// ---------------------------------------------------------------------------
// Static analysis
// ---------------------------------------------------------------------------

function countLines(content: string): number {
  return content.split(/\r?\n/).length;
}

function extractImports(content: string): { count: number; paths: string[]; names: Map<string, string> } {
  const paths: string[] = [];
  const names = new Map<string, string>();
  const importRe = /^import\s+(?:type\s+)?(?:(\w+)|{([^}]+)}|\*\s+as\s+(\w+))\s+from\s+['"]([^'"]+)['"]/gm;
  let m: RegExpExecArray | null;
  while ((m = importRe.exec(content)) !== null) {
    const from = m[4];
    paths.push(from);
    if (m[1]) names.set(m[1], from);
    if (m[3]) names.set(m[3], from);
    if (m[2]) {
      for (const part of m[2].split(",")) {
        const alias = part.trim().split(/\s+as\s+/);
        const local = alias[alias.length - 1].trim();
        if (local && local !== "type") names.set(local, from);
      }
    }
  }
  return { count: paths.length, paths, names };
}

function extractExports(content: string): string[] {
  const exports: string[] = [];
  const patterns = [
    /export\s+(?:async\s+)?function\s+(\w+)/g,
    /export\s+const\s+(\w+)/g,
    /export\s+default\s+function\s+(\w+)?/g,
    /export\s+default\s+(\w+)/g,
    /export\s+{\s*([^}]+)\s*}/g,
  ];
  for (const re of patterns.slice(0, 3)) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(content)) !== null) {
      if (m[1]) exports.push(m[1]);
    }
  }
  const blockRe = /export\s+{\s*([^}]+)\s*}/g;
  let bm: RegExpExecArray | null;
  while ((bm = blockRe.exec(content)) !== null) {
    for (const part of bm[1].split(",")) {
      const name = part.trim().split(/\s+as\s+/)[0].trim();
      if (name && name !== "type") exports.push(name);
    }
  }
  if (/export\s+default/.test(content) && !exports.includes("default")) exports.push("default");
  return [...new Set(exports)];
}

function extractFunctions(content: string): Array<{ name: string; lines: number; startLine: number }> {
  const lines = content.split(/\r?\n/);
  const results: Array<{ name: string; lines: number; startLine: number }> = [];
  const sigPatterns = [
    /^(?:export\s+)?(?:async\s+)?function\s+(\w+)/,
    /^(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s+)?\(/,
    /^(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s+)?function/,
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let name: string | null = null;
    for (const pat of sigPatterns) {
      const m = line.match(pat);
      if (m) {
        name = m[1];
        break;
      }
    }
    if (!name) continue;

    let braceLine = i;
    let foundBrace = line.includes("{");
    while (!foundBrace && braceLine < lines.length - 1) {
      braceLine++;
      if (lines[braceLine].includes("{")) foundBrace = true;
    }
    if (!foundBrace) continue;

    let depth = 0;
    let started = false;
    let endLine = braceLine;
    for (let j = braceLine; j < lines.length; j++) {
      for (const ch of lines[j]) {
        if (ch === "{") {
          depth++;
          started = true;
        } else if (ch === "}") {
          depth--;
        }
      }
      endLine = j;
      if (started && depth === 0) break;
    }
    results.push({ name, lines: endLine - i + 1, startLine: i + 1 });
  }
  return results;
}

function extractPrismaQueries(content: string): string[] {
  const queries: string[] = [];
  const re = /prisma\.(\w+)\.(\w+)\s*\(/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    queries.push(`${m[1]}.${m[2]}`);
  }
  return queries;
}

function normalizePrismaPattern(content: string, index: number): string {
  const slice = content.slice(Math.max(0, index - 20), index + 200);
  return slice
    .replace(/\s+/g, " ")
    .replace(/['"`][^'"`]*['"`]/g, "STR")
    .replace(/\b\d+\b/g, "N")
    .slice(0, 120);
}

function findLegacyMarkers(content: string): Array<{ kind: string; line: number; text: string }> {
  const markers: Array<{ kind: string; line: number; text: string }> = [];
  const lines = content.split(/\r?\n/);
  const kinds = ["@legacy", "deprecated", "TODO", "FIXME", "HACK"];
  lines.forEach((line, i) => {
    for (const kind of kinds) {
      if (line.toLowerCase().includes(kind.toLowerCase())) {
        markers.push({ kind, line: i + 1, text: line.trim().slice(0, 100) });
      }
    }
  });
  return markers;
}

function maxIfNestingDepth(content: string): number {
  const lines = content.split(/\r?\n/);
  let max = 0;
  let current = 0;
  for (const line of lines) {
    const opens = (line.match(/\bif\s*\(/g) ?? []).length;
    const closes = (line.match(/^\s*}/g) ?? []).length;
    current += opens;
    max = Math.max(max, current);
    current = Math.max(0, current - closes);
  }
  return max;
}

function countSwitchCases(content: string): number {
  const matches = content.match(/\bcase\s+/g);
  return matches?.length ?? 0;
}

function cyclomaticComplexity(content: string): number {
  const patterns = [/\bif\s*\(/g, /\belse\s+if\s*\(/g, /\bfor\s*\(/g, /\bwhile\s*\(/g, /\bcase\s+/g, /\bcatch\s*\(/g, /&&/g, /\|\|/g, /\?/g];
  let score = 1;
  for (const p of patterns) {
    score += (content.match(p) ?? []).length;
  }
  return score;
}

function hashNormalized(text: string): string {
  const norm = text.replace(/\s+/g, " ").replace(/['"`][^'"`]*['"`]/g, "'X'").trim();
  return createHash("md5").update(norm).digest("hex").slice(0, 12);
}

function extractCodeBlocks(content: string, minLines = 10): Array<{ hash: string; lines: number; preview: string; startLine: number }> {
  const lines = content.split(/\r?\n/);
  const blocks: Array<{ hash: string; lines: number; preview: string; startLine: number }> = [];
  for (let i = 0; i < lines.length - minLines; i += minLines) {
    const chunk = lines.slice(i, i + minLines).join("\n");
    if (chunk.trim().length < 120) continue;
    if (!/[;{}=(]/.test(chunk)) continue;
    // Ignorar blocos genéricos (imports, exports, braces)
    if (/^(import |export |{\s*$|}\s*$|\/\/)/m.test(chunk.trim())) continue;
    blocks.push({
      hash: hashNormalized(chunk),
      lines: minLines,
      preview: chunk.trim().slice(0, 80),
      startLine: i + 1,
    });
  }
  return blocks;
}

function resolveRelativeImport(fromFile: string, importPath: string): string | null {
  if (!importPath.startsWith(".")) return null;
  const dir = path.dirname(fromFile);
  let resolved = path.normalize(path.join(dir, importPath)).replace(/\\/g, "/");
  const exts = ["", ".ts", ".tsx", ".js", ".mjs"];
  for (const ext of exts) {
    const candidate = resolved + ext;
    if (candidate.startsWith("src/") || candidate.startsWith("scripts/")) return candidate;
  }
  if (resolved.startsWith("src/") || resolved.startsWith("scripts/")) return resolved;
  return null;
}

function apiRouteToPath(filePath: string): string {
  const n = normalizePath(filePath);
  const m = n.match(/src\/app\/api\/(.+)\/route\.(ts|tsx)$/);
  if (!m) return "";
  return "/api/" + m[1].replace(/\/+/g, "/");
}

// ---------------------------------------------------------------------------
// Issue builders
// ---------------------------------------------------------------------------

let issueCounter = 0;
function nextId(prefix: string): string {
  issueCounter++;
  return `${prefix}-${issueCounter}`;
}

function makeIssue(partial: Omit<RefactorIssue, "id"> & { id?: string }): RefactorIssue {
  return { id: partial.id ?? nextId("RF"), ...partial } as RefactorIssue;
}

function impactScore(issue: RefactorIssue): number {
  const sev: Record<Severity, number> = { CRITICAL: 100, HIGH: 75, MEDIUM: 50, LOW: 25, INFO: 10 };
  const risk: Record<string, number> = { Crítico: 20, Alto: 15, Médio: 10, Baixo: 5 };
  const comp: Record<string, number> = { "Muito Alta": -10, Alta: -5, Média: 0, Baixa: 10 };
  return sev[issue.severity] + (risk[issue.risk] ?? 0) + (comp[issue.complexity] ?? 0);
}

// ---------------------------------------------------------------------------
// Analysis pipeline
// ---------------------------------------------------------------------------

async function analyzeProject(
  sourceFiles: string[],
  allContents: Map<string, string>,
  knowledgeGraph: Record<string, unknown> | null,
  adrs: Record<string, unknown> | null
): Promise<{
  fileAnalyses: FileAnalysis[];
  issues: RefactorIssue[];
  importGraph: Map<string, Set<string>>;
  exportRegistry: Map<string, Set<string>>;
  apiRoutes: Map<string, string>;
}> {
  const issues: RefactorIssue[] = [];
  const fileAnalyses: FileAnalysis[] = [];
  const importGraph = new Map<string, Set<string>>();
  const exportRegistry = new Map<string, Set<string>>();
  const apiRoutes = new Map<string, string>();
  const blockIndex = new Map<string, Array<{ file: string; startLine: number; preview: string }>>();
  const prismaPatterns = new Map<string, Array<{ file: string; snippet: string }>>();
  const helperNames = new Map<string, string[]>();

  const kgEntities = (knowledgeGraph as { entities?: Array<{ name: string; files: string[] }> } | null)?.entities ?? [];
  const entityFileMap = new Map<string, string[]>();
  for (const e of kgEntities) entityFileMap.set(e.name, e.files.map(normalizePath));

  const adrList = (adrs as { decisions?: Array<{ id: string; title: string; files?: string[] }> } | null)?.decisions ?? [];

  for (const filePath of sourceFiles) {
    const content = allContents.get(filePath) ?? "";
    const lines = countLines(content);
    const { count: imports, paths: importPaths, names: importedNames } = extractImports(content);
    const exports = extractExports(content);
    const functions = extractFunctions(content);
    const domains = classifyDomain(filePath);
    const entities = classifyEntities(filePath, content);
    const prismaQueries = extractPrismaQueries(content);
    const legacyMarkers = findLegacyMarkers(content);
    const maxIfDepth = maxIfNestingDepth(content);
    const switchCases = countSwitchCases(content);
    const complexityScore = cyclomaticComplexity(content);

    exportRegistry.set(filePath, new Set(exports));

    const resolvedImports = new Set<string>();
    for (const imp of importPaths) {
      const resolved = resolveRelativeImport(filePath, imp);
      if (resolved) {
        resolvedImports.add(resolved);
        if (!importGraph.has(filePath)) importGraph.set(filePath, new Set());
        importGraph.get(filePath)!.add(resolved);
      }
    }

    const apiPath = apiRouteToPath(filePath);
    if (apiPath) apiRoutes.set(filePath, apiPath);

    fileAnalyses.push({
      path: filePath,
      lines,
      imports,
      exports,
      functions,
      domains,
      entities,
      prismaQueries,
      legacyMarkers,
      maxIfDepth,
      switchCases,
      complexityScore,
      importPaths,
    });

    // Large files
    const thresholds = [
      { lines: 1000, sev: "CRITICAL" as Severity },
      { lines: 800, sev: "HIGH" as Severity },
      { lines: 500, sev: "HIGH" as Severity },
      { lines: 300, sev: "MEDIUM" as Severity },
    ];
    for (const t of thresholds) {
      if (lines >= t.lines) {
        issues.push(
          makeIssue({
            type: "large_file",
            severity: t.sev,
            description: `Arquivo com ${lines} linhas (limite sugerido: ${t.lines})`,
            impact: "Dificulta revisão, testes e manutenção; aumenta risco de regressão",
            complexity: lines >= 800 ? "Alta" : "Média",
            risk: domains.includes("Financeiro") || domains.includes("Webhook") ? "Alto" : "Médio",
            files: [filePath],
            functions: functions.slice(0, 5).map((f) => f.name),
            entities,
            flows: [],
            guardianChecks: domains.flatMap((d) => GUARDIAN_BY_DOMAIN[d] ?? []),
            relatedAdrs: adrList.filter((a) => a.files?.some((f) => normalizePath(f) === filePath)).map((a) => a.id),
            dependencies: [],
            expectedBenefit: `Dividir em módulos menores; meta < ${Math.floor(t.lines * 0.6)} linhas`,
            domain: domains[0] ?? "Backend",
            metrics: { lines, threshold: t.lines },
          })
        );
        break;
      }
    }

    // Large functions
    for (const fn of functions) {
      const fnThresholds = [
        { lines: 150, sev: "HIGH" as Severity },
        { lines: 80, sev: "MEDIUM" as Severity },
        { lines: 40, sev: "LOW" as Severity },
      ];
      for (const t of fnThresholds) {
        if (fn.lines >= t.lines) {
          issues.push(
            makeIssue({
              type: "large_function",
              severity: t.sev,
              description: `Função ${fn.name} com ${fn.lines} linhas (limite: ${t.lines})`,
              impact: "Alta complexidade ciclomática provável; difícil testar isoladamente",
              complexity: fn.lines >= 80 ? "Alta" : "Média",
              risk: filePath.includes("webhook") || filePath.includes("payment") ? "Alto" : "Médio",
              files: [filePath],
              functions: [fn.name],
              entities,
              flows: [],
              guardianChecks: domains.flatMap((d) => GUARDIAN_BY_DOMAIN[d] ?? []),
              relatedAdrs: [],
              dependencies: [],
              expectedBenefit: "Extrair subfunções puras e testáveis",
              domain: domains[0] ?? "Backend",
              metrics: { lines: fn.lines, startLine: fn.startLine },
            })
          );
          break;
        }
      }
    }

    // Many imports
    if (imports >= 15) {
      issues.push(
        makeIssue({
          type: "high_import_count",
          severity: imports >= 25 ? "HIGH" : "MEDIUM",
          description: `${imports} imports — possível God Module`,
          impact: "Acoplamento alto; mudanças propagam efeitos colaterais",
          complexity: "Média",
          risk: "Médio",
          files: [filePath],
          functions: [],
          entities,
          flows: [],
          guardianChecks: [],
          relatedAdrs: [],
          dependencies: importPaths.slice(0, 10),
          expectedBenefit: "Agrupar imports por domínio; extrair facade",
          domain: domains[0] ?? "Backend",
          metrics: { imports },
        })
      );
    }

    // Complexity
    if (complexityScore >= 40 || maxIfDepth >= 5) {
      issues.push(
        makeIssue({
          type: "excessive_complexity",
          severity: complexityScore >= 60 ? "HIGH" : "MEDIUM",
          description: `Complexidade ciclomática ~${complexityScore}, if depth ${maxIfDepth}`,
          impact: "Bugs por caminhos não testados; duplicação de lógica em branches",
          complexity: "Alta",
          risk: domains.includes("Financeiro") ? "Alto" : "Médio",
          files: [filePath],
          functions: functions.filter((f) => f.lines > 40).map((f) => f.name),
          entities,
          flows: [],
          guardianChecks: domains.flatMap((d) => GUARDIAN_BY_DOMAIN[d] ?? []),
          relatedAdrs: [],
          dependencies: [],
          expectedBenefit: "Early return, strategy pattern ou tabela de decisão",
          domain: domains[0] ?? "Backend",
          metrics: { complexityScore, maxIfDepth },
        })
      );
    }

    // Giant switch
    if (switchCases >= 8) {
      issues.push(
        makeIssue({
          type: "large_switch",
          severity: switchCases >= 15 ? "HIGH" : "MEDIUM",
          description: `Switch com ${switchCases} cases`,
          impact: "Cada case novo aumenta risco; difícil garantir exhaustiveness",
          complexity: "Média",
          risk: "Médio",
          files: [filePath],
          functions: [],
          entities,
          flows: [],
          guardianChecks: [],
          relatedAdrs: [],
          dependencies: [],
          expectedBenefit: "Substituir por mapa de handlers ou polimorfismo",
          domain: domains[0] ?? "Backend",
          metrics: { switchCases },
        })
      );
    }

    // Legacy markers
    for (const marker of legacyMarkers) {
      issues.push(
        makeIssue({
          type: "legacy_code",
          severity: marker.kind === "@legacy" || marker.kind === "deprecated" ? "MEDIUM" : "LOW",
          description: `${marker.kind} na linha ${marker.line}`,
          impact: "Código legado pode divergir das regras atuais do domínio",
          complexity: "Baixa",
          risk: marker.kind === "@legacy" ? "Médio" : "Baixo",
          files: [filePath],
          functions: [],
          entities,
          flows: [],
          guardianChecks: marker.kind === "@legacy" ? ["S4", "A1", "A2"] : [],
          relatedAdrs: marker.kind === "@legacy" ? ["ADR-010"] : [],
          dependencies: [],
          expectedBenefit: "Remover ou documentar plano de migração",
          domain: domains[0] ?? "Backend",
          metrics: { line: marker.line },
        })
      );
    }

    // Duplicate blocks
    for (const block of extractCodeBlocks(content)) {
      if (!blockIndex.has(block.hash)) blockIndex.set(block.hash, []);
      blockIndex.get(block.hash)!.push({ file: filePath, startLine: block.startLine, preview: block.preview });
    }

    // Prisma patterns
    const prismaRe = /prisma\.(\w+)\.(\w+)\s*\(/g;
    let pm: RegExpExecArray | null;
    while ((pm = prismaRe.exec(content)) !== null) {
      const key = `${pm[1]}.${pm[2]}`;
      const snippet = normalizePrismaPattern(content, pm.index);
      if (!prismaPatterns.has(snippet)) prismaPatterns.set(snippet, []);
      prismaPatterns.get(snippet)!.push({ file: filePath, snippet: key });
    }

    // Helper name tracking
    for (const fn of functions) {
      if (!helperNames.has(fn.name)) helperNames.set(fn.name, []);
      helperNames.get(fn.name)!.push(filePath);
    }

    // Unused imports heuristic (somente alta confiança)
    for (const [name, fromPath] of importedNames) {
      if (fromPath.includes("type") || name === "type" || name.startsWith("React")) continue;
      const usageRe = new RegExp(`\\b${name}\\b`);
      const importLines = content.split(/\r?\n/).filter((l) => l.startsWith("import")).join("\n");
      const body = content.replace(importLines, "");
      const count = (body.match(usageRe) ?? []).length;
      if (count === 0 && name.length > 2) {
        issues.push(
          makeIssue({
            type: "unused_import",
            severity: "LOW",
            description: `Import '${name}' possivelmente não utilizado`,
            impact: "Ruído e bundle desnecessário",
            complexity: "Baixa",
            risk: "Baixo",
            files: [filePath],
            functions: [name],
            entities: [],
            flows: [],
            guardianChecks: [],
            relatedAdrs: [],
            dependencies: [],
            expectedBenefit: "Remover import morto",
            domain: domains[0] ?? "Backend",
          })
        );
      }
    }
  }

  // Duplicate code blocks across files (top grupos por impacto)
  const dupCandidates: RefactorIssue[] = [];
  for (const [hash, occurrences] of blockIndex) {
    const uniqueFiles = [...new Set(occurrences.map((o) => o.file))];
    if (uniqueFiles.length < 2) continue;
    // Ignorar duplicações triviais em agentes/scripts boilerplate
    const agentOnly = uniqueFiles.every((f) => f.includes("-agent.ts") || f.includes("domain-guardian"));
    if (agentOnly && uniqueFiles.length < 4) continue;
    const domains = classifyDomain(uniqueFiles[0]);
    dupCandidates.push(
      makeIssue({
        type: "duplicated_code",
        severity: uniqueFiles.length >= 4 ? "HIGH" : uniqueFiles.length >= 3 ? "MEDIUM" : "LOW",
        description: `Bloco de código duplicado em ${uniqueFiles.length} arquivos`,
        impact: "Correções precisam ser replicadas; risco de divergência e bugs",
        complexity: "Média",
        risk: domains.includes("Financeiro") ? "Alto" : "Médio",
        files: uniqueFiles,
        functions: [],
        entities: classifyEntities(uniqueFiles[0], allContents.get(uniqueFiles[0]) ?? ""),
        flows: [],
        guardianChecks: domains.flatMap((d) => GUARDIAN_BY_DOMAIN[d] ?? []),
        relatedAdrs: [],
        dependencies: [],
        expectedBenefit: "Extrair helper compartilhado",
        domain: domains[0] ?? "Backend",
        metrics: { hash, occurrences: occurrences.length, fileCount: uniqueFiles.length },
      })
    );
  }
  dupCandidates.sort((a, b) => (Number(b.metrics?.fileCount) || 0) - (Number(a.metrics?.fileCount) || 0));
  issues.push(...dupCandidates.slice(0, 80));

  // Duplicate helpers (same function name in multiple lib files) — limitar
  const helperCandidates: RefactorIssue[] = [];
  for (const [name, files] of helperNames) {
    const libFiles = files.filter((f) => f.includes("/lib/") && !f.includes("-agent"));
    const unique = [...new Set(libFiles)];
    if (unique.length >= 2 && name.length > 4 && !name.startsWith("use") && !name.startsWith("handle")) {
      helperCandidates.push(
        makeIssue({
          type: "duplicate_helper",
          severity: unique.length >= 3 ? "MEDIUM" : "LOW",
          description: `Função '${name}' definida em ${unique.length} arquivos lib`,
          impact: "Helpers equivalentes podem ter comportamentos divergentes",
          complexity: "Média",
          risk: "Médio",
          files: unique,
          functions: [name],
          entities: [],
          flows: [],
          guardianChecks: [],
          relatedAdrs: [],
          dependencies: [],
          expectedBenefit: "Unificar em único módulo de domínio",
          domain: classifyDomain(unique[0])[0] ?? "Backend",
          metrics: { fileCount: unique.length },
        })
      );
    }
  }
  helperCandidates.sort((a, b) => (Number(b.metrics?.fileCount) || 0) - (Number(a.metrics?.fileCount) || 0));
  issues.push(...helperCandidates.slice(0, 30));

  // Duplicate prisma queries (top 40)
  const prismaCandidates: RefactorIssue[] = [];
  for (const [snippet, occurrences] of prismaPatterns) {
    const uniqueFiles = [...new Set(occurrences.map((o) => o.file))];
    if (uniqueFiles.length < 2) continue;
    prismaCandidates.push(
      makeIssue({
        type: "duplicate_prisma_query",
        severity: uniqueFiles.length >= 3 ? "MEDIUM" : "LOW",
        description: `Query Prisma similar (${occurrences[0].snippet}) em ${uniqueFiles.length} arquivos`,
        impact: "Mudança de schema exige atualização em múltiplos pontos",
        complexity: "Média",
        risk: "Médio",
        files: uniqueFiles,
        functions: [],
        entities: ["Payment", "Appointment", "Coupon", "User"].filter((e) => snippet.toLowerCase().includes(e.toLowerCase())),
        flows: [],
        guardianChecks: ["F1", "F4", "A8"],
        relatedAdrs: ["ADR-014"],
        dependencies: [],
        expectedBenefit: "Repository pattern ou query helpers centralizados",
        domain: "Prisma",
        metrics: { pattern: occurrences[0].snippet, fileCount: uniqueFiles.length },
      })
    );
  }
  prismaCandidates.sort((a, b) => (Number(b.metrics?.fileCount) || 0) - (Number(a.metrics?.fileCount) || 0));
  issues.push(...prismaCandidates.slice(0, 40));

  // Circular dependencies
  const cycles = findCycles(importGraph);
  for (const cycle of cycles.slice(0, 20)) {
    issues.push(
      makeIssue({
        type: "circular_dependency",
        severity: "HIGH",
        description: `Dependência circular: ${cycle.join(" → ")}`,
        impact: "Dificulta tree-shaking, testes e refatoração incremental",
        complexity: "Alta",
        risk: "Alto",
        files: cycle,
        functions: [],
        entities: [],
        flows: [],
        guardianChecks: [],
        relatedAdrs: ["ADR-011"],
        dependencies: cycle,
        expectedBenefit: "Introduzir camada de interfaces ou inverter dependência",
        domain: "Backend",
      })
    );
  }

  // Unused exports (somente lib e hooks, alta confiança)
  const allContentJoined = [...allContents.values()].join("\n");
  const unusedCandidates: RefactorIssue[] = [];
  for (const [filePath, exports] of exportRegistry) {
    if (!filePath.includes("/lib/") && !filePath.includes("/hooks/")) continue;
    if (filePath.includes("/api/")) continue;
    for (const exp of exports) {
      if (exp === "default" || ["GET", "POST", "PATCH", "DELETE", "PUT"].includes(exp)) continue;
      if (exp.length < 4) continue;
      const defPattern = new RegExp(`export\\s+(?:async\\s+)?(?:function|const)\\s+${exp}\\b`);
      const definitionCount = (allContentJoined.match(defPattern) ?? []).length;
      const usageCount = (allContentJoined.match(new RegExp(`\\b${exp}\\b`, "g")) ?? []).length;
      if (usageCount <= definitionCount) {
        const kind = filePath.includes("hooks/") ? "unused_hook" : "unused_function";
        unusedCandidates.push(
          makeIssue({
            type: kind,
            severity: "LOW",
            description: `'${exp}' exportado em lib/hook mas referenciado ~${Math.max(0, usageCount - definitionCount)}x fora da definição`,
            impact: "Código morto dificulta navegação",
            complexity: "Baixa",
            risk: "Baixo",
            files: [filePath],
            functions: [exp],
            entities: [],
            flows: [],
            guardianChecks: [],
            relatedAdrs: [],
            dependencies: [],
            expectedBenefit: "Remover export não utilizado",
            domain: filePath.includes("hooks/") ? "Frontend" : classifyDomain(filePath)[0],
          })
        );
      }
    }
  }
  issues.push(...unusedCandidates.slice(0, 40));

  // Unused components
  for (const [filePath, exports] of exportRegistry) {
    if (!filePath.endsWith(".tsx") || !filePath.includes("/components/")) continue;
    if (!exports.has("default")) continue;
    const compName = path.basename(filePath, path.extname(filePath));
    const importPattern = new RegExp(`from\\s+['"][^'"]*${compName}['"]|import\\s+${compName}\\b|<${compName}[\\s/>]`);
    if (!importPattern.test(allContentJoined)) {
      issues.push(
        makeIssue({
          type: "unused_component",
          severity: "LOW",
          description: `Componente ${compName} possivelmente não referenciado`,
          impact: "Código morto no bundle",
          complexity: "Baixa",
          risk: "Baixo",
          files: [filePath],
          functions: [compName],
          entities: [],
          flows: [],
          guardianChecks: [],
          relatedAdrs: [],
          dependencies: [],
          expectedBenefit: "Remover ou documentar uso dinâmico",
          domain: "Frontend",
        })
      );
    }
  }

  // Unused API routes
  for (const [filePath, apiPath] of apiRoutes) {
    const segments = apiPath.replace("/api/", "").split("/");
    const searchTerms = [apiPath, ...segments.filter((s) => s.length > 3 && !s.startsWith("["))];
    const referenced = searchTerms.some((term) => {
      if (term.length < 4) return false;
      return [...allContents.entries()].some(([fp, c]) => fp !== filePath && c.includes(term));
    });
    if (!referenced && !apiPath.includes("debug") && !apiPath.includes("cron") && !apiPath.includes("webhook")) {
      issues.push(
        makeIssue({
          type: "unused_api",
          severity: "MEDIUM",
          description: `Rota ${apiPath} sem referência detectada no código`,
          impact: "API órfã — manutenção sem uso ou chamada apenas externa",
          complexity: "Baixa",
          risk: "Baixo",
          files: [filePath],
          functions: ["GET", "POST", "PATCH", "DELETE"].filter((m) => (allContents.get(filePath) ?? "").includes(`export async function ${m}`)),
          entities: classifyEntities(filePath, allContents.get(filePath) ?? ""),
          flows: [],
          guardianChecks: [],
          relatedAdrs: [],
          dependencies: [],
          expectedBenefit: "Confirmar uso e remover ou documentar",
          domain: "Backend",
        })
      );
    }
  }

  // Obsolete scripts heuristic
  for (const filePath of sourceFiles.filter((f) => f.startsWith("scripts/") && !f.includes("agent"))) {
    const base = path.basename(filePath);
    if (/inspect-|repair-|debug|reset/i.test(base)) {
      const referenced = allContentJoined.includes(base) || allContentJoined.includes(base.replace(/\.mjs$/, ""));
      if (!referenced) {
        issues.push(
          makeIssue({
            type: "obsolete_script",
            severity: "INFO",
            description: `Script utilitário ${base} sem referência no código`,
            impact: "Pode ser script one-off de manutenção",
            complexity: "Baixa",
            risk: "Baixo",
            files: [filePath],
            functions: [],
            entities: [],
            flows: [],
            guardianChecks: [],
            relatedAdrs: [],
            dependencies: [],
            expectedBenefit: "Mover para docs/ops ou remover se obsoleto",
            domain: "Scripts",
          })
        );
      }
    }
  }

  return { fileAnalyses, issues, importGraph, exportRegistry, apiRoutes };
}

function findCycles(graph: Map<string, Set<string>>): string[][] {
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const stack = new Set<string>();
  const path: string[] = [];

  function dfs(node: string): void {
    if (stack.has(node)) {
      const idx = path.indexOf(node);
      if (idx >= 0) cycles.push([...path.slice(idx), node]);
      return;
    }
    if (visited.has(node)) return;
    visited.add(node);
    stack.add(node);
    path.push(node);
    for (const next of graph.get(node) ?? []) {
      dfs(next);
    }
    path.pop();
    stack.delete(node);
  }

  for (const node of graph.keys()) dfs(node);
  return cycles;
}

function computeDebtScore(issues: RefactorIssue[], metrics: RefactorReport["metrics"]): RefactorReport["technicalDebtScore"] {
  const weights: Record<Severity, number> = { CRITICAL: 8, HIGH: 5, MEDIUM: 2, LOW: 0.5, INFO: 0.1 };
  const breakdown: Record<string, number> = {
    largeFiles: metrics.filesOver1000 * 10 + metrics.filesOver800 * 6 + metrics.filesOver500 * 3 + metrics.filesOver300 * 1,
    largeFunctions: metrics.functionsOver150 * 2 + metrics.functionsOver80 * 1 + metrics.functionsOver40 * 0.3,
    duplications: Math.min(metrics.duplicateBlocks, 30) * 2,
    deadCode: issues.filter((i) => i.type.includes("unused") || i.type === "obsolete_script").length * 0.2,
    complexity: issues.filter((i) => i.type.includes("complex") || i.type === "large_switch").length * 0.5,
    legacy: metrics.legacyMarkerCount * 0.5,
    dependencies: metrics.circularDependencies * 15 + issues.filter((i) => i.type === "high_import_count").length * 0.5,
    other: 0,
  };

  const raw = Object.values(breakdown).reduce((a, b) => a + b, 0);
  const score = Math.min(100, Math.round(raw));

  let level = "Baixo";
  if (score >= 75) level = "Crítico";
  else if (score >= 55) level = "Alto";
  else if (score >= 35) level = "Médio";

  return {
    score,
    level,
    breakdown,
    formula: "files grandes (300–1000+) + funções grandes + duplicações + legacy + deps circulares; cap 100",
  };
}

function buildTechnicalDebtMap(issues: RefactorIssue[]): Record<Domain, { score: number; issues: number; topFiles: string[] }> {
  const domains: Domain[] = [
    "Backend", "Frontend", "Financeiro", "Webhook", "Admin", "MinhaConta",
    "Coupon", "Appointment", "Guardian", "Scripts", "Prisma", "Infraestrutura",
  ];
  const map = {} as Record<Domain, { score: number; issues: number; topFiles: string[] }>;
  const weights: Record<Severity, number> = { CRITICAL: 8, HIGH: 5, MEDIUM: 2, LOW: 0.5, INFO: 0.1 };

  for (const d of domains) {
    const domainIssues = issues.filter((i) => i.domain === d);
    const fileCounts = new Map<string, number>();
    for (const i of domainIssues) {
      for (const f of i.files) fileCounts.set(f, (fileCounts.get(f) ?? 0) + 1);
    }
    const topFiles = [...fileCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([f]) => f);
    map[d] = {
      score: Math.min(100, Math.round(domainIssues.reduce((s, i) => s + weights[i.severity], 0))),
      issues: domainIssues.length,
      topFiles,
    };
  }
  return map;
}

function heatBar(score: number): string {
  const filled = Math.round(score / 10);
  return "█".repeat(filled) + "░".repeat(10 - filled);
}

// ---------------------------------------------------------------------------
// Markdown
// ---------------------------------------------------------------------------

function buildMarkdown(report: RefactorReport): string {
  const L: string[] = [];
  L.push(`# Refactor Report — ${report.summary.projectName}`);
  L.push("");
  L.push(`**Gerado em:** ${report.generatedAt}`);
  L.push(`**Dívida técnica:** ${report.technicalDebtScore.score}/100 (${report.technicalDebtScore.level})`);
  L.push("");
  L.push("---");
  L.push("");
  L.push("## Resumo Executivo");
  L.push("");
  L.push(report.summary.executiveSummary);
  L.push("");
  L.push("| Métrica | Valor |");
  L.push("|---------|-------|");
  L.push(`| Arquivos analisados | ${report.summary.filesAnalyzed} |`);
  L.push(`| Problemas encontrados | ${report.summary.issuesFound} |`);
  L.push(`| Dívida técnica | ${report.technicalDebtScore.score}/100 |`);
  L.push(`| Linhas totais | ${report.metrics.totalLines.toLocaleString("pt-BR")} |`);
  L.push(`| Arquivos > 500 linhas | ${report.metrics.filesOver500} |`);
  L.push(`| Blocos duplicados | ${report.metrics.duplicateBlocks} |`);
  L.push(`| Dependências circulares | ${report.metrics.circularDependencies} |`);
  L.push("");
  L.push("---");
  L.push("");
  L.push("## Heatmap de Dívida Técnica");
  L.push("");
  L.push("| Domínio | Score | Issues | Barra | Top arquivo |");
  L.push("|---------|-------|--------|-------|-------------|");
  for (const [domain, data] of Object.entries(report.technicalDebtMap).sort((a, b) => b[1].score - a[1].score)) {
    L.push(`| ${domain} | ${data.score} | ${data.issues} | ${heatBar(data.score)} | ${data.topFiles[0] ?? "—"} |`);
  }
  L.push("");
  L.push("---");
  L.push("");
  L.push("## Top 20 Oportunidades");
  L.push("");
  L.push("| # | Tipo | Severidade | Domínio | Descrição | Benefício |");
  L.push("|---|------|------------|---------|-----------|-----------|");
  report.topOpportunities.forEach((o, i) => {
    L.push(`| ${i + 1} | ${o.type} | ${o.severity} | ${o.domain} | ${o.description.slice(0, 60)} | ${o.expectedBenefit.slice(0, 40)} |`);
  });
  L.push("");
  L.push("---");
  L.push("");
  L.push("## Quick Wins");
  L.push("");
  if (report.quickWins.length === 0) L.push("_Nenhum quick win identificado._");
  for (const q of report.quickWins.slice(0, 15)) {
    L.push(`- [ ] **${q.type}** — ${q.description} (${q.files[0]})`);
  }
  L.push("");
  L.push("---");
  L.push("");
  L.push("## Grandes Refatorações");
  L.push("");
  for (const m of report.majorRefactors.slice(0, 10)) {
    L.push(`### ${m.type} — ${m.severity}`);
    L.push(`**Arquivos:** ${m.files.join(", ")}`);
    L.push(`**Impacto:** ${m.impact}`);
    L.push(`**Benefício:** ${m.expectedBenefit}`);
    L.push("");
  }
  L.push("---");
  L.push("");
  L.push("## Arquivos Grandes");
  L.push("");
  L.push("| Arquivo | Linhas | Domínio | Severidade |");
  L.push("|---------|--------|---------|------------|");
  for (const f of report.largeFiles.slice(0, 20)) {
    L.push(`| ${f.files[0]} | ${f.metrics?.lines ?? "?"} | ${f.domain} | ${f.severity} |`);
  }
  L.push("");
  L.push("---");
  L.push("");
  L.push("## Roadmap de Refatoração");
  L.push("");
  for (const [sprint, items] of Object.entries(report.roadmap)) {
    L.push(`### ${sprint}`);
    for (const item of items) L.push(`- [ ] ${item}`);
    L.push("");
  }
  L.push("---");
  L.push("");
  L.push("## Recomendações");
  L.push("");
  for (const r of report.recommendations) L.push(`- ${r}`);
  L.push("");
  L.push("---");
  L.push("");
  L.push("## Limitações V1");
  L.push("");
  for (const lim of report.limitations) L.push(`- ${lim}`);
  L.push("");
  L.push("---");
  L.push("_Refactor Agent — somente análise. Nenhum código foi alterado._");
  return L.join("\n");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const sources: Array<{ path: string; loaded: boolean }> = [];

  const inputPaths = [
    "reports/domain-guardian/project-context.json",
    "reports/domain-guardian/project-knowledge-graph.json",
    "reports/domain-guardian/architecture-decisions.json",
    "reports/domain-guardian/memory.json",
    "reports/domain-guardian/latest.json",
    "reports/domain-guardian/implementation-plan.json",
    "reports/domain-guardian/execution-status.json",
    "reports/domain-guardian/advisor.md",
    "reports/domain-guardian/decision.md",
    "reports/domain-guardian/change-analysis.md",
    "reports/domain-guardian/review-checklist.md",
    "docs/ai/domain-map.md",
    "docs/ai/domain-dependencies.md",
    "docs/ai/domain-invariants.md",
    "docs/ai/payment-lifecycle-audit.md",
    "docs/ai/appointment-archive-audit.md",
  ];

  const loaded = await Promise.all(
    inputPaths.map(async (rel) => {
      const full = rel.startsWith("docs/") ? path.join(ROOT, rel) : path.join(ROOT, rel);
      const isJson = rel.endsWith(".json");
      const data = isJson ? await tryReadJson(full) : await tryReadText(full);
      sources.push({ path: rel, loaded: data !== null });
      return { rel, data };
    })
  );

  const getLoaded = (name: string) => loaded.find((l) => l.rel.includes(name))?.data ?? null;

  const projectContext = getLoaded("project-context") as Record<string, unknown> | null;
  const knowledgeGraph = getLoaded("knowledge-graph") as Record<string, unknown> | null;
  const architectureDecisions = getLoaded("architecture-decisions") as Record<string, unknown> | null;
  const latest = getLoaded("latest.json") as Record<string, unknown> | null;
  const executionStatus = getLoaded("execution-status") as Record<string, unknown> | null;

  const [, gitDiff] = await Promise.all([
    runGit(["status", "--porcelain"]),
    runGit(["diff", "--name-only"]),
  ]);
  const gitFiles = await runGit(["ls-files"]);
  const gitFileList = gitFiles.split(/\r?\n/).filter(Boolean).map(normalizePath);

  const extensions = [".ts", ".tsx", ".js", ".mjs"];
  const scanPaths = gitFileList.filter(
    (f) =>
      extensions.some((e) => f.endsWith(e)) &&
      (f.startsWith("src/") || f.startsWith("scripts/") || f === "prisma/schema.prisma")
  );

  const allContents = new Map<string, string>();
  for (const f of scanPaths) {
    const content = await tryReadText(path.join(ROOT, f));
    if (content !== null) allContents.set(f, content);
  }

  const { fileAnalyses, issues } = await analyzeProject(scanPaths, allContents, knowledgeGraph, architectureDecisions);

  const filterBy = (pred: (i: RefactorIssue) => boolean) => issues.filter(pred);

  const metrics: RefactorReport["metrics"] = {
    totalLines: fileAnalyses.reduce((s, f) => s + f.lines, 0),
    filesOver300: fileAnalyses.filter((f) => f.lines >= 300).length,
    filesOver500: fileAnalyses.filter((f) => f.lines >= 500).length,
    filesOver800: fileAnalyses.filter((f) => f.lines >= 800).length,
    filesOver1000: fileAnalyses.filter((f) => f.lines >= 1000).length,
    functionsOver40: fileAnalyses.reduce((s, f) => s + f.functions.filter((fn) => fn.lines >= 40).length, 0),
    functionsOver80: fileAnalyses.reduce((s, f) => s + f.functions.filter((fn) => fn.lines >= 80).length, 0),
    functionsOver150: fileAnalyses.reduce((s, f) => s + f.functions.filter((fn) => fn.lines >= 150).length, 0),
    avgImportsPerFile: Math.round(fileAnalyses.reduce((s, f) => s + f.imports, 0) / Math.max(1, fileAnalyses.length)),
    circularDependencies: filterBy((i) => i.type === "circular_dependency").length,
    legacyMarkerCount: fileAnalyses.reduce((s, f) => s + f.legacyMarkers.length, 0),
    prismaQueryPatterns: fileAnalyses.reduce((s, f) => s + f.prismaQueries.length, 0),
    duplicateBlocks: filterBy((i) => i.type === "duplicated_code").length,
  };

  const debt = computeDebtScore(issues, metrics);
  const technicalDebtMap = buildTechnicalDebtMap(issues);

  const topOpportunities = [...issues].sort((a, b) => impactScore(b) - impactScore(a)).slice(0, 20);

  const quickWins = issues.filter(
    (i) =>
      (i.severity === "LOW" || i.severity === "INFO") &&
      i.complexity === "Baixa" &&
      i.risk === "Baixo" &&
      !i.type.includes("duplicat")
  ).slice(0, 25);

  const majorRefactors = issues.filter(
    (i) =>
      (i.severity === "CRITICAL" || i.severity === "HIGH") &&
      (i.type === "large_file" || i.type === "large_function" || i.type === "duplicated_code" || i.type === "circular_dependency")
  ).slice(0, 15);

  const guardianSummary = latest?.summary as { errors?: number } | undefined;
  const guardianHealthy = (guardianSummary?.errors ?? 0) === 0;

  const adrList = (architectureDecisions as { decisions?: Array<{ id: string; title: string }> } | null)?.decisions ?? [];

  const projectName =
    (projectContext as { projectName?: string } | null)?.projectName ??
    (knowledgeGraph as { summary?: { projectName?: string } } | null)?.summary?.projectName ??
    "THouse";

  const execPct = (executionStatus as { summary?: { overallProgressPercent?: number } } | null)?.summary?.overallProgressPercent ?? 0;

  const roadmap = {
    sprint1: [
      "Quick wins: remover imports mortos e exports não utilizados",
      "Documentar código @legacy (simulation-coupon-codes, symbolic-payment)",
      "Extrair helpers duplicados de menor risco",
    ],
    sprint2: [
      "Dividir arquivos > 800 linhas (agendamento/page, minha-conta/page, meus-dados/route)",
      "Centralizar queries Prisma repetidas em repositories",
      "Resolver dependências circulares em src/app/lib",
    ],
    sprint3: [
      "Refatorar webhook Asaas e process-payment-webhook (domínio Financeiro)",
      "Unificar validações e schemas repetidos",
      "Reduzir complexidade ciclomática em rotas críticas",
    ],
    sprint4: [
      "Modularizar páginas admin monolíticas",
      "Eliminar APIs órfãs confirmadas",
      "Consolidar scripts utilitários em pacote ops documentado",
    ],
  };

  if (metrics.filesOver800 > 0) {
    const big = fileAnalyses.filter((f) => f.lines >= 800).map((f) => f.path);
    roadmap.sprint2.unshift(`Prioridade: ${big.slice(0, 3).join(", ")}`);
  }

  const topDomains = Object.entries(technicalDebtMap)
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, 5)
    .map(([d]) => d);

  const report: RefactorReport = {
    agentVersion: AGENT_VERSION,
    generatedAt: new Date().toISOString(),
    language: "pt-BR",
    summary: {
      projectName,
      headline: `Dívida técnica ${debt.score}/100 — ${issues.length} oportunidades de refatoração`,
      filesAnalyzed: fileAnalyses.length,
      issuesFound: issues.length,
      technicalDebtScore: debt.score,
      debtLevel: debt.level,
      topDomains,
      executiveSummary: [
        `O projeto ${projectName} tem dívida técnica ${debt.level.toLowerCase()} (${debt.score}/100).`,
        `${metrics.filesOver500} arquivos excedem 500 linhas; ${metrics.duplicateBlocks} blocos duplicados detectados.`,
        `Domínios mais afetados: ${topDomains.join(", ")}.`,
        `Execução do roadmap de estabilização: ${execPct}% — refatorar após Sprint 1 reduz risco.`,
        "Priorize dividir páginas monolíticas (agendamento, minha-conta) e centralizar lógica financeira.",
      ].join(" "),
    },
    technicalDebtScore: debt,
    duplications: filterBy((i) => i.type.includes("duplicat")),
    deadCode: filterBy((i) => i.type.includes("unused") || i.type === "obsolete_script"),
    complexity: filterBy((i) => i.type.includes("complex") || i.type === "large_switch"),
    largeFiles: filterBy((i) => i.type === "large_file"),
    largeFunctions: filterBy((i) => i.type === "large_function"),
    duplicateQueries: filterBy((i) => i.type === "duplicate_prisma_query"),
    duplicateHelpers: filterBy((i) => i.type === "duplicate_helper"),
    duplicateTypes: [],
    duplicateSchemas: [],
    unusedImports: filterBy((i) => i.type === "unused_import"),
    unusedFunctions: filterBy((i) => i.type.includes("unused_function") || i.type === "unused_hook"),
    unusedComponents: filterBy((i) => i.type === "unused_component"),
    unusedApis: filterBy((i) => i.type === "unused_api"),
    unusedScripts: filterBy((i) => i.type === "obsolete_script"),
    legacyCode: filterBy((i) => i.type === "legacy_code"),
    dependencies: filterBy((i) => i.type === "circular_dependency" || i.type === "high_import_count"),
    coupling: filterBy((i) => i.type === "high_import_count"),
    quickWins,
    majorRefactors,
    topOpportunities,
    technicalDebtMap,
    roadmap,
    guardian: {
      status: guardianHealthy ? "HEALTHY" : "UNHEALTHY",
      checksRelevant: ["F1", "F4", "A5", "A8", "C1", "S4"],
    },
    adrs: adrList.slice(0, 10).map((a) => ({
      id: a.id,
      title: a.title,
      relevance: "Consultar antes de refatorar domínios críticos",
    })),
    entities: [...new Set(fileAnalyses.flatMap((f) => f.entities))],
    files: fileAnalyses.sort((a, b) => b.lines - a.lines).slice(0, 50),
    metrics,
    recommendations: [
      "Não refatorar domínio Financeiro/Webhook antes de concluir Sprint 1 de estabilização",
      "Dividir arquivos > 500 linhas antes de adicionar novas features",
      "Extrair repository Prisma para Payment e Appointment primeiro",
      "Remover @legacy apenas após ADR-010 e Guardian S4 validados",
      "Usar refactor-report.json como input do design-planner em refatorações futuras",
      "Reexecutar após cada sprint de estabilização para medir evolução da dívida",
    ],
    context: { sourcesConsulted: sources },
    limitations: [
      "Análise estática por regex — não substitui TypeScript compiler ou ESLint",
      "Duplicações detectam blocos de 6+ linhas similares, não AST semântico",
      "Código morto é heurístico — exports dinâmicos e rotas externas podem ser falso positivo",
      "Imports não utilizados podem falhar com re-exports e tipos",
      "Dependências circulares apenas em imports relativos resolvidos",
      "Não analisa cobertura de testes",
      "Páginas Next.js (page.tsx) excluídas de componentes não utilizados",
    ],
  };

  await mkdir(GUARDIAN_DIR, { recursive: true });
  const jsonPath = path.join(GUARDIAN_DIR, "refactor-report.json");
  const mdPath = path.join(GUARDIAN_DIR, "refactor-report.md");
  await writeFile(jsonPath, JSON.stringify(report, null, 2), "utf8");
  await writeFile(mdPath, buildMarkdown(report), "utf8");

  console.log("Refactor Agent — análise concluída");
  console.log(`  Projeto:        ${report.summary.projectName}`);
  console.log(`  Arquivos:       ${report.summary.filesAnalyzed}`);
  console.log(`  Problemas:      ${report.summary.issuesFound}`);
  console.log(`  Dívida técnica: ${report.technicalDebtScore.score}/100 (${report.technicalDebtScore.level})`);
  console.log(`  Top domínio:    ${topDomains[0]}`);
  console.log(`  Quick wins:     ${report.quickWins.length}`);
  console.log(`  Grandes ref.:   ${report.majorRefactors.length}`);
  console.log(`  JSON:           ${path.relative(ROOT, jsonPath)}`);
  console.log(`  Markdown:       ${path.relative(ROOT, mdPath)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
