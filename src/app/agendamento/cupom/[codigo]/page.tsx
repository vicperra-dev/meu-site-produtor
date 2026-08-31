"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { CouponScheduleFields } from "@/app/agendamento/components/CouponScheduleFields";
import { PRODUCTION_SCHEDULE_DEFAULT_HOUR } from "@/app/lib/agendamento-payment-rules";
import { serviceNeedsStudioHours } from "@/app/agendamento/scheduling-shared";
import {
  Button,
  Callout,
  Card,
  Field,
  LinkButton,
  LoadingBlock,
  PageHeader,
  Textarea,
  useFeedback,
} from "@/components/design-system";

type CouponPayload = {
  code: string;
  typeLabel: string;
  serviceType: string | null;
  exclusiveScheduling: boolean;
  checkoutDiscount: boolean;
  used: boolean;
  status: string;
  catalogItem: { id: string; nome: string; preco: number; category: "service" | "beat" } | null;
};

export default function AgendamentoCupomPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { notifySuccess, notifyError, notify } = useFeedback();
  const codigo = String(params?.codigo || "").toUpperCase();

  const [coupon, setCoupon] = useState<CouponPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [dataSelecionada, setDataSelecionada] = useState<string>("");
  const [horaSelecionada, setHoraSelecionada] = useState<string>("");
  const [observacoes, setObservacoes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!codigo) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/coupons/${encodeURIComponent(codigo)}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Cupom inválido.");
        setCoupon(null);
        return;
      }
      const c = data.coupon as CouponPayload;
      if (c.checkoutDiscount && !c.exclusiveScheduling) {
        router.replace(`/agendamento?cupom=${encodeURIComponent(c.code)}`);
        return;
      }
      if (!c.exclusiveScheduling) {
        setError("Este cupom não abre agenda exclusiva.");
        setCoupon(null);
        return;
      }
      if (c.used || c.status === "utilizado") {
        setError("Este cupom já foi utilizado.");
      }
      setCoupon(c);
    } catch {
      setError("Erro ao carregar cupom.");
    } finally {
      setLoading(false);
    }
  }, [codigo, router]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push(`/login?redirect=/agendamento/cupom/${encodeURIComponent(codigo)}`);
      return;
    }
    void load();
  }, [authLoading, user, load, router, codigo]);

  const precisaHora = useMemo(
    () => serviceNeedsStudioHours(coupon?.serviceType),
    [coupon]
  );

  async function confirmar() {
    if (!coupon?.catalogItem || !coupon.serviceType) {
      notifyError("Cupom sem serviço vinculado.");
      return;
    }
    if (!dataSelecionada) {
      notify(precisaHora ? "Selecione data e horário." : "Selecione a data de entrega desejada.");
      return;
    }
    if (precisaHora && !horaSelecionada) {
      notify("Selecione o horário.");
      return;
    }
    const hora = precisaHora ? horaSelecionada : PRODUCTION_SCHEDULE_DEFAULT_HOUR;
    const item = {
      id: coupon.catalogItem.id,
      nome: coupon.catalogItem.nome,
      quantidade: 1,
      preco: coupon.catalogItem.preco,
    };
    const body = {
      data: dataSelecionada,
      hora,
      duracaoMinutos: 60,
      tipo: coupon.serviceType,
      observacoes: observacoes || `Resgate cupom ${coupon.code}`,
      servicos: coupon.catalogItem.category === "service" ? [item] : [],
      beats: coupon.catalogItem.category === "beat" ? [item] : [],
      cupomCode: coupon.code,
    };

    try {
      setSubmitting(true);
      const res = await fetch("/api/agendamentos/com-cupom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        notifyError(data.error || "Não foi possível agendar com este cupom.");
        return;
      }
      notifySuccess("Agendamento criado com sucesso.", "Acompanhe em Minha Conta.");
      router.push("/minha-conta");
    } catch {
      notifyError("Erro inesperado ao agendar.");
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading || loading) {
    return (
      <main className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-6">
        <LoadingBlock label="Carregando cupom…" />
      </main>
    );
  }

  if (error && !coupon) {
    return (
      <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
        <div className="max-w-lg mx-auto space-y-4">
          <PageHeader title="Cupom indisponível" />
          <Callout intent="error">{error}</Callout>
          <LinkButton href="/minha-conta" variant="outline">
            Voltar para Minha Conta
          </LinkButton>
        </div>
      </main>
    );
  }

  if (!coupon?.catalogItem) {
    return (
      <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
        <div className="max-w-lg mx-auto space-y-4">
          <PageHeader title="Serviço do cupom inválido" />
          <Callout intent="error">
            O cupom {coupon?.code} não possui um serviço reconhecido no catálogo.
          </Callout>
          <LinkButton href="/minha-conta" variant="outline">
            Voltar para Minha Conta
          </LinkButton>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-8">
      <div className="max-w-xl mx-auto space-y-6">
        <div className="space-y-2">
          <PageHeader
            title={coupon.catalogItem.nome}
            subtitle="Agenda exclusiva do cupom"
          />
          <p className="text-sm text-zinc-400">
            Código <span className="font-mono text-zinc-200">{coupon.code}</span> · {coupon.typeLabel}
          </p>
          <p className="text-sm text-zinc-500 mt-2">
            Este cupom está vinculado permanentemente a este serviço. Não pode ser usado em outro
            tipo de agendamento nem convertido em crédito.
          </p>
          {error && <Callout intent="warning">{error}</Callout>}
        </div>

        <Card className="space-y-4">
          <CouponScheduleFields
            serviceType={coupon.serviceType}
            serviceName={coupon.catalogItem.nome}
            dataSelecionada={dataSelecionada}
            horaSelecionada={horaSelecionada}
            onDataChange={setDataSelecionada}
            onHoraChange={setHoraSelecionada}
          />
          <Field label="Observações (opcional)">
            <Textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={3}
              placeholder="Detalhes do projeto…"
            />
          </Field>
          <Button
            type="button"
            disabled={submitting || coupon.used}
            onClick={() => void confirmar()}
            variant="primary"
            fullWidth
            loading={submitting}
          >
            Confirmar agendamento com cupom
          </Button>
        </Card>

        <LinkButton href="/minha-conta" variant="ghost">
          ← Voltar para Minha Conta
        </LinkButton>
      </div>
    </main>
  );
}
