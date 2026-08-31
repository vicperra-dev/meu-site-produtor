"use client";

/**
 * GO-03A — Modal profissional de entrega (PARTE 6).
 * Upload:
 * - ≤4MB: multipart → API (Blob put ou disco local)
 * - >4MB: @vercel/blob client PUT (sem multipart — evita travar em ~5%)
 * Conclusão: PATCH /api/admin/servicos (completeService).
 */
import { useCallback, useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { deliveryDisplayName } from "@/app/lib/delivery-url-validation";
import type { AdminService } from "./types";
import { StatusBadge } from "./Badges";
import { Icons, formatBytes, formatDateTime, serviceTypeLabel } from "./meta";
import { Spinner } from "./States";

const MAX_BYTES = 80 * 1024 * 1024;
const ALLOWED = ["wav", "mp3", "zip"] as const;
type Formato = (typeof ALLOWED)[number];

interface UploadedInfo {
  url: string;
  formato: Formato;
  fileName: string;
  size: number;
  mime: string;
}

export function DeliveryModal({
  service,
  onClose,
  onSaved,
}: {
  service: AdminService;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState<UploadedInfo | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const doUpload = useCallback(
    async (file: File) => {
      const diagId = `upl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const log = (step: string, data?: Record<string, unknown>) => {
        console.log(`[GO-H2B-UPLOAD][${diagId}] ${step}`, {
          t: new Date().toISOString(),
          serviceId: service.id,
          ...data,
        });
      };

      setError(null);
      const ext = (file.name.split(".").pop() || "").toLowerCase();
      log("Arquivo selecionado", {
        name: file.name,
        ext,
        mime: file.type || "(empty)",
        sizeBytes: file.size,
        sizeMB: Number((file.size / (1024 * 1024)).toFixed(3)),
      });

      if (!ALLOWED.includes(ext as Formato)) {
        setError("Formato não permitido. Use WAV, MP3 ou ZIP.");
        log("VALIDACAO_REJEITADA", { reason: "ext" });
        return;
      }
      if (file.size <= 0 || file.size > MAX_BYTES) {
        setError("Arquivo inválido ou maior que 80MB.");
        log("VALIDACAO_REJEITADA", { reason: "size" });
        return;
      }
      setUploading(true);
      setProgress(0);
      setUploaded(null);
      log("Preparando upload");

      const finish = (url: string) => {
        log("Upload finalizado", { url });
        setUploaded({
          url,
          formato: (ext === "mp3" ? "mp3" : ext === "zip" ? "zip" : "wav") as Formato,
          fileName: file.name,
          size: file.size,
          mime: file.type || (ext === "zip" ? "application/zip" : `audio/${ext}`),
        });
        setProgress(100);
      };

      /** Multipart com XHR: progresso real (ideal até ~4MB no limite de body Vercel). */
      const uploadMultipart = () =>
        new Promise<string>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          log("Enviando arquivo", {
            mode: "xhr-multipart",
            endpoint: "/api/admin/servicos/upload-entrega",
            method: "POST",
          });
          xhr.open("POST", "/api/admin/servicos/upload-entrega");
          xhr.withCredentials = true;
          xhr.upload.onprogress = (ev) => {
            if (ev.lengthComputable && ev.total > 0) {
              const pct = Math.min(99, Math.round((ev.loaded / ev.total) * 100));
              setProgress(pct);
              if (pct === 1 || pct % 10 === 0 || pct >= 95) {
                log("XHR_PROGRESS", { loaded: ev.loaded, total: ev.total, pct });
              }
            } else if (ev.loaded > 0) {
              setProgress((p) => Math.min(90, Math.max(p, 15)));
            }
          };
          xhr.onload = () => {
            log("Resposta recebida", {
              mode: "xhr-multipart",
              status: xhr.status,
              statusText: xhr.statusText,
              bodyPreview: String(xhr.responseText || "").slice(0, 500),
            });
            try {
              const data = JSON.parse(xhr.responseText || "{}");
              if (xhr.status >= 200 && xhr.status < 300 && data.deliveryAudioUrl) {
                log("Upload concluído", {
                  mode: "xhr-multipart",
                  deliveryAudioUrl: data.deliveryAudioUrl,
                });
                resolve(String(data.deliveryAudioUrl));
              } else {
                reject(new Error(data.error || `Falha no upload (${xhr.status})`));
              }
            } catch {
              reject(new Error(`Falha no upload (${xhr.status})`));
            }
          };
          xhr.onerror = () => {
            log("XHR_ERROR", { readyState: xhr.readyState, status: xhr.status });
            reject(new Error("Falha de rede no upload."));
          };
          xhr.ontimeout = () => {
            log("XHR_TIMEOUT", { timeoutMs: xhr.timeout });
            reject(new Error("Tempo esgotado no upload."));
          };
          xhr.timeout = 10 * 60 * 1000;
          const fd = new FormData();
          fd.append("file", file);
          fd.append("serviceId", service.id);
          xhr.send(fd);
        });

      try {
        const VERCEL_BODY_SAFE = 4 * 1024 * 1024;
        if (file.size <= VERCEL_BODY_SAFE) {
          log("RAMO", { path: "xhr-multipart", reason: `size<=${VERCEL_BODY_SAFE}` });
          const url = await uploadMultipart();
          finish(url);
          return;
        }

        log("RAMO", { path: "vercel-blob-client", reason: `size>${VERCEL_BODY_SAFE}` });
        setProgress(5);
        const safeBase = file.name
          .replace(/\.[^.]+$/, "")
          .replace(/[^a-zA-Z0-9._-]+/g, "_")
          .slice(0, 80);
        const rand = crypto.randomUUID().slice(0, 8);
        const pathname = `deliveries/${service.id.slice(0, 8)}_${Date.now()}_${rand}_${safeBase}.${ext}`;
        const contentType =
          file.type ||
          (ext === "zip"
            ? "application/zip"
            : ext === "mp3"
              ? "audio/mpeg"
              : "audio/wav");

        log("Solicitando Upload URL", {
          pathname,
          contentType,
          handleUploadUrl: "/api/admin/servicos/upload-entrega",
          multipart: false,
          note: "Promise pendente = upload() [@vercel/blob/client] — stages internas: retrieveClientToken → PUT blob",
        });

        const t0 = performance.now();
        let firstProgressAt: number | null = null;
        let lastPct = 5;
        const networkHits: Array<Record<string, unknown>> = [];

        // Instrumentação temporária GO-H2B: observar fetch/XHR do SDK sem alterar o fluxo.
        const origFetch = window.fetch.bind(window);
        window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
          const url =
            typeof input === "string"
              ? input
              : input instanceof URL
                ? input.href
                : input.url;
          const method = (init?.method || (input instanceof Request ? input.method : "GET")).toUpperCase();
          const isUploadApi = url.includes("/api/admin/servicos/upload-entrega");
          const isBlobHost = /blob\.vercel-storage\.com|vercel-storage\.com/i.test(url);
          if (isUploadApi || isBlobHost) {
            log("NETWORK_FETCH_OUT", { url: url.slice(0, 180), method });
            const tf = performance.now();
            try {
              const res = await origFetch(input, init);
              const hit = {
                kind: "fetch",
                url: url.slice(0, 180),
                method,
                status: res.status,
                elapsedMs: Math.round(performance.now() - tf),
              };
              networkHits.push(hit);
              log("NETWORK_FETCH_IN", hit);
              return res;
            } catch (e) {
              const err = e instanceof Error ? e : new Error(String(e));
              log("NETWORK_FETCH_ERR", {
                url: url.slice(0, 180),
                method,
                name: err.name,
                message: err.message,
              });
              throw e;
            }
          }
          return origFetch(input, init);
        };

        const XHRProto = XMLHttpRequest.prototype;
        const origOpen = XHRProto.open;
        const origSend = XHRProto.send;
        XHRProto.open = function (method: string, url: string | URL, ...rest: unknown[]) {
          (this as XMLHttpRequest & { __h2bUrl?: string; __h2bMethod?: string }).__h2bUrl =
            String(url);
          (this as XMLHttpRequest & { __h2bMethod?: string }).__h2bMethod = method;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return (origOpen as any).apply(this, [method, url, ...rest]);
        };
        XHRProto.send = function (body?: Document | XMLHttpRequestBodyInit | null) {
          const self = this as XMLHttpRequest & { __h2bUrl?: string; __h2bMethod?: string };
          const url = self.__h2bUrl || "";
          const method = self.__h2bMethod || "GET";
          const isBlobHost = /blob\.vercel-storage\.com|vercel-storage\.com/i.test(url);
          if (isBlobHost) {
            const ts = performance.now();
            log("NETWORK_XHR_OUT", { url: url.slice(0, 180), method });
            self.addEventListener("loadend", () => {
              const hit = {
                kind: "xhr",
                url: url.slice(0, 180),
                method,
                status: self.status,
                elapsedMs: Math.round(performance.now() - ts),
              };
              networkHits.push(hit);
              log("NETWORK_XHR_IN", hit);
            });
            self.addEventListener("error", () => {
              log("NETWORK_XHR_ERR", { url: url.slice(0, 180), method, status: self.status });
            });
            self.addEventListener("timeout", () => {
              log("NETWORK_XHR_TIMEOUT", { url: url.slice(0, 180), method });
            });
          }
          return origSend.call(this, body);
        };

        const heartbeat = window.setInterval(() => {
          const elapsedMs = Math.round(performance.now() - t0);
          log("HEARTBEAT_await_upload", {
            elapsedMs,
            lastPct,
            firstProgressAt,
            networkHits: networkHits.length,
            lastNetwork: networkHits[networkHits.length - 1] || null,
            pending:
              firstProgressAt == null
                ? "likely retrieveClientToken (POST handleUploadUrl) ou aguardando 1º byte"
                : "likely PUT to Blob storage ainda em andamento",
          });
        }, 10000);

        let blob;
        try {
          blob = await upload(pathname, file, {
            access:
              process.env.NEXT_PUBLIC_BLOB_DELIVERY_ACCESS === "private"
                ? "private"
                : "public",
            handleUploadUrl: "/api/admin/servicos/upload-entrega",
            contentType,
            multipart: false,
            onUploadProgress: ({ loaded, total, percentage }) => {
              if (firstProgressAt == null) {
                firstProgressAt = Math.round(performance.now() - t0);
                log("Upload URL recebida (inferido: 1º progresso)", {
                  firstProgressAtMs: firstProgressAt,
                  loaded,
                  total,
                  percentage,
                });
              }
              if (typeof percentage === "number" && Number.isFinite(percentage)) {
                lastPct = Math.max(5, Math.min(99, Math.round(percentage)));
                setProgress(lastPct);
              } else if (total && total > 0) {
                lastPct = Math.max(5, Math.min(99, Math.round((loaded / total) * 100)));
                setProgress(lastPct);
              } else if (loaded > 0) {
                setProgress((p) => {
                  lastPct = Math.min(90, Math.max(p, 20));
                  return lastPct;
                });
              }
              const pct =
                typeof percentage === "number"
                  ? Math.round(percentage)
                  : total
                    ? Math.round((loaded / total) * 100)
                    : -1;
              if (pct <= 5 || pct % 10 === 0 || pct >= 95) {
                log("BLOB_PROGRESS", { loaded, total, percentage, pct });
              }
            },
          });
        } finally {
          window.clearInterval(heartbeat);
          window.fetch = origFetch;
          XHRProto.open = origOpen;
          XHRProto.send = origSend;
          log("NETWORK_SUMMARY", { hits: networkHits });
        }
        log("Upload URL recebida / Upload concluído", {
          mode: "vercel-blob-client",
          elapsedMs: Math.round(performance.now() - t0),
          url: blob?.url || null,
          pathname: blob?.pathname || null,
          firstProgressAtMs: firstProgressAt,
        });
        if (!blob?.url) {
          throw new Error("Upload Blob concluído sem URL.");
        }
        log("Resposta recebida", { mode: "vercel-blob-client", url: blob.url });
        finish(blob.url);
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        log("ERRO", {
          name: err.name,
          message: err.message,
          stack: err.stack?.slice(0, 800),
        });
        const msg = err.message || "Falha no upload.";
        setError(msg.includes("Formato não permitido") ? msg : `Falha no upload. ${msg}`);
      } finally {
        log("FINALLY_uploading=false");
        setUploading(false);
      }
    },
    [service.id]
  );

  async function salvar() {
    if (!uploaded) return;
    const diagId = `save_${Date.now()}`;
    console.log(`[GO-H2B-UPLOAD][${diagId}] Atualizando Service`, {
      serviceId: service.id,
      deliveryAudioUrl: uploaded.url,
      deliveryAudioFormat: uploaded.formato,
    });
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/servicos?id=${service.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "concluido",
          deliveryAudioUrl: uploaded.url,
          deliveryAudioFormat: uploaded.formato,
        }),
      });
      const data = await res.json().catch(() => ({}));
      console.log(`[GO-H2B-UPLOAD][${diagId}] PATCH resposta`, {
        status: res.status,
        body: data,
      });
      if (!res.ok) {
        setError(data.error || "Erro ao concluir. Verifique o arquivo.");
        return;
      }
      console.log(`[GO-H2B-UPLOAD][${diagId}] Upload finalizado (domínio)`);
      await onSaved();
      onClose();
    } catch (e) {
      console.error(`[GO-H2B-UPLOAD][${diagId}] PATCH erro`, e);
      setError("Erro ao salvar a entrega. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  const isAudioPreview = uploaded && uploaded.formato !== "zip";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !uploading && !saving) onClose();
      }}
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
          <h2 className="flex items-center gap-2 text-base font-bold text-zinc-100">
            <Icons.upload className="w-4 h-4 text-green-400" />
            Entregar Serviço
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={uploading || saving}
            className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-40"
            aria-label="Fechar"
          >
            <Icons.x className="w-4 h-4" />
          </button>
        </div>

        {/* Informações */}
        <div className="grid grid-cols-2 gap-3 border-b border-zinc-800 px-5 py-4 text-xs">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-zinc-500">Cliente</p>
            <p className="font-medium text-zinc-200">{service.user.nomeArtistico}</p>
            <p className="text-[11px] text-zinc-500">{service.user.email}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-zinc-500">Serviço</p>
            <p className="font-medium text-zinc-200">{serviceTypeLabel(service.tipo)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-zinc-500">Agendamento</p>
            <p className="text-zinc-300">
              {service.appointment
                ? `#${service.appointment.id} · ${formatDateTime(service.appointment.data)}`
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-zinc-500">Status</p>
            <StatusBadge status={service.status} className="mt-0.5" />
          </div>
          {service.deliveryAudioUrl && !uploaded && (
            <div className="col-span-2">
              <p className="text-[10px] uppercase tracking-wide text-zinc-500">Arquivo atual</p>
              <p className="truncate text-zinc-300">{deliveryDisplayName(service.deliveryAudioUrl)}</p>
            </div>
          )}
        </div>

        {/* Área de upload */}
        <div className="px-5 py-4">
          {!uploaded ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const file = e.dataTransfer.files?.[0];
                if (file && !uploading) void doUpload(file);
              }}
              className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
                dragOver
                  ? "border-green-500/70 bg-green-500/5"
                  : "border-zinc-700 bg-zinc-800/40 hover:border-zinc-500"
              }`}
            >
              {uploading ? (
                <>
                  <Spinner className="w-7 h-7 text-green-400" />
                  <p className="text-sm font-medium text-zinc-200">Enviando arquivo… {progress}%</p>
                  <div className="h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-zinc-700">
                    <div
                      className="h-full rounded-full bg-green-500 transition-all duration-200"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </>
              ) : (
                <>
                  <span className="rounded-full border border-zinc-700 bg-zinc-800 p-3 text-zinc-400">
                    <Icons.upload className="w-6 h-6" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-zinc-200">
                      Arraste o arquivo aqui ou{" "}
                      <button
                        type="button"
                        onClick={() => inputRef.current?.click()}
                        className="text-green-400 underline-offset-2 hover:underline"
                      >
                        selecione
                      </button>
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">WAV, MP3 ou ZIP · até 80MB</p>
                  </div>
                </>
              )}
              <input
                ref={inputRef}
                type="file"
                accept=".wav,.mp3,.zip,audio/wav,audio/mpeg,application/zip"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void doUpload(file);
                  e.target.value = "";
                }}
              />
            </div>
          ) : (
            <div className="space-y-3 rounded-xl border border-green-500/30 bg-green-500/5 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-green-300">
                <Icons.checkCircle className="w-4 h-4" />
                Arquivo enviado
              </p>
              <div className="flex items-start gap-3">
                <span className="rounded-lg border border-zinc-700 bg-zinc-800 p-2 text-purple-300">
                  {uploaded.formato === "zip" ? <Icons.file className="w-5 h-5" /> : <Icons.music className="w-5 h-5" />}
                </span>
                <div className="min-w-0 text-xs">
                  <p className="truncate font-medium text-zinc-200">{uploaded.fileName}</p>
                  <p className="text-zinc-500">
                    {formatBytes(uploaded.size)} · {uploaded.mime} · {uploaded.formato.toUpperCase()}
                  </p>
                </div>
              </div>
              {isAudioPreview && (
                <audio controls preload="metadata" className="h-9 w-full" src={uploaded.url}>
                  Seu navegador não reproduz áudio.
                </audio>
              )}
              <div className="flex flex-wrap gap-2 pt-1">
                <a
                  href={uploaded.url}
                  download={uploaded.fileName}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-600 px-2.5 py-1.5 text-xs font-medium text-zinc-200 transition-colors hover:border-zinc-400"
                >
                  <Icons.download className="w-3 h-3" />
                  Download
                </a>
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-600 px-2.5 py-1.5 text-xs font-medium text-zinc-200 transition-colors hover:border-zinc-400"
                >
                  <Icons.refresh className="w-3 h-3" />
                  Substituir arquivo
                </button>
                <button
                  type="button"
                  onClick={() => setUploaded(null)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-800 px-2.5 py-1.5 text-xs font-medium text-red-300 transition-colors hover:bg-red-900/40"
                >
                  <Icons.trash className="w-3 h-3" />
                  Excluir arquivo
                </button>
              </div>
              <input
                ref={inputRef}
                type="file"
                accept=".wav,.mp3,.zip,audio/wav,audio/mpeg,application/zip"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void doUpload(file);
                  e.target.value = "";
                }}
              />
            </div>
          )}

          {error && (
            <p className="mt-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {error}
            </p>
          )}
        </div>

        {/* Rodapé */}
        <div className="flex justify-end gap-2 border-t border-zinc-800 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={uploading || saving}
            className="rounded-lg border border-zinc-600 px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={salvar}
            disabled={!uploaded || uploading || saving}
            className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-500 disabled:opacity-50"
          >
            {saving && <Spinner className="w-3.5 h-3.5" />}
            {saving ? "Salvando…" : "Salvar entrega"}
          </button>
        </div>
      </div>
    </div>
  );
}
