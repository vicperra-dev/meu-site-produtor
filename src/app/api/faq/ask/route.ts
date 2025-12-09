import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { question, userName, userEmail } = body;

    if (!question || typeof question !== "string" || question.trim().length < 10) {
      return NextResponse.json(
        { error: "Descreva sua dúvida com pelo menos 10 caracteres." },
        { status: 400 }
      );
    }

    const novaPergunta = await prisma.userQuestion.create({
      data: {
        question: question.trim(),
        userName: userName?.trim() || null,
        userEmail: userEmail?.trim() || null,
      },
    });

    return NextResponse.json({ ok: true, question: novaPergunta });
  } catch (e) {
    console.error("Erro ao registrar dúvida no FAQ:", e);
    return NextResponse.json(
      { error: "Erro ao enviar sua dúvida. Tente novamente em alguns instantes." },
      { status: 500 }
    );
  }
}
