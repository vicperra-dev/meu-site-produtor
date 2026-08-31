"use client";

/**
 * GO-03C — Dashboard Admin = Cockpit Executivo.
 * Mantém o entrypoint /admin; a UI vive em dashboard-ui/.
 */
import { ExecutiveDashboard } from "@/app/admin/dashboard-ui/ExecutiveDashboard";

export default function AdminDashboard() {
  return <ExecutiveDashboard />;
}
