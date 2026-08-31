"use client";

/**
 * Design System — Toast / feedback global (GO-03E).
 * Mensagens de sucesso/erro/info sem alterar domínio.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { cx, Intent, intentClasses } from "./tokens";
import { Icon, IconName } from "./Icons";

type ToastKind = "success" | "error" | "warning" | "info";

interface ToastItem {
  id: string;
  kind: ToastKind;
  title: string;
  description?: string;
}

interface ToastApi {
  push: (t: Omit<ToastItem, "id">) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  warning: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const KIND_INTENT: Record<ToastKind, Intent> = {
  success: "success",
  error: "error",
  warning: "warning",
  info: "info",
};

const KIND_ICON: Record<ToastKind, IconName> = {
  success: "check-circle",
  error: "x-circle",
  warning: "alert",
  info: "info",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((t: Omit<ToastItem, "id">) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setItems((prev) => [...prev.slice(-4), { ...t, id }]);
  }, []);

  const api: ToastApi = {
    push,
    success: (title, description) => push({ kind: "success", title, description }),
    error: (title, description) => push({ kind: "error", title, description }),
    warning: (title, description) => push({ kind: "warning", title, description }),
    info: (title, description) => push({ kind: "info", title, description }),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[min(100%-2rem,22rem)] flex-col gap-2"
        aria-live="polite"
        aria-relevant="additions"
      >
        {items.map((t) => (
          <ToastCard key={t.id} item={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 4200);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const intent = KIND_INTENT[item.kind];
  const c = intentClasses[intent];

  return (
    <div
      role="status"
      className={cx(
        "pointer-events-auto flex gap-3 rounded-xl border px-3.5 py-3 shadow-2xl shadow-black/50 backdrop-blur-sm animate-[slideUp_.25s_ease]",
        "bg-zinc-900/95",
        c.border
      )}
    >
      <Icon name={KIND_ICON[item.kind]} className={cx("w-4 h-4 mt-0.5 flex-shrink-0", c.text)} />
      <div className="min-w-0 flex-1">
        <p className={cx("text-sm font-semibold", c.text)}>{item.title}</p>
        {item.description && (
          <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">{item.description}</p>
        )}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="rounded-md p-1 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
        aria-label="Fechar notificação"
      >
        <Icon name="x" className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Fallback seguro fora do provider (não quebra páginas)
    return {
      push: () => undefined,
      success: () => undefined,
      error: () => undefined,
      warning: () => undefined,
      info: () => undefined,
    };
  }
  return ctx;
}
