"use client";

import { useMemo } from "react";
import { Card, MetricTile, Badge, DataTable } from "./shared";
import type { EngineeringData } from "./types";

export function ADRCard({ data, search = "" }: { data: EngineeringData; search?: string }) {
  const adrs = data.architectureDecisions as {
    decisions?: Array<{ id?: string; title?: string; status?: string; summary?: string; date?: string }>;
    summary?: { total?: number; accepted?: number; proposed?: number };
  } | null;

  const list = adrs?.decisions ?? [];
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return list;
    return list.filter(
      (a) =>
        a.id?.toLowerCase().includes(q) ||
        a.title?.toLowerCase().includes(q) ||
        a.summary?.toLowerCase().includes(q)
    );
  }, [list, search]);

  const accepted = list.filter((a) => (a.status ?? "").toLowerCase().includes("accept")).length;
  const proposed = list.filter((a) => (a.status ?? "").toLowerCase().includes("propos")).length;

  return (
    <Card title="Architecture Decision Records" subtitle={`${list.length} ADRs documentados`}>
      <div className="grid grid-cols-3 gap-3 mb-4">
        <MetricTile label="Total" value={list.length} />
        <MetricTile label="Aceitos" value={(accepted || adrs?.summary?.accepted) ?? 0} />
        <MetricTile label="Propostos" value={(proposed || adrs?.summary?.proposed) ?? 0} />
      </div>
      <DataTable
        headers={["ID", "Título", "Status"]}
        rows={filtered.slice(0, 30).map((a) => [
          a.id ?? "",
          (a.title ?? "").slice(0, 50),
          <Badge key={a.id} tone={(a.status ?? "").includes("Accept") ? "success" : "info"}>{a.status ?? "—"}</Badge>,
        ])}
      />
    </Card>
  );
}
