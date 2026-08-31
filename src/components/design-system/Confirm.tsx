"use client";

/**
 * Design System — ConfirmDialog (substitui diálogos nativos do browser).
 */

import React, { createContext, useCallback, useContext, useState } from "react";
import { Modal } from "./Overlay";
import { Button } from "./Button";
import { COPY } from "./copy";

interface ConfirmOptions {
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const [resolver, setResolver] = useState<((v: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((options) => {
    return new Promise<boolean>((resolve) => {
      setOpts(options);
      setResolver(() => resolve);
      setOpen(true);
    });
  }, []);

  function finish(value: boolean) {
    setOpen(false);
    resolver?.(value);
    setResolver(null);
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal
        open={open && !!opts}
        onClose={() => finish(false)}
        title={opts?.title}
        maxWidth="max-w-sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => finish(false)}>
              {opts?.cancelLabel ?? COPY.actions.cancel}
            </Button>
            <Button
              variant={opts?.danger ? "danger" : "primary"}
              onClick={() => finish(true)}
            >
              {opts?.confirmLabel ?? COPY.actions.confirm}
            </Button>
          </>
        }
      >
        {opts?.description && (
          <p className="text-sm text-zinc-400 leading-relaxed">{opts.description}</p>
        )}
      </Modal>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    // Sem provider: rejeita silenciosamente (providers estão no root layout).
    console.warn("[design-system] useConfirm chamado fora de ConfirmProvider");
    return async () => false;
  }
  return ctx;
}
