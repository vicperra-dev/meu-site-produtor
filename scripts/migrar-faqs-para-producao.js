const { PrismaClient } = require('@prisma/client');

// Usar DATABASE_URL do ambiente (produção)
const prisma = new PrismaClient();

async function migrarFAQs() {
  try {
    console.log('[Migrar FAQs] Verificando FAQs no banco de produção...');
    
    // Contar FAQs existentes
    const totalAntes = await prisma.fAQ.count();
    console.log(`[Migrar FAQs] FAQs existentes no banco de produção: ${totalAntes}`);
    
    // Lista de FAQs para criar (caso não existam)
    const faqsParaCriar = [
      {
        question: "Como funciona o pagamento no site?",
        answer: "O pagamento é processado através do Asaas, aceitando cartão de crédito, débito, Pix e boleto. Após selecionar seu plano ou serviço, você será redirecionado para a plataforma segura do Asaas para finalizar o pagamento."
      },
      {
        question: "Meu pagamento ficou pendente e não liberou o plano.",
        answer: "Pagamentos pendentes geralmente são análises do banco ou do próprio Asaas. Aguarde alguns minutos e atualize a página. Se o status continuar pendente por mais de 30 minutos, verifique no seu extrato do Asaas ou do cartão. Se aparecer como recusado ou cancelado, será necessário tentar novamente."
      },
      {
        question: "Como faço pagamento via Pix?",
        answer: "Ao selecionar Pix como forma de pagamento, você receberá um QR Code ou código Pix para copiar. Abra seu aplicativo bancário, escaneie o QR Code ou cole o código, confirme o pagamento e aguarde a confirmação. O pagamento via Pix é instantâneo e geralmente confirma em poucos segundos."
      },
      {
        question: "Como agendar uma sessão?",
        answer: "Para agendar uma sessão, faça login no site, acesse a página de agendamento, selecione a data e horário desejados, escolha os serviços que precisa (captação, mix, master, etc.) e finalize o pagamento. Após o pagamento ser confirmado, seu agendamento será liberado."
      },
      {
        question: "Como funcionam os planos?",
        answer: "Os planos da THouse Rec oferecem horas de captação, mix & master e beats mensais ou anuais, com descontos em relação aos serviços avulsos. Você pode escolher entre os planos Bronze, Prata ou Ouro, cada um com benefícios diferentes. Os cupons de serviços são liberados automaticamente após a confirmação do pagamento."
      },
      {
        question: "Posso cancelar meu plano?",
        answer: "Sim, você pode cancelar seu plano a qualquer momento através da página 'Minha Conta'. Ao cancelar, você pode optar por receber um reembolso direto para sua conta bancária ou um cupom de reembolso no valor proporcional aos serviços não utilizados."
      },
      {
        question: "Como usar um cupom de desconto?",
        answer: "Ao fazer um agendamento ou contratar um serviço, você verá a opção de aplicar um cupom. Digite o código do cupom no campo indicado e o desconto será aplicado automaticamente. Os cupons têm validade e podem ter restrições de uso."
      },
      {
        question: "Como faço login no site?",
        answer: "Acesse a página de login, informe seu email e senha cadastrados e clique em 'Entrar'. Se você esqueceu sua senha, use a opção 'Esqueci a senha' para receber um código de recuperação por email."
      },
    ];
    
    console.log(`[Migrar FAQs] Criando ${faqsParaCriar.length} FAQs básicas...`);
    
    let criadas = 0;
    let jaExistentes = 0;
    
    for (const faq of faqsParaCriar) {
      // Verificar se já existe uma FAQ similar
      const existe = await prisma.fAQ.findFirst({
        where: {
          question: {
            contains: faq.question.substring(0, 30), // Primeiros 30 caracteres
          },
        },
      });
      
      if (existe) {
        console.log(`[Migrar FAQs] ⏭️  FAQ já existe: "${faq.question.substring(0, 50)}..."`);
        jaExistentes++;
        continue;
      }
      
      // Criar FAQ
      await prisma.fAQ.create({
        data: faq,
      });
      
      criadas++;
      console.log(`[Migrar FAQs] ✅ Criada: "${faq.question.substring(0, 50)}..."`);
    }
    
    const totalDepois = await prisma.fAQ.count();
    
    console.log(`\n[Migrar FAQs] ✅ Migração concluída!`);
    console.log(`  - FAQs criadas: ${criadas}`);
    console.log(`  - FAQs já existentes: ${jaExistentes}`);
    console.log(`  - Total antes: ${totalAntes}`);
    console.log(`  - Total depois: ${totalDepois}`);
    
  } catch (error) {
    console.error('[Migrar FAQs] ❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

migrarFAQs();
