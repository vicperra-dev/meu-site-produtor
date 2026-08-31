/**
 * Script de Migração de SQLite para PostgreSQL (Versão 2)
 * 
 * Este script lê dados do SQLite usando queries raw e importa no PostgreSQL
 * 
 * USO:
 * 1. Configure DATABASE_URL no .env apontando para PostgreSQL
 * 2. Execute: node scripts/migrar-para-postgresql-v2.js
 */

const { PrismaClient } = require('@prisma/client');
const Database = require('better-sqlite3');
const path = require('path');

// Conectar ao SQLite diretamente
const sqliteDb = new Database(path.join(__dirname, '../prisma/dev.db'));

// Cliente PostgreSQL (usando DATABASE_URL do .env)
const postgresPrisma = new PrismaClient();

async function migrarDados() {
  console.log('🚀 Iniciando migração de SQLite para PostgreSQL...\n');

  try {
    // 1. Migrar Users
    console.log('📦 Migrando Users...');
    const users = sqliteDb.prepare('SELECT * FROM User').all();
    for (const user of users) {
      try {
        await postgresPrisma.user.upsert({
          where: { id: user.id },
          update: {},
          create: {
            id: user.id,
            nomeCompleto: user.nomeCompleto,
            nomeArtistico: user.nomeArtistico,
            nomeSocial: user.nomeSocial || null,
            email: user.email,
            senha: user.senha,
            telefone: user.telefone,
            pais: user.pais,
            estado: user.estado,
            cidade: user.cidade,
            bairro: user.bairro,
            cep: user.cep || null,
            cpf: user.cpf || null,
            dataNascimento: new Date(user.dataNascimento),
            sexo: user.sexo || null,
            genero: user.genero || null,
            generoOutro: user.generoOutro || null,
            estilosMusicais: user.estilosMusicais || null,
            nacionalidade: user.nacionalidade || null,
            foto: user.foto || null,
            role: user.role || 'USER',
            blocked: user.blocked === 1,
            blockedAt: user.blockedAt ? new Date(user.blockedAt) : null,
            blockedReason: user.blockedReason || null,
            createdAt: new Date(user.createdAt),
          },
        });
      } catch (err) {
        console.error(`  ⚠️ Erro ao migrar user ${user.id}:`, err.message);
      }
    }
    console.log(`  ✅ ${users.length} usuários migrados\n`);

    // 2. Migrar Sessions
    console.log('📦 Migrando Sessions...');
    const sessions = sqliteDb.prepare('SELECT * FROM Session').all();
    for (const session of sessions) {
      try {
        await postgresPrisma.session.upsert({
          where: { id: session.id },
          update: {},
          create: {
            id: session.id,
            userId: session.userId,
            createdAt: new Date(session.createdAt),
            expiresAt: new Date(session.expiresAt),
          },
        });
      } catch (err) {
        console.error(`  ⚠️ Erro ao migrar session ${session.id}:`, err.message);
      }
    }
    console.log(`  ✅ ${sessions.length} sessões migradas\n`);

    // 3. Migrar Appointments
    console.log('📦 Migrando Appointments...');
    const appointments = sqliteDb.prepare('SELECT * FROM Appointment').all();
    for (const appointment of appointments) {
      try {
        await postgresPrisma.appointment.upsert({
          where: { id: appointment.id },
          update: {},
          create: {
            id: appointment.id,
            userId: appointment.userId,
            data: new Date(appointment.data),
            duracaoMinutos: appointment.duracaoMinutos,
            tipo: appointment.tipo,
            observacoes: appointment.observacoes || null,
            status: appointment.status || 'pendente',
            blocked: appointment.blocked === 1,
            blockedAt: appointment.blockedAt ? new Date(appointment.blockedAt) : null,
            blockedReason: appointment.blockedReason || null,
            readAt: appointment.readAt ? new Date(appointment.readAt) : null,
            createdAt: new Date(appointment.createdAt),
          },
        });
      } catch (err) {
        console.error(`  ⚠️ Erro ao migrar appointment ${appointment.id}:`, err.message);
      }
    }
    console.log(`  ✅ ${appointments.length} agendamentos migrados\n`);

    // 4. Migrar FAQs
    console.log('📦 Migrando FAQs...');
    const faqs = sqliteDb.prepare('SELECT * FROM FAQ').all();
    for (const faq of faqs) {
      try {
        await postgresPrisma.fAQ.upsert({
          where: { id: faq.id },
          update: {},
          create: {
            id: faq.id,
            question: faq.question,
            answer: faq.answer,
            views: faq.views || 0,
            createdAt: new Date(faq.createdAt),
            updatedAt: new Date(faq.updatedAt || faq.createdAt),
          },
        });
      } catch (err) {
        console.error(`  ⚠️ Erro ao migrar FAQ ${faq.id}:`, err.message);
      }
    }
    console.log(`  ✅ ${faqs.length} FAQs migrados\n`);

    // 5. Migrar UserQuestions
    console.log('📦 Migrando UserQuestions...');
    const userQuestions = sqliteDb.prepare('SELECT * FROM UserQuestion').all();
    for (const question of userQuestions) {
      try {
        await postgresPrisma.userQuestion.upsert({
          where: { id: question.id },
          update: {},
          create: {
            id: question.id,
            question: question.question,
            userName: question.userName || null,
            userEmail: question.userEmail || null,
            userId: question.userId || null,
            blocked: question.blocked === 1,
            blockedReason: question.blockedReason || null,
            status: question.status || 'pendente',
            answer: question.answer || null,
            answeredAt: question.answeredAt ? new Date(question.answeredAt) : null,
            answeredBy: question.answeredBy || null,
            readAt: question.readAt ? new Date(question.readAt) : null,
            published: question.published === 1,
            faqId: question.faqId || null,
            createdAt: new Date(question.createdAt),
          },
        });
      } catch (err) {
        console.error(`  ⚠️ Erro ao migrar question ${question.id}:`, err.message);
      }
    }
    console.log(`  ✅ ${userQuestions.length} perguntas migradas\n`);

    // 6. Migrar LoginLogs
    console.log('📦 Migrando LoginLogs...');
    const loginLogs = sqliteDb.prepare('SELECT * FROM LoginLog').all();
    for (const log of loginLogs) {
      try {
        await postgresPrisma.loginLog.upsert({
          where: { id: log.id },
          update: {},
          create: {
            id: log.id,
            userId: log.userId || null,
            ipAddress: log.ipAddress,
            userAgent: log.userAgent,
            success: log.success === 1,
            createdAt: new Date(log.createdAt),
          },
        });
      } catch (err) {
        console.error(`  ⚠️ Erro ao migrar log ${log.id}:`, err.message);
      }
    }
    console.log(`  ✅ ${loginLogs.length} logs migrados\n`);

    // 7. Migrar Payments
    console.log('📦 Migrando Payments...');
    const payments = sqliteDb.prepare('SELECT * FROM Payment').all();
    for (const payment of payments) {
      try {
        await postgresPrisma.payment.upsert({
          where: { id: payment.id },
          update: {},
          create: {
            id: payment.id,
            userId: payment.userId,
            mercadopagoId: payment.mercadopagoId || null,
            asaasId: payment.asaasId || null,
            amount: payment.amount,
            currency: payment.currency || 'BRL',
            status: payment.status || 'pending',
            type: payment.type,
            paymentMethod: payment.paymentMethod || null,
            planId: payment.planId || null,
            serviceId: payment.serviceId || null,
            appointmentId: payment.appointmentId || null,
            createdAt: new Date(payment.createdAt),
            updatedAt: new Date(payment.updatedAt || payment.createdAt),
          },
        });
      } catch (err) {
        console.error(`  ⚠️ Erro ao migrar payment ${payment.id}:`, err.message);
      }
    }
    console.log(`  ✅ ${payments.length} pagamentos migrados\n`);

    // 8. Migrar PaymentMetadata
    console.log('📦 Migrando PaymentMetadata...');
    const paymentMetadata = sqliteDb.prepare('SELECT * FROM PaymentMetadata').all();
    for (const metadata of paymentMetadata) {
      try {
        await postgresPrisma.paymentMetadata.upsert({
          where: { id: metadata.id },
          update: {},
          create: {
            id: metadata.id,
            userId: metadata.userId,
            metadata: metadata.metadata || '{}',
            asaasId: metadata.asaasId || null,
            createdAt: new Date(metadata.createdAt),
            expiresAt: new Date(metadata.expiresAt),
          },
        });
      } catch (err) {
        console.error(`  ⚠️ Erro ao migrar metadata ${metadata.id}:`, err.message);
      }
    }
    console.log(`  ✅ ${paymentMetadata.length} metadados migrados\n`);

    // 9. Migrar UserPlans
    console.log('📦 Migrando UserPlans...');
    const userPlans = sqliteDb.prepare('SELECT * FROM UserPlan').all();
    for (const plan of userPlans) {
      try {
        await postgresPrisma.userPlan.upsert({
          where: { id: plan.id },
          update: {},
          create: {
            id: plan.id,
            userId: plan.userId,
            planId: plan.planId,
            planName: plan.planName,
            modo: plan.modo,
            amount: plan.amount,
            status: plan.status || 'active',
            startDate: new Date(plan.startDate),
            endDate: plan.endDate ? new Date(plan.endDate) : null,
            readAt: plan.readAt ? new Date(plan.readAt) : null,
            createdAt: new Date(plan.createdAt),
            updatedAt: new Date(plan.updatedAt || plan.createdAt),
          },
        });
      } catch (err) {
        console.error(`  ⚠️ Erro ao migrar plan ${plan.id}:`, err.message);
      }
    }
    console.log(`  ✅ ${userPlans.length} planos migrados\n`);

    // 10. Migrar Subscriptions
    console.log('📦 Migrando Subscriptions...');
    const subscriptions = sqliteDb.prepare('SELECT * FROM Subscription').all();
    for (const subscription of subscriptions) {
      try {
        await postgresPrisma.subscription.upsert({
          where: { id: subscription.id },
          update: {},
          create: {
            id: subscription.id,
            userId: subscription.userId,
            userPlanId: subscription.userPlanId,
            asaasSubscriptionId: subscription.asaasSubscriptionId || null,
            paymentMethod: subscription.paymentMethod,
            billingDay: subscription.billingDay,
            status: subscription.status || 'active',
            nextBillingDate: new Date(subscription.nextBillingDate),
            lastBillingDate: subscription.lastBillingDate ? new Date(subscription.lastBillingDate) : null,
            createdAt: new Date(subscription.createdAt),
            updatedAt: new Date(subscription.updatedAt || subscription.createdAt),
          },
        });
      } catch (err) {
        console.error(`  ⚠️ Erro ao migrar subscription ${subscription.id}:`, err.message);
      }
    }
    console.log(`  ✅ ${subscriptions.length} assinaturas migradas\n`);

    // 11. Migrar Services
    console.log('📦 Migrando Services...');
    const services = sqliteDb.prepare('SELECT * FROM Service').all();
    for (const service of services) {
      try {
        await postgresPrisma.service.upsert({
          where: { id: service.id },
          update: {},
          create: {
            id: service.id,
            userId: service.userId,
            tipo: service.tipo,
            description: service.description || null,
            status: service.status || 'pendente',
            acceptedAt: service.acceptedAt ? new Date(service.acceptedAt) : null,
            createdAt: new Date(service.createdAt),
            updatedAt: new Date(service.updatedAt || service.createdAt),
          },
        });
      } catch (err) {
        console.error(`  ⚠️ Erro ao migrar service ${service.id}:`, err.message);
      }
    }
    console.log(`  ✅ ${services.length} serviços migrados\n`);

    // 12. Migrar ChatSessions
    console.log('📦 Migrando ChatSessions...');
    const chatSessions = sqliteDb.prepare('SELECT * FROM ChatSession').all();
    for (const session of chatSessions) {
      try {
        await postgresPrisma.chatSession.upsert({
          where: { id: session.id },
          update: {},
          create: {
            id: session.id,
            userId: session.userId,
            status: session.status || 'open',
            humanRequested: session.humanRequested === 1,
            adminAccepted: session.adminAccepted === 1,
            adminId: session.adminId || null,
            lastReadAt: session.lastReadAt ? new Date(session.lastReadAt) : null,
            createdAt: new Date(session.createdAt),
            updatedAt: new Date(session.updatedAt || session.createdAt),
          },
        });
      } catch (err) {
        console.error(`  ⚠️ Erro ao migrar chat session ${session.id}:`, err.message);
      }
    }
    console.log(`  ✅ ${chatSessions.length} sessões de chat migradas\n`);

    // 13. Migrar ChatMessages
    console.log('📦 Migrando ChatMessages...');
    const chatMessages = sqliteDb.prepare('SELECT * FROM ChatMessage').all();
    for (const message of chatMessages) {
      try {
        await postgresPrisma.chatMessage.upsert({
          where: { id: message.id },
          update: {},
          create: {
            id: message.id,
            chatSessionId: message.chatSessionId,
            senderType: message.senderType,
            content: message.content,
            createdAt: new Date(message.createdAt),
          },
        });
      } catch (err) {
        console.error(`  ⚠️ Erro ao migrar message ${message.id}:`, err.message);
      }
    }
    console.log(`  ✅ ${chatMessages.length} mensagens migradas\n`);

    // 14. Migrar BlockedTimeSlots
    console.log('📦 Migrando BlockedTimeSlots...');
    const blockedSlots = sqliteDb.prepare('SELECT * FROM BlockedTimeSlot').all();
    for (const slot of blockedSlots) {
      try {
        await postgresPrisma.blockedTimeSlot.upsert({
          where: { id: slot.id },
          update: {},
          create: {
            id: slot.id,
            data: slot.data,
            hora: slot.hora,
            ativo: slot.ativo === 1,
            createdAt: new Date(slot.createdAt),
          },
        });
      } catch (err) {
        console.error(`  ⚠️ Erro ao migrar slot ${slot.id}:`, err.message);
      }
    }
    console.log(`  ✅ ${blockedSlots.length} slots bloqueados migrados\n`);

    // 15. Migrar SiteSettings
    console.log('📦 Migrando SiteSettings...');
    const settings = sqliteDb.prepare('SELECT * FROM SiteSettings').all();
    for (const setting of settings) {
      try {
        await postgresPrisma.siteSettings.upsert({
          where: { id: setting.id },
          update: {},
          create: {
            id: setting.id,
            maintenanceMode: setting.maintenanceMode === 1,
            updatedAt: new Date(setting.updatedAt || setting.createdAt || new Date()),
          },
        });
      } catch (err) {
        console.error(`  ⚠️ Erro ao migrar setting ${setting.id}:`, err.message);
      }
    }
    console.log(`  ✅ ${settings.length} configurações migradas\n`);

    // 16. Migrar PasswordResetCodes
    console.log('📦 Migrando PasswordResetCodes...');
    const resetCodes = sqliteDb.prepare('SELECT * FROM PasswordResetCode').all();
    for (const code of resetCodes) {
      try {
        await postgresPrisma.passwordResetCode.upsert({
          where: { id: code.id },
          update: {},
          create: {
            id: code.id,
            email: code.email,
            code: code.code,
            used: code.used === 1,
            expiresAt: new Date(code.expiresAt),
            createdAt: new Date(code.createdAt),
          },
        });
      } catch (err) {
        console.error(`  ⚠️ Erro ao migrar code ${code.id}:`, err.message);
      }
    }
    console.log(`  ✅ ${resetCodes.length} códigos de reset migrados\n`);

    // 17. Migrar Coupons
    console.log('📦 Migrando Coupons...');
    const coupons = sqliteDb.prepare('SELECT * FROM Coupon').all();
    for (const coupon of coupons) {
      try {
        await postgresPrisma.coupon.upsert({
          where: { id: coupon.id },
          update: {},
          create: {
            id: coupon.id,
            code: coupon.code,
            couponType: coupon.couponType || 'plano',
            discountType: coupon.discountType,
            discountValue: coupon.discountValue,
            serviceType: coupon.serviceType || null,
            minValue: coupon.minValue || null,
            maxDiscount: coupon.maxDiscount || null,
            used: coupon.used === 1,
            usedAt: coupon.usedAt ? new Date(coupon.usedAt) : null,
            usedBy: coupon.usedBy || null,
            appointmentId: coupon.appointmentId || null,
            userPlanId: coupon.userPlanId || null,
            expiresAt: coupon.expiresAt ? new Date(coupon.expiresAt) : null,
            createdAt: new Date(coupon.createdAt),
          },
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
    sqliteDb.close();
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
