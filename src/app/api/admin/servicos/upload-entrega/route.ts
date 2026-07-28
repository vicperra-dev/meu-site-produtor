/**
 * POST /api/admin/servicos/upload-entrega
 * Upload de arquivo de entrega (WAV/MP3/ZIP).
 *
 * GO-H2B: instrumentação diagnóstica — sem mudar a lógica de negócio.
 *
 * Dois modos:
 * - JSON (client upload Vercel Blob): emite token para o navegador enviar o
 *   arquivo direto ao Blob, contornando o limite de 4,5MB de body das
 *   functions Vercel (413 FUNCTION_PAYLOAD_TOO_LARGE).
 * - multipart/form-data: grava em Vercel Blob (put) quando BLOB_READ_WRITE_TOKEN
 *   existe; senão StorageProvider local (dev).
 */
import { NextResponse } from "next/server";
import path from "path";
import { requireAdmin } from "@/app/lib/auth";
import { randomUUID } from "crypto";
import { put } from "@vercel/blob";
import { getStorageProvider } from "@/app/lib/storage";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_EXT = new Set([".wav", ".mp3", ".zip"]);
const MAX_BYTES = 80 * 1024 * 1024; // 80 MB
const BLOB_PATH_PREFIX = "deliveries/";
/** GO-H11A: default public (store Vercel atual); defina BLOB_DELIVERY_ACCESS=private após store privado. */
const BLOB_ACCESS =
  process.env.BLOB_DELIVERY_ACCESS === "private" ? "private" : "public";

function formatFromExt(ext: string): "wav" | "mp3" | "zip" {
  if (ext === ".mp3") return "mp3";
  if (ext === ".zip") return "zip";
  return "wav";
}

function mimeForExt(ext: string): string {
  if (ext === ".mp3") return "audio/mpeg";
  if (ext === ".zip") return "application/zip";
  return "audio/wav";
}

function blog(step: string, data?: Record<string, unknown>) {
  console.log(`[GO-H2B-UPLOAD][api] ${step}`, {
    t: new Date().toISOString(),
    ...data,
  });
}

async function handleBlobClientUpload(req: Request) {
  blog("Entrada da rota", { mode: "json-blob-client" });
  const body = (await req.json()) as HandleUploadBody;
  blog("Body tipado", {
    type: (body as { type?: string }).type,
    keys: Object.keys(body || {}),
  });

  if (body.type === "blob.generate-client-token") {
    blog("Validação requireAdmin (generate-client-token)");
    await requireAdmin();
    const hasToken = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
    blog("Token Blob env", { BLOB_READ_WRITE_TOKEN: hasToken });
    if (!hasToken) {
      throw new Error(
        "BLOB_READ_WRITE_TOKEN não configurado. Não é possível enviar arquivos grandes."
      );
    }
  } else {
    blog("Callback Blob (sem requireAdmin)", { type: (body as { type?: string }).type });
  }

  try {
    blog("handleUpload:inicio");
    const t0 = Date.now();
    const result = await handleUpload({
      request: req,
      body,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        blog("onBeforeGenerateToken", { pathname, clientPayload: clientPayload ?? null });
        const ext = path.extname(pathname).toLowerCase();
        if (!pathname.startsWith(BLOB_PATH_PREFIX) || !ALLOWED_EXT.has(ext)) {
          throw new Error("Formato não permitido. Use WAV, MP3 ou ZIP.");
        }
        return {
          maximumSizeInBytes: MAX_BYTES,
          allowedContentTypes: [
            "audio/wav",
            "audio/x-wav",
            "audio/mpeg",
            "audio/mp3",
            "application/zip",
            "application/x-zip-compressed",
            "application/octet-stream",
          ],
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ kind: "delivery" }),
        };
      },
      onUploadCompleted: async ({ blob }) => {
        blog("onUploadCompleted", {
          url: blob?.url,
          pathname: blob?.pathname,
          size: (blob as { size?: number })?.size,
        });
      },
    });
    blog("handleUpload:fim", { elapsedMs: Date.now() - t0, resultKeys: Object.keys(result || {}) });
    blog("Resposta enviada ao cliente", { mode: "json-blob-client" });
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Falha no upload Blob";
    if (message === "Não autenticado" || message === "Acesso negado") {
      blog("ERRO auth", { message });
      return NextResponse.json({ error: message }, { status: 401 });
    }
    console.error("[GO-H2B-UPLOAD][api][blob-client]", err);
    blog("ERRO handleUpload", {
      message,
      name: err instanceof Error ? err.name : typeof err,
    });
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

