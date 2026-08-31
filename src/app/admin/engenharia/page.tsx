"use client";

import { useEffect, useState } from "react";
import { EngineeringDashboard } from "@/components/admin/engineering/EngineeringDashboard";
import type { EngineeringData } from "@/components/admin/engineering/types";
import {
  EmptyState,
  ErrorState,
  LoadingBlock,
  PageHeader,
} from "@/components/design-system";

export default function EngenhariaAdminPage() {
  const [data, setData] = useState<EngineeringData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/admin/engenharia/reports");
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `Erro ${res.status}`);
        }
        const json = (await res.json()) as EngineeringData;
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Erro ao carregar relatórios");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <LoadingBlock label="Carregando Engineering Dashboard…" />;
  }

  if (error) {
    return (
      <ErrorState
        title="Não foi possível carregar Engenharia"
        description={error}
        onRetry={() => {
          setLoading(true);
          setError(null);
          setData(null);
          void fetch("/api/admin/engenharia/reports")
            .then(async (res) => {
              if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.error ?? `Erro ${res.status}`);
              }
              return res.json() as Promise<EngineeringData>;
            })
            .then(setData)
            .catch((e) => setError(e instanceof Error ? e.message : "Erro ao carregar"))
            .finally(() => setLoading(false));
        }}
      />
    );
  }

  if (!data) {
    return (
      <EmptyState
        icon="box"
        title="Sem relatórios de engenharia"
        description="Nenhum dado disponível no momento."
      />
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Engenharia" subtitle="Health, debt, roadmap e decisões técnicas" icon="sparkles" />
      <EngineeringDashboard data={data} />
    </div>
  );
}
