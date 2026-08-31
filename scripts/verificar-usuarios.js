// Script para verificar usuários no banco
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verificarUsuarios() {
  try {
    const users = await prisma.user.findMany({
      select: {
        email: true,
        nomeArtistico: true,
        cpf: true,
      },
    });

    console.log('Usuários no banco:');
    users.forEach(u => {
      console.log(`- ${u.email} (${u.nomeArtistico}) - CPF: ${u.cpf || 'Não cadastrado'}`);
    });
  } catch (error) {
    console.error('Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verificarUsuarios();