async function storeDeliveryFile(params: {
  storedName: string;
  bytes: Buffer;
  contentType: string;
}): Promise<{ publicPath: string; storedName: string; bytes: number }> {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    blog("put():inicio", {
      storedName: params.storedName,
      bytes: params.bytes.length,
      contentType: params.contentType,
    });
    const t0 = Date.now();
    const blob = await put(`deliveries/${params.storedName}`, params.bytes, {
      access: BLOB_ACCESS,
      contentType: params.contentType,
      token: process.env.BLOB_READ_WRITE_TOKEN,
      addRandomSuffix: false,
    });
    blog("put():fim", {
      elapsedMs: Date.now() - t0,
      url: blob.url,
      pathname: blob.pathname,
    });
    return {
      publicPath: blob.url,
      storedName: params.storedName,
      bytes: params.bytes.length,
    };
  }

  blog("store:local", { storedName: params.storedName, bytes: params.bytes.length });
  const stored = await getStorageProvider().writeDelivery({
    storedName: params.storedName,
    bytes: params.bytes,
  });
  return {
    publicPath: stored.publicPath,
    storedName: stored.storedName,
    bytes: stored.bytes,
  };
}

export async function POST(req: Request) {
  const reqId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  try {
    const contentType = req.headers.get("content-type") || "";
    blog("Entrada da rota", {
      reqId,
      contentType,
      contentLength: req.headers.get("content-length"),
    });
    if (contentType.includes("application/json")) {
      return await handleBlobClientUpload(req);
    }

    blog("Validação requireAdmin (multipart)");
    await requireAdmin();

    blog("Recebimento do arquivo:formData()");
    const tForm = Date.now();
    const form = await req.formData();
    blog("Recebimento do arquivo:formData() ok", { elapsedMs: Date.now() - tForm });
    const file = form.get("file");
    const serviceId = String(form.get("serviceId") || "").trim();

    if (!(file instanceof File)) {
      blog("VALIDACAO_FALHOU", { reason: "file missing" });
      return NextResponse.json({ error: "Arquivo obrigatório." }, { status: 400 });
    }
    if (!serviceId) {
      blog("VALIDACAO_FALHOU", { reason: "serviceId missing" });
      return NextResponse.json({ error: "serviceId obrigatório." }, { status: 400 });
    }

    blog("Arquivo recebido", {
      name: file.name,
      mime: file.type || "(empty)",
      sizeBytes: file.size,
      sizeMB: Number((file.size / (1024 * 1024)).toFixed(3)),
      serviceId,
    });

    if (file.size <= 0 || file.size > MAX_BYTES) {
      blog("VALIDACAO_FALHOU", { reason: "size", size: file.size });
      return NextResponse.json(
        { error: `Arquivo inválido ou maior que ${MAX_BYTES / (1024 * 1024)}MB.` },
        { status: 400 }
      );
    }

    const originalName = file.name || "entrega";
    const ext = path.extname(originalName).toLowerCase();
    if (!ALLOWED_EXT.has(ext)) {
      blog("VALIDACAO_FALHOU", { reason: "ext", ext });
      return NextResponse.json(
        { error: "Formato não permitido. Use WAV, MP3 ou ZIP." },
        { status: 400 }
      );
    }

    const safeBase = originalName
      .replace(ext, "")
      .replace(/[^a-zA-Z0-9._-]+/g, "_")
      .slice(0, 80);
    const storedName = `${serviceId.slice(0, 8)}_${Date.now()}_${randomUUID().slice(0, 8)}_${safeBase}${ext}`;

    blog("arrayBuffer():inicio");
    const tBuf = Date.now();
    const buffer = Buffer.from(await file.arrayBuffer());
    blog("arrayBuffer():fim", { elapsedMs: Date.now() - tBuf, bytes: buffer.length });

    const stored = await storeDeliveryFile({
      storedName,
      bytes: buffer,
      contentType: file.type || mimeForExt(ext),
    });
    const format = formatFromExt(ext);

    blog("Resposta Blob / Persistência storage", {
      publicPath: stored.publicPath,
      storedName: stored.storedName,
      bytes: stored.bytes,
      format,
      note: "DB ainda NÃO atualizado nesta rota — PATCH /api/admin/servicos faz isso",
    });

    const payload = {
      ok: true,
      deliveryAudioUrl: stored.publicPath,
      deliveryAudioFormat: format,
      fileName: originalName,
      storedName: stored.storedName,
      bytes: stored.bytes,
    };
    blog("Resposta enviada ao cliente", { mode: "multipart", deliveryAudioUrl: payload.deliveryAudioUrl });
    return NextResponse.json(payload);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro no upload";
    if (message === "Não autenticado" || message === "Acesso negado") {
      blog("ERRO auth", { reqId, message });
      return NextResponse.json({ error: message }, { status: 401 });
    }
    console.error("[GO-H2B-UPLOAD][api]", err);
    blog("ERRO", {
      reqId,
      message,
      name: err instanceof Error ? err.name : typeof err,
      stack: err instanceof Error ? err.stack?.slice(0, 600) : undefined,
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
