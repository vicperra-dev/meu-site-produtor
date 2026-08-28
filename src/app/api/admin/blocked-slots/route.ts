import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/auth";
import { z } from "zod";

const createSchema = z.object({
  data: z.string(),
  hora: z.string(),
});

export async function GET() {
  try {
    await requireAdmin();

    // Admin vê todos os slots (ativos e inativos)
    const slots = await prisma.blockedTimeSlot.findMany({
      orderBy: [
        { data: "asc" },
        { hora: "asc" },
      ],
    });

    return NextResponse.json({ slots });
  } catch (err: any) {
    if (err.message === "Acesso negado" || err.message === "Não autenticado") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }
    console.error("Erro ao buscar slots bloqueados:", err);
    return NextResponse.json({ error: "Erro ao buscar slots bloqueados" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();

    const body = await req.json();
    console.log("[API] POST blocked-slots - Body recebido:", body);
    
    const validation = createSchema.safeParse(body);

    if (!validation.success) {
      console.error("[API] Validação falhou:", validation.error);
      return NextResponse.json({ 
        error: "Dados inválidos",
        details: validation.error.errors 
      }, { status: 400 });
    }

    const { data, hora } = validation.data;
    console.log("[API] Criando slot com:", { data, hora });

    // Verificar se já existe antes de criar
    const existe = await prisma.blockedTimeSlot.findUnique({
      where: {
        data_hora: {
          data,
          hora,
        },
      },
    });

    if (existe) {
      // Se já existe, retornar o existente (não é erro)
      console.log("[API] Slot já existe, retornando existente:", existe);
      return NextResponse.json({ slot: existe });
    }

    // Tentar criar com ativo, se falhar, criar sem ativo (para compatibilidade)
    let slot;
    try {
      slot = await prisma.blockedTimeSlot.create({
        data: { data, hora, ativo: false },
      });
      console.log("[API] Slot criado com sucesso (com ativo):", slot);
    } catch (err: any) {
      // Se o erro for P2002 (unique constraint), significa que foi criado entre a verificação e agora
      if (err.code === "P2002") {
        // Buscar o slot existente
        slot = await prisma.blockedTimeSlot.findUnique({
          where: {
            data_hora: {
              data,
              hora,
            },
          },
        });
        if (slot) {
          console.log("[API] Slot criado por outra requisição, retornando existente:", slot);
          return NextResponse.json({ slot });
        }
      }
      
      // Se o erro for sobre campo 'ativo' não existir, tentar sem ele
      if (err.message?.includes("ativo") || err.message?.includes("Unknown field")) {
        console.warn("[API] Campo 'ativo' não disponível, criando sem ele");
        slot = await prisma.blockedTimeSlot.create({
          data: { data, hora },
        });
        console.log("[API] Slot criado com sucesso (sem ativo):", slot);
      } else {
        throw err; // Re-lançar se for outro erro
      }
    }

    return NextResponse.json({ slot });
  } catch (err: any) {
    console.error("[API] Erro completo ao criar slot:", err);
    console.error("[API] Tipo do erro:", err.constructor.name);
    console.error("[API] Código do erro:", err.code);
    console.error("[API] Mensagem do erro:", err.message);
    
    if (err.message === "Acesso negado" || err.message === "Não autenticado") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }
    if (err.code === "P2002") {
      return NextResponse.json({ 
        error: "Este horário já está bloqueado",
        message: "Este horário já está bloqueado para esta data" 
      }, { status: 409 });
    }
    
    return NextResponse.json({ 
      error: "Erro ao criar slot bloqueado",
      message: err.message || "Erro desconhecido",
      code: err.code,
    }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID é obrigatório" }, { status: 400 });
    }

    await prisma.blockedTimeSlot.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err.message === "Acesso negado" || err.message === "Não autenticado") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }
    return NextResponse.json({ error: "Erro ao remover slot bloqueado" }, { status: 500 });
  }
}

// Endpoint para confirmar e publicar todas as mudanças
export async function PATCH(req: Request) {
  try {
    await requireAdmin();

    const body = await req.json();
    const { action, unpublishIds } = body;

    if (action === "confirmar") {
      const ids = Array.isArray(unpublishIds)
        ? unpublishIds.filter((id: unknown) => typeof id === "string")
        : [];

      if (ids.length) {
        await prisma.blockedTimeSlot.deleteMany({
          where: { id: { in: ids } },
        });
      }

      await prisma.blockedTimeSlot.updateMany({
        where: { ativo: false },
        data: { ativo: true },
      });

      return NextResponse.json({
        success: true,
        message: "Mudanças confirmadas e publicadas com sucesso!",
      });
    }

    return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
  } catch (err: any) {
    if (err.message === "Acesso negado" || err.message === "Não autenticado") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }
    console.error("Erro ao confirmar mudanças:", err);
    return NextResponse.json({ error: "Erro ao confirmar mudanças" }, { status: 500 });
  }
}
