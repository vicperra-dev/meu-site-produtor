/**
 * Script para tornar usuário admin no banco de PRODUÇÃO
 * 
 * IMPORTANTE: Este script deve ser executado com DATABASE_URL apontando para PRODUÇÃO
 * 
 * Uso:
 * 1. Configure DATABASE_URL no .env para apontar para o banco de produção
 * 2. Execute: node scripts/tornar-admin-producao.js
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function tornarAdminProducao() {
  try {
    const email = 'vicperra@gmail.com';
    
    console.log(`[Tornar Admin Produção] Buscando usuário com email: ${email}`);
    console.log(`[Tornar Admin Produção] DATABASE_URL: ${process.env.DATABASE_URL ? 'Configurado' : 'NÃO CONFIGURADO'}`);
    
    // Buscar usuário
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      console.error(`[Tornar Admin Produção] ❌ Usuário não encontrado com email: ${email}`);
      console.log('[Tornar Admin Produção] Tentando buscar sem normalização...');
      
      // Tentar buscar sem normalização
      const userAlt = await prisma.user.findFirst({
        where: {
          OR: [
            { email: email },
            { email: email.toLowerCase() },
            { email: email.toUpperCase() },
          ],
        },
      });
      
      if (!userAlt) {
        console.error('[Tornar Admin Produção] ❌ Usuário não encontrado. Verifique o email.');
        console.log('[Tornar Admin Produção] Listando todos os usuários no banco...');
        
        const allUsers = await prisma.user.findMany({
          select: { id: true, email: true, nomeArtistico: true, role: true },
          take: 10,
        });
        
        console.log('[Tornar Admin Produção] Primeiros 10 usuários:');
        allUsers.forEach(u => {
          console.log(`  - ${u.email} (${u.nomeArtistico}) - Role: ${u.role}`);
        });
        
        return;
      }
      
      // Atualizar role
      const updated = await prisma.user.update({
        where: { id: userAlt.id },
        data: { role: 'ADMIN' },
      });
      
      console.log(`[Tornar Admin Produção] ✅ Usuário atualizado para ADMIN:`);
      console.log(`  - ID: ${updated.id}`);
      console.log(`  - Email: ${updated.email}`);
      console.log(`  - Nome: ${updated.nomeArtistico}`);
      console.log(`  - Role: ${updated.role}`);
      return;
    }

    // Verificar se já é admin
    if (user.role === 'ADMIN') {
      console.log(`[Tornar Admin Produção] ℹ️  Usuário já é ADMIN:`);
      console.log(`  - ID: ${user.id}`);
      console.log(`  - Email: ${user.email}`);
      console.log(`  - Nome: ${user.nomeArtistico}`);
      console.log(`  - Role: ${user.role}`);
      return;
    }

    // Atualizar role para ADMIN
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { role: 'ADMIN' },
    });

    console.log(`[Tornar Admin Produção] ✅ Usuário atualizado para ADMIN:`);
    console.log(`  - ID: ${updated.id}`);
    console.log(`  - Email: ${updated.email}`);
    console.log(`  - Nome: ${updated.nomeArtistico}`);
    console.log(`  - Role: ${updated.role}`);
    
  } catch (error) {
    console.error('[Tornar Admin Produção] ❌ Erro:', error);
    console.error('[Tornar Admin Produção] Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

tornarAdminProducao();
