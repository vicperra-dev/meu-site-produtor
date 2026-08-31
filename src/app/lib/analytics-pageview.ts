/**
 * Analytics first-party — normalização de path e cookies de visitante.
 * Sem IP, fingerprint ou query string.
 */

export const VISITOR_COOKIE = "visitor_id";
export const VISIT_SESSION_COOKIE = "visit_session_id";

export const VISITOR_MAX_AGE_SEC = 60 * 60 * 24 * 400;
export const VISIT_SESSION_MAX_AGE_SEC = 60 * 30;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const PUBLIC_PATH_RE = /^\/[a-zA-Z0-9/_-]*$/;

export const PAGE_PATH_LABELS: Record<string, string> = {
  "/": "Home",
  "/planos": "Planos",
  "/agendamento": "Agendamento",
  "/contato": "Contato",
  "/faq": "FAQ",
  "/shopping": "Shopping",
  "/login": "Login",
  "/registro": "Registro",
  "/portfolio": "Portfólio",
  "/termos-contratos": "Termos e contratos",
  "/minha-conta": "Minha Conta",
  "/carrinho": "Carrinho",
  "/pagamentos": "Pagamentos",
};

export function isValidVisitorUuid(value: string | undefined | null): boolean {
  return Boolean(value && UUID_RE.test(value));
}

export function pagePathLabel(path: string): string {
  return PAGE_PATH_LABELS[path] || path;
}

function stripQueryAndHash(raw: string): string {
  const noHash = raw.split("#")[0] || "";
  return noHash.split("?")[0] || "";
}

/**
 * Aceita apenas pathname interno do site. Rejeita admin, API, assets e URLs arbitrárias.
 */
export function normalizePublicPagePath(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  let value = stripQueryAndHash(raw.trim());
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) {
    try {
      value = new URL(value).pathname;
    } catch {
      return null;
    }
  }
  if (!value.startsWith("/")) value = `/${value}`;
  if (value.length > 1) value = value.replace(/\/+$/, "");
  value = value.replace(/\/{2,}/g, "/");
  if (value.length > 180) return null;
  if (!PUBLIC_PATH_RE.test(value)) return null;

  const lower = value.toLowerCase();
  if (lower.startsWith("/admin")) return null;
  if (lower.startsWith("/api")) return null;
  if (lower.startsWith("/_next")) return null;
  if (lower.includes(".")) return null;

  return value;
}

export function normalizeAnalyticsSource(raw: unknown): "WEB" | "APP" {
  const s = String(raw || "WEB").trim().toUpperCase();
  return s === "APP" ? "APP" : "WEB";
}

export function shouldSkipTrackerPath(pathname: string | null): boolean {
  if (!pathname) return true;
  return normalizePublicPagePath(pathname) == null;
}

export function isAdminAnalyticsActor(role: string | null | undefined): boolean {
  return String(role || "").toUpperCase() === "ADMIN";
}

/**
 * Fonte de verdade: path público e visitante que não é ADMIN.
 */
export function shouldRecordPageView(params: {
  path: unknown;
  userRole?: string | null;
}): { record: true; path: string } | { record: false; reason: "path" | "admin" } {
  const path = normalizePublicPagePath(params.path);
  if (!path) return { record: false, reason: "path" };
  if (isAdminAnalyticsActor(params.userRole)) {
    return { record: false, reason: "admin" };
  }
  return { record: true, path };
}

export function canPurgeVisitacaoStats(user: { role?: string | null } | null): boolean {
  return isAdminAnalyticsActor(user?.role);
}

/** Única operação de limpeza: PageView. Não aceita nome de tabela. */
export async function deleteAllPageViews(db: {
  pageView: { deleteMany: (args?: object) => Promise<{ count: number }> };
}): Promise<number> {
  const result = await db.pageView.deleteMany({});
  return result.count;
}
