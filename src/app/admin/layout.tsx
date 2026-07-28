/**
 * GO-H11A — Gate de admin no servidor (não depende só do client AuthContext).
 */
import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import AdminShell from "./AdminShell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") {
    redirect("/");
  }
  return <AdminShell>{children}</AdminShell>;
}
