"use client";

import { useEffect, useState } from "react";
import { formatBRL } from "@/components/design-system/tokens";
import {
  formatDurationPt,
  formatExcessLive,
  formatHhMmSs,
  resolveServiceTiming,
  timerLabel,
  type ServiceTimingFields,
} from "@/app/lib/service-timing";

function useNow(running: boolean): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, [running]);
  return now;
}

export function ServiceTimingInfo({
  service,
  compact = false,
}: {
  service: ServiceTimingFields;
  compact?: boolean;
}) {
  const preview = resolveServiceTiming(service, new Date());
  const now = useNow(preview.running);
  const timing = resolveServiceTiming(service, now);

  if (!timing.applicable) return null;
  if (!timing.running && !timing.frozen && !timing.missingHistorical) return null;

  if (timing.missingHistorical) {
    return (
      <div className={compact ? "mt-1" : "border-t border-zinc-800 px-4 py-2.5"}>
        <p className="text-[10px] uppercase tracking-wide text-zinc-500">{timerLabel(service.tipo, true)}</p>
        <p className="mt-0.5 text-xs text-zinc-500">Tempo não registrado</p>
      </div>
    );
  }

  const clockClass = timing.exceeded
    ? "font-mono tabular-nums text-sm font-semibold text-red-400"
    : "font-mono tabular-nums text-sm font-semibold text-zinc-100";

  if (timing.running) {
    return (
      <div className={compact ? "mt-1" : "border-t border-zinc-800 px-4 py-2.5"}>
        <p className="text-[10px] uppercase tracking-wide text-zinc-500">{timerLabel(service.tipo, false)}</p>
        <p className={clockClass}>{formatHhMmSs(timing.elapsedSeconds)}</p>
        {timing.exceeded && (
          <div className="mt-1 space-y-0.5 text-[11px] text-red-300/90">
            <p>Tempo excedido: {formatExcessLive(timing.excessSeconds)}</p>
            <p>
              Adicional sugerido até agora:{" "}
              {formatBRL(timing.suggestedOvertimeAmountCents / 100)}
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={compact ? "mt-1" : "border-t border-zinc-800 px-4 py-2.5"}>
      <p className="text-[10px] uppercase tracking-wide text-zinc-500">{timerLabel(service.tipo, true)}</p>
      <ul className="mt-1 space-y-0.5 text-[11px] text-zinc-400">
        <li>Duração contratada: {formatDurationPt(timing.contractedSeconds)}</li>
        <li>Duração real: {formatDurationPt(timing.elapsedSeconds)}</li>
        <li className={timing.exceeded ? "text-red-300/90" : undefined}>
          Tempo excedido: {timing.excessSeconds > 0 ? formatDurationPt(timing.excessSeconds) : "nenhum"}
        </li>
        <li>
          Adicional sugerido: {formatBRL(timing.suggestedOvertimeAmountCents / 100)}
        </li>
      </ul>
    </div>
  );
}
