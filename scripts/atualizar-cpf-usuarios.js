// Script para atualizar CPF dos usuários existentes
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function atualizarCPFs() {
  try {
    console.log('🔄 Atualizando CPFs dos usuários...\n');

    // CPFs fornecidos
    const cpfs = {
      'thouse.rec.tremv@gmail.com': '12755223782', // Tremv
      'raulvitorfs@gmail.com': '16640555760', // Raul
    };

    // Atualizar cada usuário
    for (const [email, cpf] of Object.entries(cpfs)) {
      try {
        const usuario = await prisma.user.findUnique({
          where: { email },
        });

        if (usuario) {
          await prisma.user.update({
            where: { email },
            data: { cpf },
          });
          console.log(`✅ CPF atualizado para ${email}: ${cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}`);
        } else {
          console.log(`⚠️  Usuário não encontrado: ${email}`);
        }
      } catch (error) {
        console.error(`❌ Erro ao atualizar ${email}:`, error.message);
      }
    }

    console.log('\n✅ Atualização concluída!');
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

atualizarCPFs();
