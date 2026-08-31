import { requireDevToolPageAccess } from "@/app/lib/dev-tool-access";

/**
 * GO-04A.3 RC-05: /testar-email inacessível a não-admin (produção e desenvolvimento).
 */
export default async function TestarEmailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireDevToolPageAccess();
  return children;
}
