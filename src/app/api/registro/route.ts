import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/app/lib/prisma";
import { createUserSession } from "@/app/lib/auth";
import { registroSchema } from "@/app/lib/validations";
import { CPF_DUPLICATE_MESSAGE, normalizeCpfDigits } from "@/app/lib/cpf-validation";
import { goLiveBlockIfNeeded } from "@/app/lib/go-live-maintenance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const goLiveBlocked = goLiveBlockIfNeeded();
  if (goLiveBlocked) return goLiveBlocked;

  try {
    console.error("\n🔵 ========================================");
    console.error("🔵 [REGISTRO] Recebendo requisição de registro");
    console.error("🔵 ========================================\n");
    
    const body = await req.json();
    console.error("🔵 [REGISTRO] Body recebido:", JSON.stringify(body, null, 2));

    // ✅ Validar entrada
    const validation = registroSchema.safeParse(body);
    if (!validation.success) {
      console.error("❌ [REGISTRO] Validação falhou:", validation.error.errors);
      return NextResponse.json(
        { error: validation.error.errors[0]?.message || "Dados inválidos" },
        { status: 400 }
      );
    }
    
    console.error("✅ [REGISTRO] Validação passou");

    const {
      nomeCompleto,
      nomeArtistico,
      nomeSocial,
      email,
      senha,
      telefone,
      cpf,
      pais,
      estado,
      cidade,
      bairro,
      dataNascimento,
      sexo,
      genero,
      generoOutro,
      estilosMusicais,
      nacionalidade,
    } = validation.data;

    console.error("🔵 [REGISTRO] Verificando se email já existe:", email);
    
    // Buscar com email exato (SQLite não suporta case-insensitive diretamente)
    const existe = await prisma.user.findUnique({
      where: { email },
    });

    if (existe) {
      console.error("❌ [REGISTRO] Email já registrado:", email);
      console.error("❌ [REGISTRO] Usuário existente:", {
        id: existe.id,
        email: existe.email,
        nomeArtistico: existe.nomeArtistico,
        nomeCompleto: existe.nomeCompleto,
      });
      return NextResponse.json(
        { error: "Email já registrado." },
        { status: 400 }
      );
    }
    
    console.error("✅ [REGISTRO] Email não existe, pode criar conta");

    const cpfDigits = normalizeCpfDigits(cpf);
    const cpfEmUso = await prisma.user.findFirst({
      where: { cpf: cpfDigits },
      select: { id: true },
    });
    if (cpfEmUso) {
      return NextResponse.json({ error: CPF_DUPLICATE_MESSAGE }, { status: 400 });
    }

    const hash = await bcrypt.hash(senha, 10);

    const user = await prisma.user.create({
      data: {
        nomeCompleto,
        nomeArtistico,
        nomeSocial: nomeSocial || null,
        email,
        senha: hash,
        telefone,
        cpf: cpfDigits,
        pais,
        estado,
        cidade,
        bairro,
        dataNascimento: new Date(dataNascimento),
        sexo,
        genero,
        generoOutro: generoOutro || null,
        estilosMusicais: estilosMusicais || null,
        nacionalidade: nacionalidade || null,
        role: "USER",
      },
    });
    
    console.error("✅ [REGISTRO] Usuário criado com sucesso!");
    console.error("✅ [REGISTRO] ID do usuário:", user.id);
    console.error("✅ [REGISTRO] Email:", user.email);
    console.error("✅ [REGISTRO] Nome Completo:", user.nomeCompleto);
    console.error("✅ [REGISTRO] Nome Artístico:", user.nomeArtistico);

    await createUserSession(user.id);

    return NextResponse.json({
      user: {
        id: user.id,
        nomeArtistico: user.nomeArtistico,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err: any) {
    console.error("\n❌ ========================================");
    console.error("❌ [REGISTRO] ERRO AO REGISTRAR:");
    console.error("❌ [REGISTRO] Tipo:", err?.constructor?.name || "Desconhecido");
    console.error("❌ [REGISTRO] Mensagem:", err?.message || "Sem mensagem");
    console.error("❌ [REGISTRO] Code:", err?.code || "Sem código");
    if (err?.stack) {
      console.error("❌ [REGISTRO] Stack:", err.stack);
    }
    console.error("❌ ========================================\n");
    
    // Se for erro de constraint único (email duplicado)
    if (err?.code === 'P2002' || err?.message?.includes('Unique constraint') || err?.message?.includes('UNIQUE constraint')) {
      const target = String((err?.meta as { target?: string[] })?.target?.join(",") || "");
      if (target.includes("cpf")) {
        return NextResponse.json({ error: CPF_DUPLICATE_MESSAGE }, { status: 400 });
      }
      return NextResponse.json(
        { error: "Email já registrado." },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: "Erro interno no servidor." },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: "Método não permitido" },
    { status: 405 }
  );
}
