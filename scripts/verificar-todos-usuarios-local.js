/**
 * Script para verificar TODOS os usuários e dados no banco local
 */

const Database = require('better-sqlite3');

const sqliteDb = new Database('./prisma/dev.db', { readonly: true });

async function verificarTodos() {
  try {
    console.log('[Verificar Local] Verificando TODOS os dados no banco local...');
    
    // Listar TODOS os usuários
    const todosUsuarios = sqliteDb.prepare('SELECT id, email, nomeArtistico, role, createdAt FROM User ORDER BY createdAt DESC').all();
    
    console.log(`\n[Verificar Local] Total de usuários: ${todosUsuarios.length}`);
    todosUsuarios.forEach((u, i) => {
      console.log(`\n${i + 1}. ${u.email} (${u.nomeArtistico})`);
      console.log(`   - ID: ${u.id}`);
      console.log(`   - Role: ${u.role}`);
      console.log(`   - Criado em: ${u.createdAt}`);
      
      // Verificar dados de cada usuário
      const agendamentos = sqliteDb.prepare('SELECT COUNT(*) as total FROM Appointment WHERE userId = ?').get(u.id);
      const planos = sqliteDb.prepare('SELECT COUNT(*) as total FROM UserPlan WHERE userId = ?').get(u.id);
      const faqQuestions = sqliteDb.prepare('SELECT COUNT(*) as total FROM UserQuestion WHERE userId = ?').get(u.id);
      const chatSessions = sqliteDb.prepare('SELECT COUNT(*) as total FROM ChatSession WHERE userId = ?').get(u.id);
      
      console.log(`   - Agendamentos: ${agendamentos.total}`);
      console.log(`   - Planos: ${planos.total}`);
      console.log(`   - Perguntas FAQ: ${faqQuestions.total}`);
      console.log(`   - Chat Sessions: ${chatSessions.total}`);
      
      // Se tiver dados, mostrar detalhes
      if (agendamentos.total > 0) {
        const agendamentosDetalhes = sqliteDb.prepare('SELECT id, status, tipo, data, createdAt FROM Appointment WHERE userId = ? ORDER BY createdAt DESC LIMIT 5').all(u.id);
        console.log(`     Detalhes dos agendamentos:`);
        agendamentosDetalhes.forEach((a, j) => {
          console.log(`       ${j + 1}. ID: ${a.id} - Status: ${a.status} - Tipo: ${a.tipo} - Data: ${a.data}`);
        });
      }
      
      if (planos.total > 0) {
        const planosDetalhes = sqliteDb.prepare('SELECT id, planName, status, createdAt FROM UserPlan WHERE userId = ? ORDER BY createdAt DESC LIMIT 5').all(u.id);
        console.log(`     Detalhes dos planos:`);
        planosDetalhes.forEach((p, j) => {
          console.log(`       ${j + 1}. ID: ${p.id} - Plano: ${p.planName} - Status: ${p.status}`);
        });
      }
    });
    
    // Verificar dados órfãos (sem userId válido)
    console.log(`\n[Verificar Local] Verificando dados órfãos (sem usuário associado)...`);
    
    // Buscar todos os userIds únicos
    const userIdsAgendamentos = sqliteDb.prepare('SELECT DISTINCT userId FROM Appointment WHERE userId IS NOT NULL').all();
    const userIdsPlanos = sqliteDb.prepare('SELECT DISTINCT userId FROM UserPlan WHERE userId IS NOT NULL').all();
    const userIdsFAQ = sqliteDb.prepare('SELECT DISTINCT userId FROM UserQuestion WHERE userId IS NOT NULL').all();
    
    const userIdsExistentes = new Set(todosUsuarios.map(u => u.id));
    
    const agendamentosOrfaos = userIdsAgendamentos.filter(u => !userIdsExistentes.has(u.userId)).length;
    const planosOrfaos = userIdsPlanos.filter(u => !userIdsExistentes.has(u.userId)).length;
    const faqOrfaos = userIdsFAQ.filter(u => !userIdsExistentes.has(u.userId)).length;
    
    console.log(`  - Agendamentos com userId inválido: ${agendamentosOrfaos}`);
    console.log(`  - Planos com userId inválido: ${planosOrfaos}`);
    console.log(`  - Perguntas FAQ com userId inválido: ${faqOrfaos}`);
    
    // Estatísticas gerais
    console.log(`\n[Verificar Local] Estatísticas gerais do banco local:`);
    console.log(`  - Total de agendamentos: ${sqliteDb.prepare('SELECT COUNT(*) as total FROM Appointment').get().total}`);
    console.log(`  - Total de planos: ${sqliteDb.prepare('SELECT COUNT(*) as total FROM UserPlan').get().total}`);
    console.log(`  - Total de perguntas FAQ: ${sqliteDb.prepare('SELECT COUNT(*) as total FROM UserQuestion').get().total}`);
    console.log(`  - Total de chat sessions: ${sqliteDb.prepare('SELECT COUNT(*) as total FROM ChatSession').get().total}`);
    
  } catch (error) {
    console.error('[Verificar Local] ❌ Erro:', error);
    console.error('[Verificar Local] Stack:', error.stack);
  } finally {
    sqliteDb.close();
  }
}

verificarTodos();
