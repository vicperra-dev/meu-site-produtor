/**
 * GO-H11A — Status público mínimo para o middleware Edge (sem auth).
 */
import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    let settings = await prisma.siteSettings.findUnique({ where: { id: "main" } });
    if (!settings) {
      settings = await prisma.siteSettings.create({
        data: { id: "main", maintenanceMode: false },
      });
    }
    return NextResponse.json({
      maintenanceMode: Boolean(settings.maintenanceMode),
    });
  } catch {
    return NextResponse.json({ maintenanceMode: false });
  }
}
