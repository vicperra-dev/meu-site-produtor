import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "./prisma";

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 dias

export async function createUserSession(userId: string) {
  const session = await prisma.session.create({
    data: {
      userId,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    },
  });

  const cookieStore = await cookies();
  cookieStore.set("session_id", session.id, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return session;
}

export async function getSessionUser() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("session_id")?.value;

  if (!sessionId) return null;

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date()) {
    return null;
  }

  return session.user;
}

export async function requireAuth() {
  const user = await getSessionUser();
  if (!user) {
    throw new Error("Não autenticado");
  }
  return user;
}

export async function requireAdmin() {
  const user = await requireAuth();
  if (user.role !== "ADMIN") {
    throw new Error("Acesso negado");
  }
  return user;
}

export function unauthorizedResponse(message = "Não autorizado") {
  return NextResponse.json({ error: message }, { status: 401 });
}
