import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/app/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { email, senha } = await req.json();

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Usuário não encontrado." },
        { status: 400 }
      );
    }

    const ok = await bcrypt.compare(senha, user.senha);
    if (!ok) {
      return NextResponse.json(
        { error: "Senha incorreta." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      id: user.id,
      nome: user.nome,
      email: user.email,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Erro ao fazer login." },
      { status: 500 }
    );
  }
}
