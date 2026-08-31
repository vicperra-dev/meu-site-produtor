import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/app/lib/prisma";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("session_id")?.value;

    if (sessionId) {
      // Deletar sessão do banco
      await prisma.session.deleteMany({
        where: { id: sessionId },
      }).catch(() => {});

      // Limpar cookie
      cookieStore.delete("session_id");
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Erro no logout:", err);
    // Mesmo com erro, limpar cookie
    const cookieStore = await cookies();
    cookieStore.delete("session_id");
    return NextResponse.json({ success: true });
  }
}
