/**
 * Script para verificar usuários no banco de produção
 * Verifica se há duplicatas e qual usuário está sendo usado
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verificarUsuarios() {
  try {
    console.log('[Verificar Usuários] Verificando usuários no banco de produção...');
    console.log(`[Verificar Usuários] DATABASE_URL: ${process.env.DATABASE_URL ? 'Configurado' : 'NÃO CONFIGURADO'}`);
    
    // Buscar todos os usuários com email vicperra@gmail.com
    const usuarios = await prisma.user.findMany({
      where: {
        email: {
          contains: 'vicperra',
        },
      },
      select: {
        id: true,
        email: true,
        nomeArtistico: true,
        nomeCompleto: true,
        role: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    
    console.log(`\n[Verificar Usuários] Usuários encontrados com "vicperra" no email: ${usuarios.length}`);
    
    if (usuarios.length === 0) {
      console.log('[Verificar Usuários] ⚠️ Nenhum usuário encontrado com esse email.');
      
      // Buscar todos os usuários
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
        take: 10,
      });
      
      console.log(`\n[Verificar Usuários] Primeiros 10 usuários no banco:`);
      todosUsuarios.forEach((u, i) => {
        console.log(`  ${i + 1}. ${u.email} (${u.nomeArtistico}) - Role: ${u.role} - Criado em: ${u.createdAt}`);
      });
      
      return;
    }
    
    usuarios.forEach((u, i) => {
      console.log(`\n${i + 1}. Usuário:`);
      console.log(`   - ID: ${u.id}`);
      console.log(`   - Email: ${u.email}`);
      console.log(`   - Nome Artístico: ${u.nomeArtistico}`);
      console.log(`   - Nome Completo: ${u.nomeCompleto}`);
      console.log(`   - Role: ${u.role}`);
      console.log(`   - Criado em: ${u.createdAt}`);
    });
    
    // Verificar se há duplicatas
    const emailsUnicos = new Set(usuarios.map(u => u.email.toLowerCase()));
    if (usuarios.length > emailsUnicos.size) {
      console.log(`\n[Verificar Usuários] ⚠️ ATENÇÃO: Há ${usuarios.length - emailsUnicos.size} usuário(s) duplicado(s)!`);
    }
    
    // Verificar usuário específico
    const usuarioExato = await prisma.user.findUnique({
      where: {
        email: 'vicperra@gmail.com',
      },
      include: {
        appointments: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
        userPlans: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
        faqQuestions: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    
    if (usuarioExato) {
      console.log(`\n[Verificar Usuários] ✅ Usuário exato encontrado:`);
      console.log(`   - ID: ${usuarioExato.id}`);
      console.log(`   - Email: ${usuarioExato.email}`);
      console.log(`   - Role: ${usuarioExato.role}`);
      console.log(`   - Agendamentos: ${usuarioExato.appointments.length}`);
      console.log(`   - Planos: ${usuarioExato.userPlans.length}`);
      console.log(`   - Perguntas FAQ: ${usuarioExato.faqQuestions.length}`);
    } else {
      console.log(`\n[Verificar Usuários] ❌ Usuário exato "vicperra@gmail.com" não encontrado.`);
    }
    
  } catch (error) {
    console.error('[Verificar Usuários] ❌ Erro:', error);
    console.error('[Verificar Usuários] Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

verificarUsuarios();
