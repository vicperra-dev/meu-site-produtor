import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/auth";

export async function POST(req: Request) {
  try {
    await requireAdmin();

    const { email, novaSenha } = await req.json();

    if (!email || !novaSenha) {
      return NextResponse.json(
        { error: "Email e nova senha são obrigatórios" },
        { status: 400 }
      );
    }

    if (novaSenha.length < 6) {
      return NextResponse.json(
        { error: "Senha deve ter no mínimo 6 caracteres" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 }
      );
    }

    const hash = await bcrypt.hash(novaSenha, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: { senha: hash },
    });

    return NextResponse.json({
      message: `Senha do usuário ${user.nomeArtistico} (${email}) foi alterada com sucesso!`,
    });
  } catch (err: any) {
    if (err.message === "Acesso negado" || err.message === "Não autenticado") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }
    console.error("Erro ao resetar senha:", err);
    return NextResponse.json(
      { error: "Erro ao resetar senha" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json(
        { error: "Email é obrigatório" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        nomeArtistico: true,
        role: true,
        blocked: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      usuario: user,
      existe: true,
    });
  } catch (err: any) {
    if (err.message === "Acesso negado" || err.message === "Não autenticado") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }
    console.error("Erro ao verificar usuário:", err);
    return NextResponse.json(
      { error: "Erro ao verificar usuário" },
      { status: 500 }
    );
  }
}
