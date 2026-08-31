/**
 * Script de Migração de SQLite para PostgreSQL
 * 
 * Este script exporta todos os dados do SQLite e importa no PostgreSQL
 * 
 * USO:
 * 1. Configure DATABASE_URL no .env apontando para PostgreSQL
 * 2. Execute: node scripts/migrar-para-postgresql.js
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

// Cliente SQLite (usando o banco antigo)
const sqlitePrisma = new PrismaClient({
  datasources: {
    db: {
      url: 'file:./prisma/dev.db'
    }
  }
});

// Cliente PostgreSQL (usando DATABASE_URL do .env)
const postgresPrisma = new PrismaClient();

async function migrarDados() {
  console.log('🚀 Iniciando migração de SQLite para PostgreSQL...\n');

  try {
    // 1. Migrar Users
    console.log('📦 Migrando Users...');
    const users = await sqlitePrisma.user.findMany();
    for (const user of users) {
      try {
        await postgresPrisma.user.upsert({
          where: { id: user.id },
          update: {},
          create: user,
        });
      } catch (err) {
        console.error(`  ⚠️ Erro ao migrar user ${user.id}:`, err.message);
      }
    }
    console.log(`  ✅ ${users.length} usuários migrados\n`);

    // 2. Migrar Sessions
    console.log('📦 Migrando Sessions...');
    const sessions = await sqlitePrisma.session.findMany();
    for (const session of sessions) {
      try {
        await postgresPrisma.session.upsert({
          where: { id: session.id },
          update: {},
          create: session,
        });
      } catch (err) {
        console.error(`  ⚠️ Erro ao migrar session ${session.id}:`, err.message);
      }
    }
    console.log(`  ✅ ${sessions.length} sessões migradas\n`);

    // 3. Migrar Appointments
    console.log('📦 Migrando Appointments...');
    const appointments = await sqlitePrisma.appointment.findMany();
    for (const appointment of appointments) {
      try {
        await postgresPrisma.appointment.upsert({
          where: { id: appointment.id },
          update: {},
          create: appointment,
        });
      } catch (err) {
        console.error(`  ⚠️ Erro ao migrar appointment ${appointment.id}:`, err.message);
      }
    }
    console.log(`  ✅ ${appointments.length} agendamentos migrados\n`);

    // 4. Migrar FAQs
    console.log('📦 Migrando FAQs...');
    const faqs = await sqlitePrisma.fAQ.findMany();
    for (const faq of faqs) {
      try {
        await postgresPrisma.fAQ.upsert({
          where: { id: faq.id },
          update: {},
          create: faq,
        });
      } catch (err) {
        console.error(`  ⚠️ Erro ao migrar FAQ ${faq.id}:`, err.message);
      }
    }
    console.log(`  ✅ ${faqs.length} FAQs migrados\n`);

    // 5. Migrar UserQuestions
    console.log('📦 Migrando UserQuestions...');
    const userQuestions = await sqlitePrisma.userQuestion.findMany();
    for (const question of userQuestions) {
      try {
        await postgresPrisma.userQuestion.upsert({
          where: { id: question.id },
          update: {},
          create: question,
        });
      } catch (err) {
        console.error(`  ⚠️ Erro ao migrar question ${question.id}:`, err.message);
      }
    }
    console.log(`  ✅ ${userQuestions.length} perguntas migradas\n`);

    // 6. Migrar LoginLogs
    console.log('📦 Migrando LoginLogs...');
    const loginLogs = await sqlitePrisma.loginLog.findMany();
    for (const log of loginLogs) {
      try {
        await postgresPrisma.loginLog.upsert({
          where: { id: log.id },
          update: {},
          create: log,
        });
      } catch (err) {
        console.error(`  ⚠️ Erro ao migrar log ${log.id}:`, err.message);
      }
    }
    console.log(`  ✅ ${loginLogs.length} logs migrados\n`);

    // 7. Migrar Payments
    console.log('📦 Migrando Payments...');
    const payments = await sqlitePrisma.payment.findMany();
    for (const payment of payments) {
      try {
        await postgresPrisma.payment.upsert({
          where: { id: payment.id },
          update: {},
          create: payment,
        });
      } catch (err) {
        console.error(`  ⚠️ Erro ao migrar payment ${payment.id}:`, err.message);
      }
    }
    console.log(`  ✅ ${payments.length} pagamentos migrados\n`);

    // 8. Migrar PaymentMetadata
    console.log('📦 Migrando PaymentMetadata...');
    const paymentMetadata = await sqlitePrisma.paymentMetadata.findMany();
    for (const metadata of paymentMetadata) {
      try {
        await postgresPrisma.paymentMetadata.upsert({
          where: { id: metadata.id },
          update: {},
          create: metadata,
        });
      } catch (err) {
        console.error(`  ⚠️ Erro ao migrar metadata ${metadata.id}:`, err.message);
      }
    }
    console.log(`  ✅ ${paymentMetadata.length} metadados migrados\n`);

    // 9. Migrar UserPlans
    console.log('📦 Migrando UserPlans...');
    const userPlans = await sqlitePrisma.userPlan.findMany();
    for (const plan of userPlans) {
      try {
        await postgresPrisma.userPlan.upsert({
          where: { id: plan.id },
          update: {},
          create: plan,
        });
      } catch (err) {
        console.error(`  ⚠️ Erro ao migrar plan ${plan.id}:`, err.message);
      }
    }
    console.log(`  ✅ ${userPlans.length} planos migrados\n`);

    // 10. Migrar Subscriptions
    console.log('📦 Migrando Subscriptions...');
    const subscriptions = await sqlitePrisma.subscription.findMany();
    for (const subscription of subscriptions) {
      try {
        await postgresPrisma.subscription.upsert({
          where: { id: subscription.id },
          update: {},
          create: subscription,
        });
      } catch (err) {
        console.error(`  ⚠️ Erro ao migrar subscription ${subscription.id}:`, err.message);
      }
    }
    console.log(`  ✅ ${subscriptions.length} assinaturas migradas\n`);

    // 11. Migrar Services
    console.log('📦 Migrando Services...');
    const services = await sqlitePrisma.service.findMany();
    for (const service of services) {
      try {
        await postgresPrisma.service.upsert({
          where: { id: service.id },
          update: {},
          create: service,
        });
      } catch (err) {
        console.error(`  ⚠️ Erro ao migrar service ${service.id}:`, err.message);
      }
    }
    console.log(`  ✅ ${services.length} serviços migrados\n`);

    // 12. Migrar ChatSessions
    console.log('📦 Migrando ChatSessions...');
    const chatSessions = await sqlitePrisma.chatSession.findMany();
    for (const session of chatSessions) {
      try {
        await postgresPrisma.chatSession.upsert({
          where: { id: session.id },
          update: {},
          create: session,
        });
      } catch (err) {
        console.error(`  ⚠️ Erro ao migrar chat session ${session.id}:`, err.message);
      }
    }
    console.log(`  ✅ ${chatSessions.length} sessões de chat migradas\n`);

    // 13. Migrar ChatMessages
    console.log('📦 Migrando ChatMessages...');
    const chatMessages = await sqlitePrisma.chatMessage.findMany();
    for (const message of chatMessages) {
      try {
        await postgresPrisma.chatMessage.upsert({
          where: { id: message.id },
          update: {},
          create: message,
        });
      } catch (err) {
        console.error(`  ⚠️ Erro ao migrar message ${message.id}:`, err.message);
      }
    }
    console.log(`  ✅ ${chatMessages.length} mensagens migradas\n`);

    // 14. Migrar BlockedTimeSlots
    console.log('📦 Migrando BlockedTimeSlots...');
    const blockedSlots = await sqlitePrisma.blockedTimeSlot.findMany();
    for (const slot of blockedSlots) {
      try {
        await postgresPrisma.blockedTimeSlot.upsert({
          where: { id: slot.id },
          update: {},
          create: slot,
        });
      } catch (err) {
        console.error(`  ⚠️ Erro ao migrar slot ${slot.id}:`, err.message);
      }
    }
    console.log(`  ✅ ${blockedSlots.length} slots bloqueados migrados\n`);

    // 15. Migrar SiteSettings
    console.log('📦 Migrando SiteSettings...');
    const settings = await sqlitePrisma.siteSettings.findMany();
    for (const setting of settings) {
      try {
        await postgresPrisma.siteSettings.upsert({
          where: { id: setting.id },
          update: {},
          create: setting,
        });
      } catch (err) {
        console.error(`  ⚠️ Erro ao migrar setting ${setting.id}:`, err.message);
      }
    }
    console.log(`  ✅ ${settings.length} configurações migradas\n`);

    // 16. Migrar PasswordResetCodes
    console.log('📦 Migrando PasswordResetCodes...');
    const resetCodes = await sqlitePrisma.passwordResetCode.findMany();
    for (const code of resetCodes) {
      try {
        await postgresPrisma.passwordResetCode.upsert({
          where: { id: code.id },
          update: {},
          create: code,
        });
      } catch (err) {
        console.error(`  ⚠️ Erro ao migrar code ${code.id}:`, err.message);
      }
    }
    console.log(`  ✅ ${resetCodes.length} códigos de reset migrados\n`);

    // 17. Migrar Coupons
    console.log('📦 Migrando Coupons...');
    const coupons = await sqlitePrisma.coupon.findMany();
    for (const coupon of coupons) {
      try {
        await postgresPrisma.coupon.upsert({
          where: { id: coupon.id },
          update: {},
          create: coupon,
        });
      } catch (err) {
        console.error(`  ⚠️ Erro ao migrar coupon ${coupon.id}:`, err.message);
      }
    }
    console.log(`  ✅ ${coupons.length} cupons migrados\n`);

    console.log('✅ Migração concluída com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro durante a migração:', error);
    throw error;
  } finally {
    await sqlitePrisma.$disconnect();
    await postgresPrisma.$disconnect();
  }
}

// Executar migração
migrarDados()
  .then(() => {
    console.log('\n🎉 Migração finalizada!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Erro fatal na migração:', error);
    process.exit(1);
  });
