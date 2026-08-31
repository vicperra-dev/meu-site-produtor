import { prisma } from "@/app/lib/prisma";

/**
 * Função para gerar código de cupom único
 */
export function generateCouponCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/** Garante código único no banco (cupons de teste, reembolso, etc.). */
export async function ensureUniqueCouponCode(): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const code = generateCouponCode();
    const existing = await prisma.coupon.findUnique({ where: { code } });
    if (!existing) return code;
  }
  return `TESTE_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`.toUpperCase();
}
