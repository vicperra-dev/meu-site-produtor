/**
 * Script para limpar chats antigos (mais de 1 semana)
 * Execute: node scripts/limpar-chats-antigos.js
 */

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function limparChatsAntigos() {
  try {
    const umaSemanaAtras = new Date();
    umaSemanaAtras.setDate(umaSemanaAtras.getDate() - 7);

    console.log(`[Limpeza] Buscando chats criados antes de ${umaSemanaAtras.toLocaleString("pt-BR")}...`);

    // Contar quantos serão deletados
    const count = await prisma.chatSession.count({
      where: {
        createdAt: {
          lt: umaSemanaAtras,
        },
      },
    });

    console.log(`[Limpeza] Encontrados ${count} chat(s) antigo(s) para excluir`);

    if (count === 0) {
      console.log("[Limpeza] Nenhum chat antigo encontrado. Nada a fazer.");
      return;
    }

    // Deletar chats antigos (mensagens serão deletadas em cascade)
    const result = await prisma.chatSession.deleteMany({
      where: {
        createdAt: {
          lt: umaSemanaAtras,
        },
      },
    });

    console.log(`[Limpeza] ✅ ${result.count} chat(s) excluído(s) com sucesso!`);
  } catch (error) {
    console.error("[Limpeza] ❌ Erro ao limpar chats antigos:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar limpeza
limparChatsAntigos();
