/**
 * GO-04A.3 RC-05 — paths de ferramentas de teste (seguro para middleware).
 */

export const DEV_TOOL_PAGE_PREFIXES = ["/testar-email"] as const;

export function isDevToolPagePath(pathname: string): boolean {
  return DEV_TOOL_PAGE_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}
