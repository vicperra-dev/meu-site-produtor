"use client";

/**
 * Design System — Timeline vertical genérica.
 * Usada para timeline de pedidos, notificações e histórico.
 */

import React from "react";
import { cx, Intent, intentClasses } from "./tokens";
import { Icon, IconName } from "./Icons";

export type TimelineState = "done" | "current" | "pending" | "error";

export interface TimelineItemData {
  key: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  meta?: React.ReactNode;
  state?: TimelineState;
  intent?: Intent;
  icon?: IconName;
}

function markerClasses(state: TimelineState, intent?: Intent): string {
  if (intent) {
    const c = intentClasses[intent];
    return cx(c.bg, c.text, c.border, "border");
  }
  switch (state) {
    case "done":
      return "bg-emerald-500/15 text-emerald-300 border border-emerald-500/40";
    case "current":
      return "bg-sky-500/15 text-sky-300 border border-sky-500/40 ring-2 ring-sky-500/20";
    case "error":
      return "bg-red-500/15 text-red-300 border border-red-500/40";
    default:
      return "bg-zinc-800 text-zinc-500 border border-zinc-700";
  }
}

export function Timeline({
  items,
  compact = false,
  className,
}: {
  items: TimelineItemData[];
  compact?: boolean;
  className?: string;
}) {
  return (
    <ol className={cx("relative", className)}>
      {items.map((item, idx) => {
        const state = item.state ?? "pending";
        const isLast = idx === items.length - 1;
        return (
          <li key={item.key} className="relative flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={cx(
                  "flex items-center justify-center rounded-full flex-shrink-0",
                  compact ? "w-6 h-6" : "w-7 h-7",
                  markerClasses(state, item.intent)
                )}
              >
                <Icon
                  name={
                    item.icon ??
                    (state === "done"
                      ? "check"
                      : state === "error"
                      ? "x"
                      : "clock")
                  }
                  className={compact ? "w-3 h-3" : "w-3.5 h-3.5"}
                />
              </span>
              {!isLast && (
                <span
                  className={cx(
                    "w-px flex-1 min-h-4",
                    state === "done" ? "bg-emerald-500/30" : "bg-zinc-800"
                  )}
                />
              )}
            </div>
            <div className={cx("min-w-0 flex-1", isLast ? "pb-0" : compact ? "pb-3" : "pb-4")}>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <p
                  className={cx(
                    "text-sm font-medium",
                    state === "pending" ? "text-zinc-500" : "text-zinc-200"
                  )}
                >
                  {item.title}
                </p>
                {item.meta && <span className="text-[11px] text-zinc-500">{item.meta}</span>}
              </div>
              {item.description && (
                <div className="text-xs text-zinc-500 mt-0.5">{item.description}</div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
