const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verificarFAQs() {
  try {
    console.log('[Verificar FAQs] Buscando FAQs no banco de dados...');
    
    // Contar total de FAQs
    const total = await prisma.fAQ.count();
    console.log(`[Verificar FAQs] Total de FAQs no banco: ${total}`);
    
    // Buscar algumas FAQs
    const faqs = await prisma.fAQ.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
    });
    
    if (faqs.length === 0) {
      console.log('[Verificar FAQs] ⚠️ Nenhuma FAQ encontrada no banco de dados.');
      console.log('[Verificar FAQs] Você precisa criar FAQs via Admin Panel ou executar seed.');
    } else {
      console.log(`[Verificar FAQs] ✅ Encontradas ${faqs.length} FAQs (mostrando primeiras 5):`);
      faqs.forEach((faq, index) => {
        console.log(`\n${index + 1}. ${faq.question}`);
        console.log(`   Resposta: ${faq.answer.substring(0, 50)}...`);
        console.log(`   Views: ${faq.views}`);
        console.log(`   Criada em: ${faq.createdAt}`);
      });
    }
    
    // Verificar perguntas de usuários pendentes
    const perguntasPendentes = await prisma.userQuestion.count({
      where: { status: 'pendente' },
    });
    
    console.log(`\n[Verificar FAQs] Perguntas de usuários pendentes: ${perguntasPendentes}`);
    
    if (perguntasPendentes > 0) {
      console.log('[Verificar FAQs] 💡 Você pode responder essas perguntas via Admin Panel e publicá-las no FAQ.');
    }
    
  } catch (error) {
    console.error('[Verificar FAQs] ❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verificarFAQs();
