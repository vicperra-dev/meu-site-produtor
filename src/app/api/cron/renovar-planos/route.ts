import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { renewDuePlanBenefits } from "@/app/lib/plan-benefit-renewal";
import { processSubscriptionDelinquency } from "@/app/lib/subscription-lifecycle";

/**
 * GO-H10B/C — Expira planos vencidos, processa inadimplência e
 * renova ciclos mensais de benefícios (H10B respeita Assinatura ativa).
 */
export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (process.env.NODE_ENV === "production" && !cronSecret) {
      console.error("[Cron] CRON_SECRET não configurado em produção");
      return NextResponse.json({ error: "CRON_SECRET não configurado" }, { status: 500 });
    }
    const expectedSecret = cronSecret || "default-secret-change-in-production";
    if (authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const agora = new Date();
    const delinquency = await processSubscriptionDelinquency(agora);
    const renewal = await renewDuePlanBenefits({ now: agora });

    const proximosExpirar = await prisma.userPlan.count({
      where: {
        status: "active",
        endDate: {
          gte: agora,
          lte: new Date(agora.getTime() + 7 * 24 * 60 * 60 * 1000),
        },
      },
    });

    console.log(
      `[Cron] delinquencia=${delinquency.length} expirados=${renewal.expiredPlans.length} renovados=${renewal.renewed.length} gerados=${renewal.generatedCoupons}`
    );

    return NextResponse.json({
      success: true,
      planosExpirados: renewal.expiredPlans.length,
      planosRenovados: renewal.renewed.length,
      cuponsSubstituidos: renewal.substitutedCoupons,
      cuponsGerados: renewal.generatedCoupons,
      delinquency,
      planosProximosExpirar: proximosExpirar,
      detail: renewal,
      message: "Processamento concluído",
    });
  } catch (error: unknown) {
    console.error("[Cron] Erro ao processar renovações:", error);
    return NextResponse.json(
      { error: "Erro ao processar renovações" },
      { status: 500 }
    );
  }
}
