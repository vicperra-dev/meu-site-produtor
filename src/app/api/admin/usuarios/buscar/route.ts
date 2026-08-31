import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/auth";

/** Busca leve para autocomplete de cupom de parceria. Sem planos/cupons/logins. */
export async function GET(req: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const q = String(searchParams.get("q") || "").trim();
    if (q.length < 1) {
      return NextResponse.json({ usuarios: [] });
    }
    if (q.length > 80) {
      return NextResponse.json({ error: "Busca muito longa." }, { status: 400 });
    }

    const usuarios = await prisma.user.findMany({
      where: {
        OR: [
          { nomeArtistico: { contains: q, mode: "insensitive" } },
          { nomeCompleto: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        nomeArtistico: true,
        nomeCompleto: true,
        email: true,
      },
      orderBy: { nomeArtistico: "asc" },
      take: 12,
    });

    return NextResponse.json({ usuarios });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "";
    if (message === "Acesso negado" || message === "Não autenticado") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }
    console.error("[Admin usuarios buscar]", err);
    return NextResponse.json({ error: "Erro ao buscar usuários." }, { status: 500 });
  }
}
