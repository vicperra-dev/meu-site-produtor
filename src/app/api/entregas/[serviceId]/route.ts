/**
 * GET /api/entregas/[serviceId]
 * GO-H11A — Proxy autenticado de arquivos de entrega (owner ou ADMIN).
 */
import { NextResponse } from "next/server";
import { createReadStream, existsSync } from "fs";
import path from "path";
import { Readable } from "stream";
import { get } from "@vercel/blob";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import {
  blobPathnameFromUrl,
  isLocalDeliveryPath,
  isVercelBlobUrl,
} from "@/app/lib/delivery-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function mimeFromName(name: string): string {
  const ext = path.extname(name).toLowerCase();
  if (ext === ".mp3") return "audio/mpeg";
  if (ext === ".zip") return "application/zip";
  if (ext === ".wav") return "audio/wav";
  return "application/octet-stream";
}

function localDeliveryAbs(urlOrPath: string): string | null {
  const raw = String(urlOrPath || "").trim();
  let name = raw;
  const marker = "/uploads/deliveries/";
  const idx = raw.indexOf(marker);
  if (idx >= 0) name = raw.slice(idx + marker.length);
  else if (raw.startsWith("uploads/deliveries/")) name = raw.slice("uploads/deliveries/".length);
  name = path.basename(name);
  if (!name || name.includes("..")) return null;

  const candidates = [
    path.join(process.cwd(), "storage", "deliveries", name),
    path.join(process.cwd(), "public", "uploads", "deliveries", name),
  ];
  for (const abs of candidates) {
    if (existsSync(abs)) return abs;
  }
  return null;
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ serviceId: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { serviceId } = await ctx.params;
    if (!serviceId) {
      return NextResponse.json({ error: "serviceId obrigatório" }, { status: 400 });
    }

    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      select: {
        id: true,
        userId: true,
        deliveryAudioUrl: true,
        deliveryAudioFormat: true,
      },
    });

    if (!service?.deliveryAudioUrl) {
      return NextResponse.json({ error: "Entrega não encontrada" }, { status: 404 });
    }

    if (user.role !== "ADMIN" && service.userId !== user.id) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const stored = service.deliveryAudioUrl.trim();
    const fileName = path.basename(stored.split("?")[0] || "entrega");
    const contentType = mimeFromName(
      service.deliveryAudioFormat ? `x.${service.deliveryAudioFormat}` : fileName
    );

    if (isLocalDeliveryPath(stored) || (!stored.startsWith("http") && !isVercelBlobUrl(stored))) {
      const abs = localDeliveryAbs(stored);
      if (!abs) {
        return NextResponse.json({ error: "Arquivo local ausente" }, { status: 404 });
      }
      const nodeStream = createReadStream(abs);
      const webStream = Readable.toWeb(nodeStream) as unknown as ReadableStream;
      return new NextResponse(webStream, {
        headers: {
          "Content-Type": contentType,
          "Content-Disposition": `inline; filename="${fileName}"`,
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }

    if (isVercelBlobUrl(stored) || stored.startsWith("deliveries/")) {
      const pathname = stored.startsWith("deliveries/")
        ? stored
        : blobPathnameFromUrl(stored) || stored;
      const access =
        process.env.BLOB_DELIVERY_ACCESS === "private" ? "private" : "public";

      try {
        const result = await get(pathname, {
          access: access as "public" | "private",
          token: process.env.BLOB_READ_WRITE_TOKEN,
        });
        if (!result || result.statusCode !== 200 || !result.stream) {
          // Fallback: blob antigo em store público — fetch direto só no servidor
          if (stored.startsWith("http")) {
            const upstream = await fetch(stored);
            if (!upstream.ok || !upstream.body) {
              return NextResponse.json({ error: "Arquivo Blob ausente" }, { status: 404 });
            }
            return new NextResponse(upstream.body, {
              headers: {
                "Content-Type": upstream.headers.get("content-type") || contentType,
                "Content-Disposition": `inline; filename="${fileName}"`,
                "Cache-Control": "private, no-store",
                "X-Content-Type-Options": "nosniff",
              },
            });
          }
          return NextResponse.json({ error: "Arquivo Blob ausente" }, { status: 404 });
        }
        return new NextResponse(result.stream, {
          headers: {
            "Content-Type": result.blob.contentType || contentType,
            "Content-Disposition": `inline; filename="${fileName}"`,
            "Cache-Control": "private, no-store",
            "X-Content-Type-Options": "nosniff",
          },
        });
      } catch {
        if (stored.startsWith("http")) {
          const upstream = await fetch(stored);
          if (!upstream.ok || !upstream.body) {
            return NextResponse.json({ error: "Arquivo Blob ausente" }, { status: 404 });
          }
          return new NextResponse(upstream.body, {
            headers: {
              "Content-Type": upstream.headers.get("content-type") || contentType,
              "Content-Disposition": `inline; filename="${fileName}"`,
              "Cache-Control": "private, no-store",
              "X-Content-Type-Options": "nosniff",
            },
          });
        }
        throw new Error("Falha ao ler Blob");
      }
    }

    // URL externa residual: só via proxy autenticado (não redireciona)
    const upstream = await fetch(stored);
    if (!upstream.ok || !upstream.body) {
      return NextResponse.json({ error: "Arquivo ausente" }, { status: 404 });
    }
    return new NextResponse(upstream.body, {
      headers: {
        "Content-Type": upstream.headers.get("content-type") || contentType,
        "Content-Disposition": `inline; filename="${fileName}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    console.error("[entregas/proxy]", err);
    return NextResponse.json({ error: "Erro ao servir entrega" }, { status: 500 });
  }
}
