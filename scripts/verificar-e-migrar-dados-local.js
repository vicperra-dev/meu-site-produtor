/**
 * Script para verificar dados no banco local e migrar para produção
 */

const { PrismaClient } = require('@prisma/client');
const Database = require('better-sqlite3');

// Cliente para banco local (SQLite)
const sqliteDb = new Database('./prisma/dev.db', { readonly: true });

// Cliente Prisma para produção (PostgreSQL)
const prisma = new PrismaClient();

async function verificarEMigrar() {
  try {
    console.log('[Migrar Dados] Verificando dados no banco local (SQLite)...');
    
    // Verificar usuário no banco local
    const usuarioLocal = sqliteDb.prepare('SELECT * FROM User WHERE email = ?').get('vicperra@gmail.com');
    
    if (!usuarioLocal) {
      console.log('[Migrar Dados] ⚠️ Usuário vicperra@gmail.com não encontrado no banco local.');
      
      // Listar todos os usuários do banco local
      const todosUsuariosLocal = sqliteDb.prepare('SELECT id, email, nomeArtistico, role FROM User LIMIT 10').all();
      console.log(`\n[Migrar Dados] Usuários no banco local (primeiros 10):`);
      todosUsuariosLocal.forEach((u, i) => {
        console.log(`  ${i + 1}. ${u.email} (${u.nomeArtistico}) - Role: ${u.role}`);
      });
      
      sqliteDb.close();
      return;
    }
    
    console.log(`[Migrar Dados] ✅ Usuário encontrado no banco local:`);
    console.log(`  - ID: ${usuarioLocal.id}`);
    console.log(`  - Email: ${usuarioLocal.email}`);
    console.log(`  - Nome: ${usuarioLocal.nomeArtistico}`);
    console.log(`  - Role: ${usuarioLocal.role}`);
    
    // Verificar dados associados no banco local
    const agendamentosLocal = sqliteDb.prepare('SELECT * FROM Appointment WHERE userId = ?').all(usuarioLocal.id);
    const planosLocal = sqliteDb.prepare('SELECT * FROM UserPlan WHERE userId = ?').all(usuarioLocal.id);
    const faqQuestionsLocal = sqliteDb.prepare('SELECT * FROM UserQuestion WHERE userId = ?').all(usuarioLocal.id);
    const chatSessionsLocal = sqliteDb.prepare('SELECT * FROM ChatSession WHERE userId = ?').all(usuarioLocal.id);
    
    console.log(`\n[Migrar Dados] Dados no banco local:`);
    console.log(`  - Agendamentos: ${agendamentosLocal.length}`);
    console.log(`  - Planos: ${planosLocal.length}`);
    console.log(`  - Perguntas FAQ: ${faqQuestionsLocal.length}`);
    console.log(`  - Chat Sessions: ${chatSessionsLocal.length}`);
    
    // Verificar usuário no banco de produção
    console.log(`\n[Migrar Dados] Verificando dados no banco de produção (PostgreSQL)...`);
    
    const usuarioProducao = await prisma.user.findUnique({
      where: {
        email: 'vicperra@gmail.com',
      },
      include: {
        appointments: true,
        userPlans: true,
        faqQuestions: true,
        chatSessions: true,
      },
    });
    
    if (!usuarioProducao) {
      console.log('[Migrar Dados] ❌ Usuário não encontrado no banco de produção.');
      sqliteDb.close();
      return;
    }
    
    console.log(`[Migrar Dados] Dados no banco de produção:`);
    console.log(`  - Agendamentos: ${usuarioProducao.appointments.length}`);
    console.log(`  - Planos: ${usuarioProducao.userPlans.length}`);
    console.log(`  - Perguntas FAQ: ${usuarioProducao.faqQuestions.length}`);
    console.log(`  - Chat Sessions: ${usuarioProducao.chatSessions.length}`);
    
    // Comparar e migrar se necessário
    console.log(`\n[Migrar Dados] Comparando dados...`);
    
    let migrados = 0;
    
    // Migrar agendamentos
    if (agendamentosLocal.length > usuarioProducao.appointments.length) {
      console.log(`\n[Migrar Dados] Migrando agendamentos...`);
      
      for (const agendamento of agendamentosLocal) {
        // Verificar se já existe
        const existe = await prisma.appointment.findFirst({
          where: {
            userId: usuarioProducao.id,
            data: new Date(agendamento.data),
            tipo: agendamento.tipo,
          },
        });
        
        if (!existe) {
          try {
            await prisma.appointment.create({
              data: {
                userId: usuarioProducao.id,
                data: new Date(agendamento.data),
                duracaoMinutos: agendamento.duracaoMinutos || 60,
                tipo: agendamento.tipo || 'sessao',
                observacoes: agendamento.observacoes || null,
                status: agendamento.status || 'pendente',
                createdAt: new Date(agendamento.createdAt),
              },
            });
            migrados++;
            console.log(`  ✅ Agendamento migrado: ${agendamento.id}`);
          } catch (err) {
            console.log(`  ⚠️ Erro ao migrar agendamento ${agendamento.id}:`, err.message);
          }
        }
      }
    }
    
    // Migrar perguntas FAQ
    if (faqQuestionsLocal.length > usuarioProducao.faqQuestions.length) {
      console.log(`\n[Migrar Dados] Migrando perguntas FAQ...`);
      
      for (const pergunta of faqQuestionsLocal) {
        // Verificar se já existe
        const existe = await prisma.userQuestion.findFirst({
          where: {
            userId: usuarioProducao.id,
            question: pergunta.question,
          },
        });
        
        if (!existe) {
          try {
            await prisma.userQuestion.create({
              data: {
                userId: usuarioProducao.id,
                userEmail: usuarioProducao.email,
                question: pergunta.question,
                answer: pergunta.answer || null,
                status: pergunta.status || 'pendente',
                published: pergunta.published || false,
                blocked: pergunta.blocked || false,
                blockedReason: pergunta.blockedReason || null,
                answeredAt: pergunta.answeredAt ? new Date(pergunta.answeredAt) : null,
                readAt: pergunta.readAt ? new Date(pergunta.readAt) : null,
                createdAt: new Date(pergunta.createdAt),
              },
            });
            migrados++;
            console.log(`  ✅ Pergunta FAQ migrada: ${pergunta.id}`);
          } catch (err) {
            console.log(`  ⚠️ Erro ao migrar pergunta ${pergunta.id}:`, err.message);
          }
        }
      }
    }
    
    // Migrar chat sessions
    if (chatSessionsLocal.length > usuarioProducao.chatSessions.length) {
      console.log(`\n[Migrar Dados] Migrando chat sessions...`);
      
      for (const session of chatSessionsLocal) {
        // Verificar se já existe
        const existe = await prisma.chatSession.findFirst({
          where: {
            userId: usuarioProducao.id,
            createdAt: new Date(session.createdAt),
          },
        });
        
        if (!existe) {
          try {
            await prisma.chatSession.create({
              data: {
                userId: usuarioProducao.id,
                status: session.status || 'open',
                humanRequested: session.humanRequested || false,
                adminAccepted: session.adminAccepted || false,
                adminId: session.adminId || null,
                lastReadAt: session.lastReadAt ? new Date(session.lastReadAt) : null,
                createdAt: new Date(session.createdAt),
                updatedAt: new Date(session.updatedAt || session.createdAt),
              },
            });
            migrados++;
            console.log(`  ✅ Chat session migrada: ${session.id}`);
          } catch (err) {
            console.log(`  ⚠️ Erro ao migrar chat session ${session.id}:`, err.message);
          }
        }
      }
    }
    
    console.log(`\n[Migrar Dados] ✅ Migração concluída!`);
    console.log(`  - Total de itens migrados: ${migrados}`);
    
    // Verificar resultado final
    const usuarioFinal = await prisma.user.findUnique({
      where: {
        email: 'vicperra@gmail.com',
      },
      include: {
        appointments: true,
        userPlans: true,
        faqQuestions: true,
        chatSessions: true,
      },
    });
    
    console.log(`\n[Migrar Dados] Dados finais no banco de produção:`);
    console.log(`  - Agendamentos: ${usuarioFinal.appointments.length}`);
    console.log(`  - Planos: ${usuarioFinal.userPlans.length}`);
    console.log(`  - Perguntas FAQ: ${usuarioFinal.faqQuestions.length}`);
    console.log(`  - Chat Sessions: ${usuarioFinal.chatSessions.length}`);
    
  } catch (error) {
    console.error('[Migrar Dados] ❌ Erro:', error);
    console.error('[Migrar Dados] Stack:', error.stack);
  } finally {
    sqliteDb.close();
    await prisma.$disconnect();
  }
}

verificarEMigrar();
