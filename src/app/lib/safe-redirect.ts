/**
 * GO-04A.3 RC-04 — sanitização de redirects pós-login.
 * Aceita apenas paths relativos internos; rejeita URLs externas e esquemas perigosos.
 */

const DEFAULT_POST_LOGIN = "/minha-conta";

const REDIRECT_PARAM_KEYS = [
  "redirect",
  "next",
  "returnUrl",
  "return_to",
  "callback",
  "callbackUrl",
] as const;

export function sanitizeInternalRedirect(
  raw: string | null | undefined,
  fallback: string = DEFAULT_POST_LOGIN
): string {
  if (!raw || typeof raw !== "string") return fallback;

  const trimmed = raw.trim();
  if (!trimmed) return fallback;

  // Apenas paths relativos começando com /
  if (!trimmed.startsWith("/")) return fallback;
  // Protocol-relative (//evil.com)
  if (trimmed.startsWith("//")) return fallback;
  // Esquemas embutidos / backslash tricks
  if (trimmed.includes("://") || trimmed.includes("\\")) return fallback;
  if (/[\x00-\x1f]/.test(trimmed)) return fallback;

  try {
    const base = "https://thouserec.invalid";
    const url = new URL(trimmed, base);
    if (url.origin !== base) return fallback;
    if (url.username || url.password) return fallback;

    const safe = `${url.pathname}${url.search}${url.hash}`;
    if (!safe.startsWith("/") || safe.startsWith("//")) return fallback;
    return safe;
  } catch {
    return fallback;
  }
}

export function resolvePostLoginRedirect(
  params: { get(name: string): string | null },
  fallback: string = DEFAULT_POST_LOGIN
): string {
  for (const key of REDIRECT_PARAM_KEYS) {
    const value = params.get(key);
    if (value) return sanitizeInternalRedirect(value, fallback);
  }
  return fallback;
}
