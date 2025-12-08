import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/app/lib/prisma";  // <-- importa daqui

export async function POST(req: Request) {
  try {
    const { nome, email, senha } = await req.json();

    const existe = await prisma.user.findUnique({
      where: { email },
    });

    if (existe) {
      return NextResponse.json(
        { error: "Email já registrado." },
        { status: 400 }
      );
    }

    const hash = await bcrypt.hash(senha, 10);

    const user = await prisma.user.create({
      data: { nome, email, senha: hash },
    });

    return NextResponse.json({ user });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Erro ao registrar." },
      { status: 500 }
    );
  }
}
