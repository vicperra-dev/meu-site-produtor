import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/auth";

export async function GET() {
  try {
    // Buscar ou criar configuração padrão
    let settings = await prisma.siteSettings.findUnique({
      where: { id: "main" },
    });

    if (!settings) {
      settings = await prisma.siteSettings.create({
        data: {
          id: "main",
          maintenanceMode: false,
        },
      });
    }

    return NextResponse.json({ maintenanceMode: settings.maintenanceMode });
  } catch (err: any) {
    console.error("Erro ao buscar modo de manutenção:", err);
    return NextResponse.json({ maintenanceMode: false }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const admin = await requireAdmin();
    console.log("[Maintenance] Admin autenticado:", admin.email);

    const body = await req.json();
    const { maintenanceMode } = body;

    if (typeof maintenanceMode !== "boolean") {
      return NextResponse.json({ error: "maintenanceMode deve ser boolean" }, { status: 400 });
    }

    console.log("[Maintenance] Atualizando para:", maintenanceMode);

    // Buscar ou criar configuração
    let settings = await prisma.siteSettings.findUnique({
      where: { id: "main" },
    });

    if (!settings) {
      console.log("[Maintenance] Criando nova configuração");
      settings = await prisma.siteSettings.create({
        data: {
          id: "main",
          maintenanceMode,
        },
      });
    } else {
      console.log("[Maintenance] Atualizando configuração existente");
      settings = await prisma.siteSettings.update({
        where: { id: "main" },
        data: { maintenanceMode },
      });
    }

    console.log("[Maintenance] Configuração atualizada:", settings.maintenanceMode);
    return NextResponse.json({ maintenanceMode: settings.maintenanceMode });
  } catch (err: any) {
    console.error("[Maintenance] Erro completo:", err);
    if (err.message === "Acesso negado" || err.message === "Não autenticado") {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    return NextResponse.json({ 
      error: err.message || "Erro ao atualizar modo de manutenção",
      details: err.toString()
    }, { status: 500 });
  }
}
