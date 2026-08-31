import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAuth } from "@/app/lib/auth";

export async function GET() {
  try {
    const user = await requireAuth();

    // Buscar todos os campos e depois selecionar apenas os necessários
    const userData = await prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!userData) {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 }
      );
    }

    // Selecionar apenas os campos necessários (evita enviar senha)
    const { senha, ...safeUserData } = userData;

    // Serializar datas para strings ISO
    const serializedData = {
      ...safeUserData,
      dataNascimento: safeUserData.dataNascimento instanceof Date 
        ? safeUserData.dataNascimento.toISOString().split('T')[0]
        : safeUserData.dataNascimento,
      createdAt: safeUserData.createdAt instanceof Date
        ? safeUserData.createdAt.toISOString()
        : safeUserData.createdAt,
    };

    return NextResponse.json(serializedData);
  } catch (err: any) {
    console.error("Erro /api/conta:", err);
    console.error("Stack trace:", err.stack);
    
    if (err.message === "Não autenticado") {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    
    // Retornar mensagem de erro mais detalhada em desenvolvimento
    const errorMessage = process.env.NODE_ENV === "development" 
      ? err.message || "Erro interno"
      : "Erro interno";
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
