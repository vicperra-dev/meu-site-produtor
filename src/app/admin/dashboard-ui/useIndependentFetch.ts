"use client";

/**
 * GO-03C — Hook genérico de fetch independente por widget.
 * Cada widget carrega, falha e retenta sozinho — sem bloquear o dashboard.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { FetchState } from "./types";

export function useIndependentFetch<T>(
  key: string,
  loader: () => Promise<T>,
  deps: unknown[] = []
): FetchState<T> & { retry: () => void } {
  const [state, setState] = useState<FetchState<T>>({
    status: "loading",
    data: null,
    error: null,
  });
  const gen = useRef(0);

  const run = useCallback(async () => {
    const id = ++gen.current;
    setState({ status: "loading", data: null, error: null });
    try {
      const data = await loader();
      if (id !== gen.current) return;
      setState({ status: "success", data, error: null });
    } catch (err) {
      if (id !== gen.current) return;
      const msg = err instanceof Error ? err.message : "Falha ao carregar";
      setState({ status: "error", data: null, error: msg });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    void run();
  }, [run, key]);

  return { ...state, retry: () => void run() };
}

export async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    cache: "no-store",
    credentials: "include",
    headers: { "Cache-Control": "no-cache" },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      typeof body?.error === "string" ? body.error : `HTTP ${res.status}`
    );
  }
  return res.json() as Promise<T>;
}
