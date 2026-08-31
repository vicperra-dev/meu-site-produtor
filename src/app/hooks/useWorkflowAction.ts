"use client";

import { useCallback, useState } from "react";
import { useDomainSync } from "@/app/lib/synchronization/DomainSyncProvider";

/**
 * Protege ações de workflow contra duplo clique / reexecução.
 * Após sucesso, sinaliza refresh local/broadcast.
 */
export function useWorkflowAction<TArgs extends unknown[], TResult>(
  action: (...args: TArgs) => Promise<TResult>,
  opts?: {
    onSuccess?: (result: TResult) => void | Promise<void>;
    onError?: (err: unknown) => void;
    signalAfterSuccess?: boolean;
  }
) {
  const [pending, setPending] = useState(false);
  const { publishLocalSignal } = useDomainSync();

  const run = useCallback(
    async (...args: TArgs): Promise<TResult | undefined> => {
      if (pending) return undefined;
      setPending(true);
      try {
        const result = await action(...args);
        if (opts?.signalAfterSuccess !== false) {
          publishLocalSignal("workflow-action");
        }
        await opts?.onSuccess?.(result);
        return result;
      } catch (err) {
        opts?.onError?.(err);
        throw err;
      } finally {
        setPending(false);
      }
    },
    [action, opts, pending, publishLocalSignal]
  );

  return { run, pending, disabled: pending };
}
