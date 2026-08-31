import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    let where: any = {};

    // Com busca: filtra por pergunta ou resposta
    if (q.trim()) {
      where = {
        OR: [
          {
            question: {
              contains: q.trim(),
            },
          },
          {
            answer: {
              contains: q.trim(),
            },
          },
        ],
      };
    }

    // Ordenar por views (mais visualizadas primeiro) quando não houver busca
    // Caso contrário, ordenar por data (mais recentes primeiro)
    // Se limit for muito alto (>= 100), ordenar por data para garantir que novas FAQs apareçam
    const limitValue = parseInt(searchParams.get("limit") || "20");
    const orderBy = q.trim() || limitValue >= 100
      ? { createdAt: "desc" as const }
      : { views: "desc" as const };

    const [faqs, total] = await Promise.all([
      prisma.fAQ.findMany({
        where,
        orderBy,
        skip,
        take: limit,
      }),
      prisma.fAQ.count({ where }),
    ]);

    console.log(`[FAQ Search] Query: "${q}", Found: ${faqs.length}, Total: ${total}`);

    return NextResponse.json(
      {
        faqs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
      {
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
          "Expires": "0",
        },
      }
    );
  } catch (err) {
    console.error("Erro ao buscar FAQ:", err);
    return NextResponse.json(
      { error: "Erro ao buscar FAQ" },
      { status: 500 }
    );
  }
}
