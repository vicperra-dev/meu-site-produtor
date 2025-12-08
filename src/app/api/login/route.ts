import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { email, senha } = await req.json();

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Usuário não encontrado." },
        { status: 404 }
      );
    }

    const senhaCorreta = await bcrypt.compare(senha, user.senha);

    if (!senhaCorreta) {
      return NextResponse.json(
        { error: "Senha incorreta." },
        { status: 401 }
      );
    }

    return NextResponse.json({
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        foto: user.foto,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Erro ao fazer login." },
      { status: 500 }
    );
  }
}
