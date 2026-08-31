/**
 * POST /api/conta/avatar — upload de foto de perfil (JPG/PNG/WEBP).
 * Grava em Vercel Blob quando BLOB_READ_WRITE_TOKEN existe; senão em public/uploads/avatars.
 */
import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { put } from "@vercel/blob";
import { prisma } from "@/app/lib/prisma";
import { requireAuth } from "@/app/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);
const EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    const form = await req.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Arquivo obrigatório." }, { status: 400 });
    }
    if (!ALLOWED.has(file.type)) {
      return NextResponse.json(
        { error: "Formato não permitido. Use JPG, PNG ou WEBP." },
        { status: 400 }
      );
    }
    if (file.size <= 0 || file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "Arquivo inválido ou maior que 2MB." },
        { status: 400 }
      );
    }

    const ext = EXT[file.type] || ".jpg";
    const storedName = `${user.id.slice(0, 8)}_${Date.now()}_${randomUUID().slice(0, 8)}${ext}`;
    const bytes = Buffer.from(await file.arrayBuffer());

    let publicUrl: string;
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const blob = await put(`avatars/${storedName}`, bytes, {
        access: "public",
        contentType: file.type,
        token: process.env.BLOB_READ_WRITE_TOKEN,
        addRandomSuffix: false,
      });
      publicUrl = blob.url;
    } else {
      const dir = path.join(process.cwd(), "public", "uploads", "avatars");
      await mkdir(dir, { recursive: true });
      await writeFile(path.join(dir, storedName), bytes);
      publicUrl = `/uploads/avatars/${storedName}`;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { foto: publicUrl },
    });

    return NextResponse.json({ ok: true, foto: publicUrl });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro no upload";
    if (message === "Não autenticado") {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    console.error("[conta/avatar]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
