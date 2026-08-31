"use client";

/**
 * GO-H12 — Central de Notificações (persistida no banco).
 */

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Card,
  EmptyState,
  Section,
  cx,
  formatDateTime,
} from "@/components/design-system";
import type { PortalData, PortalNotification } from "./types";

export function NotificationsSection({
  data,
  onMarkRead,
}: {
  data: PortalData;
  onMarkRead: (ids: string[] | "all") => Promise<void>;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const items = useMemo(
    () => [...(data.notifications ?? [])].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ),
    [data.notifications]
  );
  const unread = items.filter((n) => !n.readAt).length;

  async function openNotification(n: PortalNotification) {
    if (!n.readAt) {
      setBusy(true);
      try {
        await onMarkRead([n.id]);
      } finally {
        setBusy(false);
      }
    }
    if (n.actionHref) {
      router.push(n.actionHref);
    }
  }

  return (
    <Section
      title="Notificações"
      icon="bell"
      description="Avisos importantes da sua conta, do mais recente ao mais antigo."
      actions={
        unread > 0 ? (
          <Button
            variant="ghost"
            size="xs"
            disabled={busy}
            onClick={() => {
              setBusy(true);
              void onMarkRead("all").finally(() => setBusy(false));
            }}
          >
            Marcar todas como lidas ({unread})
          </Button>
        ) : undefined
      }
    >
      {items.length === 0 ? (
        <EmptyState
          icon="bell"
          title="Nenhuma notificação por enquanto"
          description="Aceites, inícios, conclusões, recusas e cancelamentos aparecerão aqui."
        />
      ) : (
        <div className="space-y-2">
          {items.map((n) => {
            const isUnread = !n.readAt;
            return (
              <Card
                key={n.id}
                className={cx(
                  "space-y-2 transition-colors",
                  isUnread ? "border-red-500/40 bg-red-500/5" : ""
                )}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={cx(
                      "mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full",
                      isUnread ? "bg-red-400" : "bg-zinc-700"
                    )}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3
                        className={cx(
                          "text-sm",
                          isUnread ? "font-semibold text-zinc-50" : "font-medium text-zinc-200"
                        )}
                      >
                        {n.title}
                      </h3>
                      {isUnread && (
                        <span className="rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
                          Nova
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-zinc-400 whitespace-pre-line">{n.message}</p>
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <p className="text-[11px] text-zinc-600">
                        {formatDateTime(n.createdAt)}
                        {n.readAt ? " · Lida" : " · Não lida"}
                      </p>
                      <div className="flex gap-2">
                        {isUnread && (
                          <Button
                            variant="ghost"
                            size="xs"
                            disabled={busy}
                            onClick={() => {
                              setBusy(true);
                              void onMarkRead([n.id]).finally(() => setBusy(false));
                            }}
                          >
                            Marcar como lida
                          </Button>
                        )}
                        {n.actionLabel && n.actionHref && (
                          <Button
                            variant="secondary"
                            size="xs"
                            disabled={busy}
                            onClick={() => void openNotification(n)}
                          >
                            {n.actionLabel}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </Section>
  );
}
