/**
 * GO-00 — execute Homologation Engine for SKUs not in official catalog (no product code change).
 */
import { PrismaClient } from "@prisma/client";
import { runHomologationSimulation } from "../src/app/lib/homologation/engine";
import { listCouponServiceTypesForAgendamentoItems } from "../src/app/lib/agendamento-payment-coupons";
import { isSchedulableServiceType } from "../src/app/lib/service-catalog";

const prisma = new PrismaClient();

type Sku = {
  id: string;
  label: string;
  servicos?: { id: string; nome: string; quantidade: number }[];
  beats?: { id: string; nome: string; quantidade: number }[];
};

const SKUS: Sku[] = [
  { id: "captacao", label: "Captação", servicos: [{ id: "captacao", nome: "Captação", quantidade: 1 }] },
  { id: "mix", label: "Mixagem", servicos: [{ id: "mix", nome: "Mixagem", quantidade: 1 }] },
  { id: "master", label: "Masterização", servicos: [{ id: "master", nome: "Masterização", quantidade: 1 }] },
  { id: "mix_master", label: "Mix + Master", servicos: [{ id: "mix_master", nome: "Mix + Master", quantidade: 1 }] },
  { id: "producao_completa", label: "Produção Completa", servicos: [{ id: "producao_completa", nome: "Produção Completa", quantidade: 1 }] },
  { id: "sonoplastia", label: "Sonoplastia", servicos: [{ id: "sonoplastia", nome: "Sonoplastia", quantidade: 1 }] },
  {
    id: "sessao_mix",
    label: "Sessão + Mix",
    servicos: [
      { id: "sessao", nome: "Sessão", quantidade: 1 },
      { id: "mix", nome: "Mixagem", quantidade: 1 },
    ],
  },
  {
    id: "beat_mix",
    label: "Beat + Mix",
    servicos: [{ id: "mix", nome: "Mixagem", quantidade: 1 }],
    beats: [{ id: "beat1", nome: "1 Beat", quantidade: 1 }],
  },
];

function tomorrow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

async function main() {
  const results: unknown[] = [];
  for (const sku of SKUS) {
    const stamp = `${Date.now()}-${sku.id}`;
    const email = `go00-sku-${stamp}@homolog.test`;
    const user = await prisma.user.create({
      data: {
        nomeCompleto: `GO00 ${sku.label}`,
        nomeArtistico: `GO00 ${sku.id}`,
        email,
        senha: "go00-certification-only",
        telefone: "11999999999",
        pais: "Brasil",
        estado: "SP",
        cidade: "Sao Paulo",
        bairro: "Centro",
        dataNascimento: new Date("1990-01-01"),
        role: "ADMIN",
      },
    });
    try {
      const servicos = sku.servicos || [];
      const beats = sku.beats || [];
      const expected = listCouponServiceTypesForAgendamentoItems(servicos, beats).length;
      const needsDate = [...servicos, ...beats].some((i) => isSchedulableServiceType(i.id)) && expected === 0;
      // multi / coupons-only: no date → N coupons; single schedulable alone → appointment
      const schedulableAlone =
        expected === 0 &&
        servicos.length + beats.length === 1 &&
        isSchedulableServiceType((servicos[0] || beats[0]).id);

      const run = await runHomologationSimulation({
        userId: user.id,
        userEmail: user.email,
        userName: user.nomeArtistico,
        tipo: "agendamento",
        servicos,
        beats,
        ...(schedulableAlone || needsDate
          ? { data: tomorrow(), hora: "14:00", duracaoMinutos: 60 }
          : {}),
        observacoes: `GO-00 SKU ${sku.id}`,
        expectedServiceCoupons: schedulableAlone ? 0 : expected,
        runRefund: false,
      });
      results.push({
        scenario: sku.id,
        label: sku.label,
        ok: run.ok,
        error: run.error || null,
        expectedCoupons: schedulableAlone ? 0 : expected,
        coupons: run.couponCodes || [],
        appointments: run.appointmentIds || [],
        services: run.serviceIds || [],
        checks: (run.checks || []).map((c) => ({ key: c.key, ok: c.ok, detail: c.detail || null })),
        runId: run.runId,
      });
    } catch (e) {
      results.push({
        scenario: sku.id,
        label: sku.label,
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      });
    } finally {
      await prisma.user.delete({ where: { id: user.id } }).catch(() => null);
    }
  }
  console.log("GO00_SKU_RESULTS=" + JSON.stringify(results));
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
