/**
 * Script para verificar dados associados a usuários
 * Verifica se há dados órfãos ou associados a outros usuários
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verificarDados() {
  try {
    console.log('[Verificar Dados] Verificando dados no banco de produção...');
    
    // Buscar TODOS os usuários
    const todosUsuarios = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        nomeArtistico: true,
        role: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    
    console.log(`\n[Verificar Dados] Total de usuários no banco: ${todosUsuarios.length}`);
    console.log(`\n[Verificar Dados] Todos os usuários:`);
    todosUsuarios.forEach((u, i) => {
      console.log(`  ${i + 1}. ${u.email} (${u.nomeArtistico}) - Role: ${u.role} - ID: ${u.id.substring(0, 8)}...`);
    });
    
    // Verificar usuário atual
    const usuarioAtual = await prisma.user.findUnique({
      where: {
        email: 'vicperra@gmail.com',
      },
    });
    
    if (!usuarioAtual) {
      console.log('\n[Verificar Dados] ❌ Usuário vicperra@gmail.com não encontrado.');
      return;
    }
    
    console.log(`\n[Verificar Dados] Usuário atual: ${usuarioAtual.email} (ID: ${usuarioAtual.id})`);
    
    // Verificar agendamentos
    const agendamentos = await prisma.appointment.findMany({
      include: {
        user: {
          select: {
            email: true,
            nomeArtistico: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    });
    
    console.log(`\n[Verificar Dados] Total de agendamentos: ${await prisma.appointment.count()}`);
    console.log(`[Verificar Dados] Últimos 10 agendamentos:`);
    agendamentos.forEach((a, i) => {
      console.log(`  ${i + 1}. ID: ${a.id} - Usuário: ${a.user?.email || 'SEM USUÁRIO'} (${a.user?.nomeArtistico || 'N/A'}) - Status: ${a.status} - Data: ${a.createdAt}`);
    });
    
    // Verificar planos
    const planos = await prisma.userPlan.findMany({
      include: {
        user: {
          select: {
            email: true,
            nomeArtistico: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    });
    
    console.log(`\n[Verificar Dados] Total de planos: ${await prisma.userPlan.count()}`);
    console.log(`[Verificar Dados] Últimos 10 planos:`);
    planos.forEach((p, i) => {
      console.log(`  ${i + 1}. ID: ${p.id} - Usuário: ${p.user?.email || 'SEM USUÁRIO'} (${p.user?.nomeArtistico || 'N/A'}) - Plano: ${p.planName} - Status: ${p.status}`);
    });
    
    // Verificar se há dados associados ao usuário atual
    const agendamentosUsuario = await prisma.appointment.count({
      where: {
        userId: usuarioAtual.id,
      },
    });
    
    const planosUsuario = await prisma.userPlan.count({
      where: {
        userId: usuarioAtual.id,
      },
    });
    
    const cuponsUsuario = await prisma.coupon.count({
      where: {
        userId: usuarioAtual.id,
      },
    });
    
    console.log(`\n[Verificar Dados] Dados do usuário atual (${usuarioAtual.email}):`);
    console.log(`  - Agendamentos: ${agendamentosUsuario}`);
    console.log(`  - Planos: ${planosUsuario}`);
    console.log(`  - Cupons: ${cuponsUsuario}`);
    
    // Verificar se há outro usuário admin
    const outrosAdmins = await prisma.user.findMany({
      where: {
        role: 'ADMIN',
        email: {
          not: 'vicperra@gmail.com',
        },
      },
      select: {
        id: true,
        email: true,
        nomeArtistico: true,
        createdAt: true,
      },
    });
    
    if (outrosAdmins.length > 0) {
      console.log(`\n[Verificar Dados] ⚠️ Outros usuários ADMIN encontrados:`);
      outrosAdmins.forEach((a, i) => {
        console.log(`  ${i + 1}. ${a.email} (${a.nomeArtistico}) - ID: ${a.id.substring(0, 8)}... - Criado em: ${a.createdAt}`);
      });
    }
    
  } catch (error) {
    console.error('[Verificar Dados] ❌ Erro:', error);
    console.error('[Verificar Dados] Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

verificarDados();
