/**
 * SYNC-01A — SSE autenticado + replay por cursor (GET).
 * Fallback POST: lista eventos desde cursor (para recovery sem EventSource).
 */

import { NextRequest } from "next/server";
import { getSessionUser } from "@/app/lib/auth";
import {
  getLatestSyncCursor,
  listSyncEventsSince,
  toPublicAgendaEnvelope,
} from "@/app/lib/synchronization/engine";
import { subscribeSync } from "@/app/lib/synchronization/hub";
import type { SyncEnvelope, SyncSurface } from "@/app/lib/synchronization/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEARTBEAT_MS = 15000;
const TAIL_POLL_MS = 4000;

function parseSurfaces(raw: string | null): SyncSurface[] | undefined {
  if (!raw) return undefined;
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean) as SyncSurface[];
}

function filterForClient(
  envelope: SyncEnvelope,
  opts: { userId: string | null; isAdmin: boolean; surfaces?: SyncSurface[] }
): SyncEnvelope | null {
  if (opts.surfaces && opts.surfaces.length && !opts.surfaces.includes("all")) {
    const want = new Set(opts.surfaces);
    if (!envelope.surfaces.includes("all") && !envelope.surfaces.some((s) => want.has(s))) {
      return null;
    }
  }

  if (opts.isAdmin) return envelope;

  if (envelope.scope === "public" || envelope.scope === "all") {
    return envelope.scope === "public" && envelope.surfaces.includes("agenda")
      ? toPublicAgendaEnvelope(envelope)
      : envelope;
  }

  if (opts.userId && envelope.userId === opts.userId) return envelope;

  // Agenda pública companion
  if (envelope.metadata?.publicAgenda && envelope.surfaces.includes("agenda")) {
    return toPublicAgendaEnvelope(envelope);
  }

  return null;
}

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  const isAdmin = !!user && user.role === "ADMIN";
  const userId = user?.id || null;

  const url = new URL(req.url);
  const surfaces = parseSurfaces(url.searchParams.get("surfaces"));
  const mode = url.searchParams.get("mode") || "sse";
  let cursor =
    url.searchParams.get("cursor") ||
    req.headers.get("Last-Event-ID") ||
    null;

  // Replay/lista JSON (fallback recovery)
  if (mode === "poll" || req.headers.get("accept")?.includes("application/json")) {
    if (!user && !(surfaces?.length === 1 && surfaces[0] === "agenda")) {
      return Response.json({ error: "Não autenticado" }, { status: 401 });
    }
    const { events, nextCursor } = await listSyncEventsSince({
      cursor,
      userId,
      isAdmin,
      surfaces,
      take: 100,
    });
    const filtered = events
      .map((e) => filterForClient(e, { userId, isAdmin, surfaces }))
      .filter(Boolean) as SyncEnvelope[];
    return Response.json({
      ok: true,
      cursor: nextCursor,
      events: filtered,
      polledAt: new Date().toISOString(),
    });
  }

  // Agenda pública pode conectar sem auth (somente surface agenda / public)
  if (!user && !(surfaces?.includes("agenda"))) {
    return new Response("Unauthorized", { status: 401 });
  }

  const encoder = new TextEncoder();
  let closed = false;
  let unsub: (() => void) | undefined;
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  let tailTimer: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream({
    start(controller) {
      const send = (line: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(line));
        } catch {
          closed = true;
        }
      };

      const pushEnvelope = (env: SyncEnvelope) => {
        const filtered = filterForClient(env, { userId, isAdmin, surfaces });
        if (!filtered) return;
        cursor = filtered.cursor;
        send(`id: ${filtered.cursor}\n`);
        send(`event: domain\n`);
        send(`data: ${JSON.stringify(filtered)}\n\n`);
      };

      (async () => {
        // Replay desde cursor
        try {
          const { events, nextCursor } = await listSyncEventsSince({
            cursor,
            userId,
            isAdmin,
            surfaces,
            take: 100,
          });
          for (const e of events) pushEnvelope(e);
          if (nextCursor) cursor = nextCursor;
          else if (!cursor) cursor = await getLatestSyncCursor();
        } catch (err) {
          console.error("[sync/events] replay error", err);
        }

        unsub = subscribeSync({
          id: `sse_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          surfaces: surfaces && surfaces.length ? surfaces : ["all"],
          onEvent: (env) => {
            pushEnvelope(env);
          },
        });

        heartbeat = setInterval(() => {
          send(`: heartbeat ${Date.now()}\n\n`);
        }, HEARTBEAT_MS);

        // Fallback: tail outbox (outras instâncias Vercel)
        tailTimer = setInterval(async () => {
          if (closed) return;
          try {
            const { events, nextCursor } = await listSyncEventsSince({
              cursor,
              userId,
              isAdmin,
              surfaces,
              take: 50,
            });
            for (const e of events) pushEnvelope(e);
            if (nextCursor) cursor = nextCursor;
          } catch (err) {
            console.error("[sync/events] tail error", err);
          }
        }, TAIL_POLL_MS);
      })();

      req.signal.addEventListener("abort", () => {
        closed = true;
        if (heartbeat) clearInterval(heartbeat);
        if (tailTimer) clearInterval(tailTimer);
        if (unsub) unsub();
        try {
          controller.close();
        } catch {
          /* ignore */
        }
      });
    },
    cancel() {
      closed = true;
      if (heartbeat) clearInterval(heartbeat);
      if (tailTimer) clearInterval(tailTimer);
      if (unsub) unsub();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
