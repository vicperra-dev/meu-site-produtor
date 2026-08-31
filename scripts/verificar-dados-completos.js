/**
 * Script para verificar dados completos do usuário
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verificarDadosCompletos() {
  try {
    console.log('[Verificar Dados] Verificando dados completos...');
    
    // Buscar usuário
    const usuario = await prisma.user.findUnique({
      where: {
        email: 'vicperra@gmail.com',
      },
      include: {
        appointments: {
          orderBy: { createdAt: 'desc' },
        },
        userPlans: {
          orderBy: { createdAt: 'desc' },
        },
        faqQuestions: {
          orderBy: { createdAt: 'desc' },
        },
        chatSessions: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });
    
    if (!usuario) {
      console.log('[Verificar Dados] ❌ Usuário não encontrado.');
      return;
    }
    
    console.log(`\n[Verificar Dados] Usuário: ${usuario.email} (${usuario.nomeArtistico})`);
    console.log(`  - ID: ${usuario.id}`);
    console.log(`  - Role: ${usuario.role}`);
    console.log(`  - Criado em: ${usuario.createdAt}`);
    
    console.log(`\n[Verificar Dados] Dados associados:`);
    console.log(`  - Agendamentos: ${usuario.appointments.length}`);
    usuario.appointments.forEach((a, i) => {
      console.log(`    ${i + 1}. ID: ${a.id} - Status: ${a.status} - Data: ${a.data} - Criado em: ${a.createdAt}`);
    });
    
    console.log(`  - Planos: ${usuario.userPlans.length}`);
    usuario.userPlans.forEach((p, i) => {
      console.log(`    ${i + 1}. ID: ${p.id} - Plano: ${p.planName} - Status: ${p.status} - Ativo: ${p.ativo} - Criado em: ${p.createdAt}`);
    });
    
    console.log(`  - Perguntas FAQ: ${usuario.faqQuestions.length}`);
    usuario.faqQuestions.forEach((f, i) => {
      console.log(`    ${i + 1}. ID: ${f.id} - Status: ${f.status} - Criado em: ${f.createdAt}`);
    });
    
    console.log(`  - Chat Sessions: ${usuario.chatSessions.length}`);
    
    // Verificar cupons via userPlan
    const cuponsViaPlano = await prisma.coupon.findMany({
      where: {
        userPlan: {
          userId: usuario.id,
        },
      },
      include: {
        userPlan: {
          select: {
            planName: true,
          },
        },
      },
    });
    
    console.log(`  - Cupons (via planos): ${cuponsViaPlano.length}`);
    
    // Verificar cupons usados por este usuário
    const cuponsUsados = await prisma.coupon.findMany({
      where: {
        usedBy: usuario.id,
      },
    });
    
    console.log(`  - Cupons usados: ${cuponsUsados.length}`);
    
    // Verificar TODOS os dados no banco
    console.log(`\n[Verificar Dados] Estatísticas gerais do banco:`);
    console.log(`  - Total de usuários: ${await prisma.user.count()}`);
    console.log(`  - Total de agendamentos: ${await prisma.appointment.count()}`);
    console.log(`  - Total de planos: ${await prisma.userPlan.count()}`);
    console.log(`  - Total de cupons: ${await prisma.coupon.count()}`);
    console.log(`  - Total de FAQs: ${await prisma.fAQ.count()}`);
    console.log(`  - Total de perguntas FAQ: ${await prisma.userQuestion.count()}`);
    
  } catch (error) {
    console.error('[Verificar Dados] ❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verificarDadosCompletos();
