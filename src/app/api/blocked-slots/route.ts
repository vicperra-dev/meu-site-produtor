import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

// Função auxiliar para formatar hora
function formatarHora(hora: string | null | undefined): string {
  try {
    const horaStr = String(hora || "").trim();
    
    if (!horaStr) {
      return "00:00";
    }
    
    if (horaStr.includes(":")) {
      const partes = horaStr.split(":");
      if (partes.length >= 1) {
        const horas = parseInt(partes[0], 10);
        if (!isNaN(horas) && horas >= 0 && horas <= 23) {
          return `${String(horas).padStart(2, "0")}:00`;
        }
      }
      return "00:00";
    } else {
      const horaNum = parseInt(horaStr, 10);
      if (!isNaN(horaNum) && horaNum >= 0 && horaNum <= 23) {
        return `${String(horaNum).padStart(2, "0")}:00`;
      }
      return "00:00";
    }
  } catch (e) {
    return "00:00";
  }
}

// API pública para buscar horários bloqueados (sem autenticação)
export async function GET() {
  try {
    // Verificar se o modelo existe no Prisma Client
    if (!prisma.blockedTimeSlot) {
      console.error("Modelo blockedTimeSlot não encontrado no Prisma Client");
      return NextResponse.json(
        { 
          error: "Modelo não encontrado",
          message: "O modelo BlockedTimeSlot não está disponível. Execute 'npx prisma generate'",
          slots: [], // Retornar array vazio para não quebrar o frontend
        },
        { status: 200 } // Retornar 200 com array vazio para não quebrar o frontend
      );
    }

    const slots = await prisma.blockedTimeSlot.findMany({
      where: { ativo: true }, // Apenas slots confirmados/publicados
      orderBy: [
        { data: "asc" },
        { hora: "asc" },
      ],
    });

    // Garantir formato consistente das horas (HH:00)
    const slotsFormatados = slots.map((slot) => ({
      id: slot.id,
      data: slot.data,
      hora: formatarHora(slot.hora),
    }));

    return NextResponse.json({ slots: slotsFormatados });
  } catch (err: any) {
    console.error("Erro ao buscar slots bloqueados:", err);
    console.error("Tipo do erro:", err.constructor.name);
    console.error("Mensagem:", err.message);
    console.error("Código:", err.code);
    
    // Se for erro de modelo não encontrado, retornar array vazio
    if (err.message?.includes("blockedTimeSlot") || err.message?.includes("Unknown model")) {
      console.warn("Modelo não encontrado, retornando array vazio");
      return NextResponse.json({ slots: [] }, { status: 200 });
    }
    
    // Retornar erro mais detalhado em desenvolvimento
    const errorMessage = process.env.NODE_ENV === "development" 
      ? err.message || "Erro desconhecido"
      : "Erro ao buscar slots bloqueados";
    
    // Retornar array vazio em caso de erro para não quebrar o frontend
    return NextResponse.json(
      { 
        error: "Erro ao buscar slots bloqueados",
        message: errorMessage,
        slots: [], // Retornar array vazio para não quebrar o frontend
      },
      { status: 200 } // Retornar 200 com array vazio para não quebrar o frontend
    );
  }
}
