const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function tornarAdmin() {
  try {
    const email = 'vicperra@gmail.com';
    
    console.log(`[Tornar Admin] Buscando usuário com email: ${email}`);
    
    // Buscar usuário
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      console.error(`[Tornar Admin] ❌ Usuário não encontrado com email: ${email}`);
      console.log('[Tornar Admin] Tentando buscar sem normalização...');
      
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
        console.error('[Tornar Admin] ❌ Usuário não encontrado. Verifique o email.');
        return;
      }
      
      // Atualizar role
      const updated = await prisma.user.update({
        where: { id: userAlt.id },
        data: { role: 'ADMIN' },
      });
      
      console.log(`[Tornar Admin] ✅ Usuário atualizado para ADMIN:`);
      console.log(`  - ID: ${updated.id}`);
      console.log(`  - Email: ${updated.email}`);
      console.log(`  - Nome: ${updated.nomeArtistico}`);
      console.log(`  - Role: ${updated.role}`);
      return;
    }

    // Atualizar role para ADMIN
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { role: 'ADMIN' },
    });

    console.log(`[Tornar Admin] ✅ Usuário atualizado para ADMIN:`);
    console.log(`  - ID: ${updated.id}`);
    console.log(`  - Email: ${updated.email}`);
    console.log(`  - Nome: ${updated.nomeArtistico}`);
    console.log(`  - Role: ${updated.role}`);
    
  } catch (error) {
    console.error('[Tornar Admin] ❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

tornarAdmin();
