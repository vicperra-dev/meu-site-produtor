import nodemailer from "nodemailer";

/**
 * Envia email de solicitação de atendimento humano.
 * Se as credenciais não existirem, apenas loga no console
 * (não quebra o chat nem o backend).
 */
export async function sendHumanSupportEmail(
  userMessage: string,
  userId: string,
  userName: string,
  userEmail: string,
  sessionId: string
) {
  const user = process.env.SUPPORT_EMAIL;
  const pass = process.env.SUPPORT_EMAIL_PASSWORD;

  console.log("[sendHumanSupportEmail] ========================================");
  console.log("[sendHumanSupportEmail] Iniciando envio de email de atendimento humano");
  console.log("[sendHumanSupportEmail] SUPPORT_EMAIL:", user ? "✅ Configurado" : "❌ NÃO CONFIGURADO");
  console.log("[sendHumanSupportEmail] SUPPORT_EMAIL_PASSWORD:", pass ? "✅ Configurado" : "❌ NÃO CONFIGURADO");
  console.log("[sendHumanSupportEmail] SUPPORT_DEST_EMAIL:", process.env.SUPPORT_DEST_EMAIL || "❌ NÃO CONFIGURADO (usando padrão)");

  // 🔒 Se ainda não houver email configurado, apenas registra
  if (!user || !pass) {
    console.warn("📧 [sendHumanSupportEmail] Email de suporte NÃO configurado.");
    console.warn("📧 [sendHumanSupportEmail] Mensagem do usuário:", userMessage);
    console.log("[sendHumanSupportEmail] ========================================");
    return;
  }

  try {
    const transporter = createEmailTransporter();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const adminUrl = `${siteUrl}/admin/chats-pendentes`;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <tr>
            <td style="background-color: #dc2626; padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">👤 Atendimento Humano Solicitado</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px;">
              <h2 style="color: #1f2937; margin-top: 0; font-size: 24px;">Nova solicitação de atendimento humano</h2>
              <div style="background-color: #f9fafb; border-left: 4px solid #dc2626; padding: 20px; margin: 20px 0;">
                <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0;">
                  <strong>Mensagem do usuário:</strong><br>
                  ${userMessage.replace(/\n/g, "<br>")}
                </p>
              </div>
              <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
                <p style="color: #1f2937; margin: 5px 0;"><strong>Nome:</strong> ${userName}</p>
                <p style="color: #1f2937; margin: 5px 0;"><strong>Email:</strong> ${userEmail}</p>
                <p style="color: #1f2937; margin: 5px 0;"><strong>ID do Usuário:</strong> ${userId}</p>
                <p style="color: #1f2937; margin: 5px 0;"><strong>ID da Sessão:</strong> ${sessionId}</p>
                <p style="color: #1f2937; margin: 5px 0;"><strong>Data/Hora:</strong> ${new Date().toLocaleString("pt-BR")}</p>
              </div>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${adminUrl}" style="display: inline-block; background-color: #dc2626; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                  Ver Chats Pendentes
                </a>
              </div>
              <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
                Acesse o painel admin para aceitar esta solicitação e iniciar o atendimento simultâneo com o usuário.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">THouse Rec - Estúdio Musical Profissional</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    // Sempre enviar para o email da organização
    const destEmail = process.env.SUPPORT_DEST_EMAIL || "thouse.rec.tremv@gmail.com";

    console.log("[sendHumanSupportEmail] Preparando envio de email...");
    console.log("[sendHumanSupportEmail] De (from):", user);
    console.log("[sendHumanSupportEmail] Para (to):", destEmail);
    console.log("[sendHumanSupportEmail] Assunto: 👤 Atendimento Humano Solicitado - THouse Rec");

    const info = await transporter.sendMail({
      from: `"THouse Rec — Suporte" <${user}>`,
      to: destEmail,
      subject: "👤 Atendimento Humano Solicitado - THouse Rec",
      html: htmlContent,
    });

    console.log("✅ [sendHumanSupportEmail] Email enviado com SUCESSO!");
    console.log("✅ [sendHumanSupportEmail] MessageId:", info.messageId);
    console.log("✅ [sendHumanSupportEmail] Resposta:", info.response);
    console.log(`✅ [sendHumanSupportEmail] Solicitação de atendimento humano enviada para ${destEmail}`);
    console.log("[sendHumanSupportEmail] ========================================");
  } catch (error: any) {
    console.error("❌ [sendHumanSupportEmail] ========================================");
    console.error("❌ [sendHumanSupportEmail] ERRO AO ENVIAR EMAIL:");
    console.error("❌ [sendHumanSupportEmail] Tipo:", error?.constructor?.name || "Desconhecido");
    console.error("❌ [sendHumanSupportEmail] Mensagem:", error?.message || "Sem mensagem");
    console.error("❌ [sendHumanSupportEmail] Code:", error?.code || "Sem código");
    console.error("❌ [sendHumanSupportEmail] Response:", error?.response || "Sem resposta");
    if (error?.stack) {
      console.error("❌ [sendHumanSupportEmail] Stack:", error.stack);
    }
    console.error("❌ [sendHumanSupportEmail] ========================================");
    throw error; // Re-lançar o erro para que seja capturado no catch do route.ts
  }
}

/**
 * Envia email com código de recuperação de senha.
 * Se as credenciais não existirem, apenas loga no console.
 */
export async function sendPasswordResetEmail(email: string, code: string) {
  const user = process.env.SUPPORT_EMAIL;
  const pass = process.env.SUPPORT_EMAIL_PASSWORD;

  console.error("📧 [sendEmail] ========================================");
  console.error("📧 [sendEmail] Tentando enviar email de recuperação...");
  console.error("📧 [sendEmail] Email de origem:", user || "❌ NÃO CONFIGURADO");
  console.error("📧 [sendEmail] Senha de app:", pass ? "✅ Configurado" : "❌ NÃO CONFIGURADO");
  console.error("📧 [sendEmail] Email destino:", email);
  console.error("📧 [sendEmail] Código:", code);
  console.error("📧 [sendEmail] ========================================");

  // 🔒 Se ainda não houver email configurado, apenas registra
  if (!user || !pass) {
    console.warn("📧 Email de suporte NÃO configurado.");
    console.warn("Código de recuperação para", email, ":", code);
    return;
  }

  let transporter;
  try {
    transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user,
        pass,
      },
      tls: {
        rejectUnauthorized: false, // Ignorar certificados não confiáveis (apenas para desenvolvimento)
      },
      debug: true, // Ativar debug
      logger: true, // Ativar logger
    });

    // Verificar conexão antes de enviar
    console.error("📧 [sendEmail] Verificando conexão SMTP...");
    await transporter.verify();
    console.error("✅ [sendEmail] Conexão SMTP verificada!");
  } catch (verifyError: any) {
    console.error("❌ [DEBUG] Erro ao verificar conexão SMTP:");
    console.error("❌ [DEBUG] Erro:", verifyError.message);
    console.error("❌ [DEBUG] Code:", verifyError.code);
    throw verifyError;
  }

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color: #dc2626; padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">THouse Rec</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 30px;">
              <h2 style="color: #1f2937; margin-top: 0; font-size: 24px;">Recuperação de Senha</h2>
              
              <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
                Olá,<br><br>
                Você solicitou a recuperação de senha da sua conta na THouse Rec.
              </p>
              
              <!-- Código Box -->
              <div style="background-color: #f9fafb; border: 3px solid #dc2626; border-radius: 8px; padding: 30px; text-align: center; margin: 30px 0;">
                <p style="color: #6b7280; margin: 0 0 15px 0; font-size: 14px; font-weight: 600;">Seu código de verificação é:</p>
                <p style="color: #1f2937; font-size: 48px; font-weight: bold; letter-spacing: 8px; margin: 0; font-family: 'Courier New', monospace;">${code}</p>
              </div>
              
              <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
                <strong style="color: #1f2937;">Instruções:</strong><br>
                1. Acesse a página de verificação de código no site<br>
                2. Digite o código acima no campo indicado<br>
                3. Após a verificação, você poderá criar uma nova senha<br><br>
                <strong style="color: #dc2626;">Este código expira em 15 minutos.</strong><br><br>
                Se você não solicitou esta recuperação, ignore este email.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                THouse Rec - Estúdio Musical Profissional
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const textContent = `
THouse Rec - Recuperação de Senha

Olá,

Você solicitou a recuperação de senha da sua conta na THouse Rec.

Seu código de verificação é: ${code}

Instruções:
1. Acesse a página de verificação de código no site
2. Digite o código acima no campo indicado
3. Após a verificação, você poderá criar uma nova senha

Este código expira em 15 minutos.

Se você não solicitou esta recuperação, ignore este email.

---
THouse Rec - Estúdio Musical Profissional
  `;

  try {
    console.error("📧 [sendEmail] Iniciando envio do email...");
    console.error("📧 [sendEmail] Email de ORIGEM (from):", user);
    console.error("📧 [sendEmail] Email de DESTINO (to):", email);
    console.error("📧 [sendEmail] Verificando se são diferentes...");
    
    if (email === user) {
      console.error("⚠️ [sendEmail] ATENÇÃO: Email de destino é igual ao de origem!");
    }
    
    const info = await transporter.sendMail({
      from: `"THouse Rec" <${user}>`,
      to: email, // Email do usuário que solicitou a recuperação
      subject: "Código de Recuperação de Senha - THouse Rec",
      text: textContent,
      html: htmlContent,
    });
    
    console.error("\n✅ [sendEmail] ========================================");
    console.error("✅ [sendEmail] Email enviado com SUCESSO!");
    console.error("✅ [sendEmail] MessageId:", info.messageId);
    console.error("✅ [sendEmail] Resposta:", info.response);
    console.error("✅ [sendEmail] De (from):", user);
    console.error("✅ [sendEmail] Para (to):", email);
    console.error("✅ [sendEmail] Código:", code);
    console.error("✅ [sendEmail] ========================================\n");
    
    return info;
  } catch (error: any) {
    console.error("\n❌ [sendEmail] ========================================");
    console.error("❌ [sendEmail] ERRO AO ENVIAR EMAIL:");
    console.error("❌ [sendEmail] Tipo:", error?.constructor?.name || "Desconhecido");
    console.error("❌ [sendEmail] Mensagem:", error?.message || "Sem mensagem");
    console.error("❌ [sendEmail] Code:", error?.code || "Sem código");
    console.error("❌ [sendEmail] Response:", error?.response || "Sem resposta");
    if (error?.stack) {
      console.error("❌ [sendEmail] Stack:", error.stack);
    }
    console.error("❌ [sendEmail] ========================================\n");
    throw error;
  }
}

/**
 * Função auxiliar para criar transporter de email
 */
/**
 * Envia email quando pagamento de plano é confirmado
 */
export async function sendPlanPaymentConfirmationEmail(
  userEmail: string,
  userName: string,
  planName: string,
  modo: string,
  amount: number,
  endDate: Date
) {
  try {
    const transporter = createEmailTransporter();
    const formattedEndDate = endDate.toLocaleDateString("pt-BR");
    const modoLabel = modo === "mensal" ? "Mensal" : "Anual";

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <tr>
            <td style="background-color: #dc2626; padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">THouse Rec</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px;">
              <h2 style="color: #1f2937; margin-top: 0; font-size: 24px;">✅ Plano Ativado com Sucesso!</h2>
              <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
                Olá, <strong>${userName}</strong>,<br><br>
                Seu pagamento foi confirmado e seu plano foi ativado com sucesso!<br><br>
                <strong>Plano:</strong> ${planName}<br>
                <strong>Modalidade:</strong> ${modoLabel}<br>
                <strong>Valor pago:</strong> R$ ${amount.toFixed(2).replace(".", ",")}<br>
                <strong>Válido até:</strong> ${formattedEndDate}<br><br>
                <strong>🎟️ Seus cupons de serviços já estão disponíveis!</strong><br>
                Acesse sua conta para visualizar e usar seus cupons de serviços inclusos no plano.<br><br>
                Obrigado por escolher a THouse Rec!
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">THouse Rec - Estúdio Musical Profissional</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    await transporter.sendMail({
      from: `"THouse Rec" <${process.env.SUPPORT_EMAIL}>`,
      to: userEmail,
      subject: "✅ Plano Ativado - THouse Rec",
      html: htmlContent,
    });

    console.log(`[Email] Confirmação de plano enviada para ${userEmail}`);
  } catch (error: any) {
    console.error("[Email] Erro ao enviar email de confirmação de plano:", error);
    throw error;
  }
}

/**
 * Envia email quando plano é renovado automaticamente
 */
export async function sendPlanRenewalEmail(
  userEmail: string,
  userName: string,
  planName: string,
  modo: string,
  amount: number,
  newEndDate: Date,
  couponsCount: number
) {
  try {
    const transporter = createEmailTransporter();
    const formattedEndDate = newEndDate.toLocaleDateString("pt-BR");
    const modoLabel = modo === "mensal" ? "Mensal" : "Anual";

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <tr>
            <td style="background-color: #10b981; padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">🔄 Plano Renovado!</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px;">
              <h2 style="color: #1f2937; margin-top: 0; font-size: 24px;">Seu plano foi renovado automaticamente</h2>
              <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
                Olá, <strong>${userName}</strong>,<br><br>
                Seu plano foi renovado automaticamente e o pagamento foi processado com sucesso!<br><br>
                <strong>Plano:</strong> ${planName}<br>
                <strong>Modalidade:</strong> ${modoLabel}<br>
                <strong>Valor cobrado:</strong> R$ ${amount.toFixed(2).replace(".", ",")}<br>
                <strong>Nova data de expiração:</strong> ${formattedEndDate}<br><br>
                <strong>🎟️ Novos cupons de serviços disponíveis!</strong><br>
                ${couponsCount} novos cupons de serviços foram gerados e já estão disponíveis na sua conta.<br><br>
                Acesse sua conta para visualizar e usar seus novos cupons!<br><br>
                Obrigado por continuar com a THouse Rec!
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">THouse Rec - Estúdio Musical Profissional</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    await transporter.sendMail({
      from: `"THouse Rec" <${process.env.SUPPORT_EMAIL}>`,
      to: userEmail,
      subject: "🔄 Plano Renovado - THouse Rec",
      html: htmlContent,
    });

    console.log(`[Email] Renovação de plano enviada para ${userEmail}`);
  } catch (error: any) {
    console.error("[Email] Erro ao enviar email de renovação de plano:", error);
    throw error;
  }
}

/**
 * Envia email quando plano é cancelado
 */
export async function sendPlanCancellationEmail(
  userEmail: string,
  userName: string,
  planName: string,
  refundAmount: number | null,
  couponCode: string | null,
  servicesUsed: number,
  servicesTotal: number
) {
  try {
    const transporter = createEmailTransporter();
    
    const refundSection = refundAmount && refundAmount > 0
      ? `<div style="background-color: #fef3c7; border: 2px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 20px 0;">
           <p style="color: #92400e; margin: 0 0 10px 0; font-weight: bold;">Reembolso:</p>
           <p style="color: #1f2937; font-size: 24px; font-weight: bold; margin: 0;">R$ ${refundAmount.toFixed(2).replace(".", ",")}</p>
           <p style="color: #92400e; margin: 10px 0 0 0; font-size: 14px;">O estorno é solicitado via Asaas. O valor considera o pagamento menos os benefícios efetivamente utilizados (critério interno do plano).</p>
         </div>`
      : `<p style="color: #4b5563; font-size: 14px;">Não há reembolso disponível: o valor dos benefícios utilizados é igual ou superior ao valor pago, ou nenhum estorno foi solicitado.</p>`;

    const couponSection = couponCode
      ? `<div style="background-color: #dbeafe; border: 2px solid #3b82f6; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
           <p style="color: #1e40af; margin: 0 0 10px 0; font-weight: bold;">Cupom:</p>
           <p style="color: #1f2937; font-size: 32px; font-weight: bold; letter-spacing: 4px; margin: 0; font-family: 'Courier New', monospace;">${couponCode}</p>
           <p style="color: #1e40af; margin: 10px 0 0 0; font-size: 14px;">Use este código na página de agendamento, se aplicável.</p>
         </div>`
      : "";

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <tr>
            <td style="background-color: #f59e0b; padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">Plano Cancelado</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px;">
              <h2 style="color: #1f2937; margin-top: 0; font-size: 24px;">Seu plano foi cancelado</h2>
              <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
                Olá, <strong>${userName}</strong>,<br><br>
                Seu plano <strong>${planName}</strong> foi cancelado com efeito imediato.<br><br>
                <strong>Serviços/benefícios utilizados:</strong> ${servicesUsed} de ${servicesTotal}<br>
                ${servicesUsed > 0 ? `<p style="color: #4b5563; font-size: 14px;">Os cupons dos benefícios que você já utilizou permanecem no histórico.</p>` : ""}
                ${refundSection}
                ${couponSection}
                <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-top: 20px;">
                  Cupons de benefício não utilizados foram invalidados. Novas cobranças e novos ciclos não serão gerados.<br><br>
                  Detalhes em Minha Conta e em /termos-contratos.<br><br>
                  Obrigado por ter escolhido a THouse Rec!
                </p>
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">THouse Rec - Estúdio Musical Profissional</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    await transporter.sendMail({
      from: `"THouse Rec" <${process.env.SUPPORT_EMAIL}>`,
      to: userEmail,
      subject: "Plano Cancelado - THouse Rec",
      html: htmlContent,
    });

    console.log(`[Email] Cancelamento de plano enviado para ${userEmail}`);
  } catch (error: any) {
    console.error("[Email] Erro ao enviar email de cancelamento de plano:", error);
    throw error;
  }
}

/**
 * Envia email para THouse quando usuário faz pergunta no FAQ
 */
export async function sendFAQQuestionEmail(
  question: string,
  userName: string,
  userEmail: string,
  userId: string | null,
  questionId: string
) {
  try {
    const transporter = createEmailTransporter();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const adminUrl = `${siteUrl}/admin/faq/pendentes`;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <tr>
            <td style="background-color: #dc2626; padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">Nova Pergunta no FAQ</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px;">
              <h2 style="color: #1f2937; margin-top: 0; font-size: 24px;">Uma nova pergunta foi enviada</h2>
              <div style="background-color: #f9fafb; border-left: 4px solid #dc2626; padding: 20px; margin: 20px 0;">
                <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0;">
                  <strong>Pergunta:</strong><br>
                  ${question.replace(/\n/g, "<br>")}
                </p>
              </div>
              <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
                <p style="color: #1f2937; margin: 5px 0;"><strong>Nome:</strong> ${userName}</p>
                <p style="color: #1f2937; margin: 5px 0;"><strong>Email:</strong> ${userEmail}</p>
                ${userId ? `<p style="color: #1f2937; margin: 5px 0;"><strong>ID do Usuário:</strong> ${userId}</p>` : ""}
                <p style="color: #1f2937; margin: 5px 0;"><strong>ID da Pergunta:</strong> ${questionId}</p>
              </div>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${adminUrl}" style="display: inline-block; background-color: #dc2626; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                  Ver Perguntas Pendentes
                </a>
              </div>
              <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
                Acesse o painel admin para responder esta pergunta e, se desejar, publicá-la no FAQ público.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">THouse Rec - Estúdio Musical Profissional</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    // Sempre enviar para o email da organização
    const destEmail = process.env.SUPPORT_DEST_EMAIL || "thouse.rec.tremv@gmail.com";

    await transporter.sendMail({
      from: `"THouse Rec - FAQ" <${process.env.SUPPORT_EMAIL}>`,
      to: destEmail,
      subject: `Nova Pergunta no FAQ - ${userName}`,
      html: htmlContent,
    });

    console.log(`[Email] Notificação de pergunta FAQ enviada para ${destEmail}`);
  } catch (error: any) {
    console.error("[Email] Erro ao enviar email de pergunta FAQ:", error);
    throw error;
  }
}

/**
 * Envia email para usuário quando admin responde sua pergunta
 */
export async function sendFAQAnswerEmail(
  userEmail: string,
  userName: string,
  question: string,
  answer: string
) {
  try {
    const transporter = createEmailTransporter();

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <tr>
            <td style="background-color: #10b981; padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">Sua Pergunta Foi Respondida!</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px;">
              <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
                Olá, <strong>${userName}</strong>,<br><br>
                Sua pergunta foi respondida pela equipe THouse Rec!
              </p>
              <div style="background-color: #f9fafb; border-left: 4px solid #10b981; padding: 20px; margin: 20px 0;">
                <p style="color: #1f2937; font-size: 14px; margin: 0 0 10px 0;"><strong>Sua Pergunta:</strong></p>
                <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0;">
                  ${question.replace(/\n/g, "<br>")}
                </p>
              </div>
              <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 20px; margin: 20px 0;">
                <p style="color: #1f2937; font-size: 14px; margin: 0 0 10px 0;"><strong>Resposta:</strong></p>
                <p style="color: #065f46; font-size: 16px; line-height: 1.6; margin: 0;">
                  ${answer.replace(/\n/g, "<br>")}
                </p>
              </div>
              <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-top: 20px;">
                Você também pode visualizar esta resposta na seção "Minhas Perguntas" da sua conta.<br><br>
                Obrigado por entrar em contato com a THouse Rec!
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">THouse Rec - Estúdio Musical Profissional</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    await transporter.sendMail({
      from: `"THouse Rec" <${process.env.SUPPORT_EMAIL}>`,
      to: userEmail,
      subject: "Sua Pergunta Foi Respondida - THouse Rec",
      html: htmlContent,
    });

    console.log(`[Email] Resposta de FAQ enviada para ${userEmail}`);
  } catch (error: any) {
    console.error("[Email] Erro ao enviar email de resposta FAQ:", error);
    throw error;
  }
}

function createEmailTransporter() {
  const user = process.env.SUPPORT_EMAIL;
  const pass = process.env.SUPPORT_EMAIL_PASSWORD;

  if (!user || !pass) {
    throw new Error("Email não configurado");
  }

  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user,
      pass,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
}

/**
 * Envia email para usuário após pagamento confirmado
 */
export async function sendPaymentConfirmationEmailToUser(
  userEmail: string,
  userName: string,
  appointmentDate: Date,
  amount: number
) {
  try {
    const transporter = createEmailTransporter();
    const formattedDate = appointmentDate.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <tr>
            <td style="background-color: #dc2626; padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">THouse Rec</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px;">
              <h2 style="color: #1f2937; margin-top: 0; font-size: 24px;">✅ Pagamento Confirmado!</h2>
              <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
                Olá, <strong>${userName}</strong>,<br><br>
                Seu pagamento foi confirmado com sucesso!<br><br>
                <strong>Valor pago:</strong> R$ ${amount.toFixed(2).replace(".", ",")}<br>
                <strong>Data do agendamento:</strong> ${formattedDate}<br><br>
                Em até <strong>24 horas</strong>, você receberá outro email com a confirmação do seu agendamento.<br><br>
                <strong>Próximos passos:</strong><br>
                • Se seu agendamento for <strong>aceito</strong>, você receberá todas as informações necessárias<br>
                • Se seu agendamento for <strong>negado</strong>, você poderá solicitar:<br>
                  - Reembolso integral do valor pago<br>
                  - Cupom de desconto no valor do serviço para remarcar em outro dia/horário<br><br>
                Obrigado por escolher a THouse Rec!
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">THouse Rec - Estúdio Musical Profissional</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    await transporter.sendMail({
      from: `"THouse Rec" <${process.env.SUPPORT_EMAIL}>`,
      to: userEmail,
      subject: "✅ Pagamento Confirmado - THouse Rec",
      html: htmlContent,
    });

    console.log(`[Email] Pagamento confirmado enviado para ${userEmail}`);
  } catch (error: any) {
    console.error("[Email] Erro ao enviar email de confirmação de pagamento:", error);
    throw error;
  }
}

/**
 * Envia email para THouse após pagamento confirmado
 */
export async function sendPaymentNotificationToTHouse(
  userEmail: string,
  userName: string,
  userPhone: string,
  appointmentDate: Date,
  appointmentType: string,
  duration: number,
  observations: string | null,
  amount: number,
  paymentMethod: string | null,
  services: any[],
  beats: any[]
) {
  try {
    const transporter = createEmailTransporter();
    // Sempre enviar para o email da organização
    const thouseEmail = process.env.SUPPORT_DEST_EMAIL || "thouse.rec.tremv@gmail.com";
    const formattedDate = appointmentDate.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const servicesList = services.length > 0 
      ? services.map(s => `${s.nome} (${s.quantidade}x) - R$ ${(s.preco * s.quantidade).toFixed(2).replace(".", ",")}`).join("<br>")
      : "Nenhum serviço adicional";
    
    const beatsList = beats.length > 0
      ? beats.map(b => `${b.nome} (${b.quantidade}x) - R$ ${(b.preco * b.quantidade).toFixed(2).replace(".", ",")}`).join("<br>")
      : "Nenhum beat adicional";

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <tr>
            <td style="background-color: #dc2626; padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">💰 Novo Pagamento Recebido</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px;">
              <h2 style="color: #1f2937; margin-top: 0; font-size: 24px;">Novo serviço pago!</h2>
              
              <div style="background-color: #f9fafb; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0;">
                <h3 style="color: #1f2937; margin-top: 0;">Informações do Cliente</h3>
                <p style="color: #4b5563; margin: 5px 0;"><strong>Nome:</strong> ${userName}</p>
                <p style="color: #4b5563; margin: 5px 0;"><strong>Email:</strong> ${userEmail}</p>
                <p style="color: #4b5563; margin: 5px 0;"><strong>Telefone:</strong> ${userPhone}</p>
              </div>

              <div style="background-color: #f9fafb; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0;">
                <h3 style="color: #1f2937; margin-top: 0;">Detalhes do Agendamento</h3>
                <p style="color: #4b5563; margin: 5px 0;"><strong>Data/Hora:</strong> ${formattedDate}</p>
                <p style="color: #4b5563; margin: 5px 0;"><strong>Tipo:</strong> ${appointmentType}</p>
                <p style="color: #4b5563; margin: 5px 0;"><strong>Duração:</strong> ${duration} minutos</p>
                ${observations ? `<p style="color: #4b5563; margin: 5px 0;"><strong>Observações:</strong> ${observations}</p>` : ""}
              </div>

              <div style="background-color: #f9fafb; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0;">
                <h3 style="color: #1f2937; margin-top: 0;">Serviços Selecionados</h3>
                <p style="color: #4b5563; margin: 5px 0;">${servicesList}</p>
                <p style="color: #4b5563; margin: 5px 0;"><strong>Beats:</strong></p>
                <p style="color: #4b5563; margin: 5px 0;">${beatsList}</p>
              </div>

              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
                <h3 style="color: #1f2937; margin-top: 0;">Informações de Pagamento</h3>
                ${paymentMethod === "cupom" ? (
                  `<p style="color: #10b981; margin: 5px 0; font-weight: bold;">✅ Pago com Cupom</p>
                   <p style="color: #4b5563; margin: 5px 0;"><strong>Valor Total:</strong> R$ 0,00 (Cupom aplicado)</p>`
                ) : (
                  `<p style="color: #4b5563; margin: 5px 0;"><strong>Valor Total:</strong> R$ ${amount.toFixed(2).replace(".", ",")}</p>
                   <p style="color: #4b5563; margin: 5px 0;"><strong>Método:</strong> ${paymentMethod || "Não informado"}</p>`
                )}
              </div>

              <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-top: 20px;">
                <strong>Acesse o painel admin para revisar e aceitar/recusar este agendamento.</strong>
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">THouse Rec - Estúdio Musical Profissional</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    await transporter.sendMail({
      from: `"THouse Rec - Sistema" <${process.env.SUPPORT_EMAIL}>`,
      to: thouseEmail,
      subject: `💰 Novo Pagamento Recebido - ${userName}`,
      html: htmlContent,
    });

    console.log(`[Email] Notificação de pagamento enviada para THouse sobre ${userEmail}`);
  } catch (error: any) {
    console.error("[Email] Erro ao enviar notificação de pagamento para THouse:", error);
    throw error;
  }
}

/**
 * Envia email quando agendamento é aceito
 */
export async function sendAppointmentAcceptedEmail(
  userEmail: string,
  userName: string,
  appointmentDate: Date,
  appointmentType: string
) {
  try {
    const transporter = createEmailTransporter();
    const formattedDate = appointmentDate.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    const formattedTime = appointmentDate.toLocaleString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const address = "Rua São Clemente 114, apartamento 1203";

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <tr>
            <td style="background-color: #10b981; padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">✅ Agendamento Confirmado!</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px;">
              <h2 style="color: #1f2937; margin-top: 0; font-size: 24px;">Olá, ${userName}!</h2>
              <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
                Seu agendamento foi <strong>confirmado</strong>! Estamos ansiosos para trabalhar com você!<br><br>
                <strong>📅 Data:</strong> ${formattedDate}<br>
                <strong>🕐 Horário:</strong> ${formattedTime}<br>
                <strong>🎵 Tipo:</strong> ${appointmentType}<br>
                <strong>📍 Endereço:</strong> ${address}<br><br>
                Nos vemos em breve! Se tiver alguma dúvida, entre em contato conosco.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">THouse Rec - Estúdio Musical Profissional</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    await transporter.sendMail({
      from: `"THouse Rec" <${process.env.SUPPORT_EMAIL}>`,
      to: userEmail,
      subject: "✅ Agendamento Confirmado - THouse Rec",
      html: htmlContent,
    });

    console.log(`[Email] Agendamento aceito enviado para ${userEmail}`);
  } catch (error: any) {
    console.error("[Email] Erro ao enviar email de agendamento aceito:", error);
    throw error;
  }
}

/**
 * Envia email quando agendamento é recusado
 */
export async function sendAppointmentRejectedEmail(
  userEmail: string,
  userName: string,
  rejectionComment: string,
  couponCode?: string
) {
  try {
    const transporter = createEmailTransporter();
    const couponSection = couponCode 
      ? `<div style="background-color: #fef3c7; border: 2px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
           <p style="color: #92400e; margin: 0 0 10px 0; font-weight: bold;">🎟️ Seu Cupom de Desconto:</p>
           <p style="color: #1f2937; font-size: 32px; font-weight: bold; letter-spacing: 4px; margin: 0; font-family: 'Courier New', monospace;">${couponCode}</p>
           <p style="color: #92400e; margin: 10px 0 0 0; font-size: 14px;">Use este código na página de agendamento para remarcar sem pagar novamente!</p>
         </div>`
      : "";

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <tr>
            <td style="background-color: #ef4444; padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">Agendamento Recusado</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px;">
              <h2 style="color: #1f2937; margin-top: 0; font-size: 24px;">Olá, ${userName}!</h2>
              <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
                Que pena, seu agendamento foi recusado. Mas não desanime!<br><br>
                <strong>Comentário:</strong><br>
                ${rejectionComment}<br><br>
                <strong>Próximos passos:</strong><br>
                Você pode escolher uma das seguintes opções:<br><br>
                1️⃣ <strong>Solicitar reembolso financeiro</strong> do valor elegível (via Asaas)<br>
                2️⃣ <strong>Escolher um cupom de remarcação</strong> para reagendar<br><br>
                Faça a escolha na <strong>Minha Conta</strong> no site. Se precisar de ajuda, escreva para <a href="mailto:thouse.rec.tremv@gmail.com">thouse.rec.tremv@gmail.com</a>.
              </p>
              ${couponSection}
            </td>
          </tr>
          <tr>
            <td style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">THouse Rec - Estúdio Musical Profissional</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    await transporter.sendMail({
      from: `"THouse Rec" <${process.env.SUPPORT_EMAIL}>`,
      to: userEmail,
      subject: "Agendamento Recusado - THouse Rec",
      html: htmlContent,
    });

    console.log(`[Email] Agendamento recusado enviado para ${userEmail}`);
  } catch (error: any) {
    console.error("[Email] Erro ao enviar email de agendamento recusado:", error);
    throw error;
  }
}

/**
 * Envia email para usuário quando chat é aceito pelo admin
 */
export async function sendChatAcceptedEmail(
  userEmail: string,
  userName: string,
  sessionId: string
) {
  try {
    const transporter = createEmailTransporter();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const chatUrl = `${siteUrl}/chat`;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <tr>
            <td style="background-color: #10b981; padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">✅ Chat Aceito!</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px;">
              <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
                Olá, <strong>${userName}</strong>,<br><br>
                Sua solicitação de atendimento humano foi <strong>aceita</strong>! Nossa equipe está pronta para te ajudar.
              </p>
              <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 20px; margin: 20px 0;">
                <p style="color: #065f46; font-size: 16px; line-height: 1.6; margin: 0;">
                  Você pode acessar o chat agora para conversar diretamente com um de nossos atendentes. Estamos prontos para responder suas dúvidas!
                </p>
              </div>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${chatUrl}" style="display: inline-block; background-color: #10b981; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                  Acessar Chat
                </a>
              </div>
              <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
                Você receberá notificações por email sempre que nossa equipe responder suas mensagens.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">THouse Rec - Estúdio Musical Profissional</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    await transporter.sendMail({
      from: `"THouse Rec - Chat" <${process.env.SUPPORT_EMAIL}>`,
      to: userEmail,
      subject: "✅ Chat Aceito - THouse Rec",
      html: htmlContent,
    });

    console.log(`[Email] Notificação de chat aceito enviada para ${userEmail}`);
  } catch (error: any) {
    console.error("[Email] Erro ao enviar email de chat aceito:", error);
    throw error;
  }
}

/**
 * Envia email para usuário quando admin responde no chat
 */
export async function sendChatResponseEmail(
  userEmail: string,
  userName: string,
  adminMessage: string,
  sessionId: string
) {
  try {
    const transporter = createEmailTransporter();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const chatUrl = `${siteUrl}/chat`;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <tr>
            <td style="background-color: #10b981; padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">💬 Nova Resposta no Chat</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px;">
              <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
                Olá, <strong>${userName}</strong>,<br><br>
                Você recebeu uma nova resposta da nossa equipe no chat!
              </p>
              <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 20px; margin: 20px 0;">
                <p style="color: #1f2937; font-size: 14px; margin: 0 0 10px 0;"><strong>Resposta da equipe:</strong></p>
                <p style="color: #065f46; font-size: 16px; line-height: 1.6; margin: 0;">
                  ${adminMessage.replace(/\n/g, "<br>")}
                </p>
              </div>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${chatUrl}" style="display: inline-block; background-color: #10b981; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                  Ver Conversa Completa
                </a>
              </div>
              <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
                Acesse o chat para continuar a conversa e ver todas as mensagens trocadas.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">THouse Rec - Estúdio Musical Profissional</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    await transporter.sendMail({
      from: `"THouse Rec - Chat" <${process.env.SUPPORT_EMAIL}>`,
      to: userEmail,
      subject: "💬 Nova Resposta no Chat - THouse Rec",
      html: htmlContent,
    });

    console.log(`[Email] Notificação de resposta no chat enviada para ${userEmail}`);
  } catch (error: any) {
    console.error("[Email] Erro ao enviar email de resposta no chat:", error);
    throw error;
  }
}

/**
 * Envia email quando agendamento é cancelado
 */
export async function sendAppointmentCancelledEmail(
  userEmail: string,
  userName: string,
  appointmentDate: Date,
  cancellationComment: string,
  couponCode?: string
) {
  try {
    const transporter = createEmailTransporter();
    const formattedDate = appointmentDate.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    const couponSection = couponCode 
      ? `<div style="background-color: #fef3c7; border: 2px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
           <p style="color: #92400e; margin: 0 0 10px 0; font-weight: bold;">🎟️ Seu Cupom de Desconto:</p>
           <p style="color: #1f2937; font-size: 32px; font-weight: bold; letter-spacing: 4px; margin: 0; font-family: 'Courier New', monospace;">${couponCode}</p>
           <p style="color: #92400e; margin: 10px 0 0 0; font-size: 14px;">Use este código na página de agendamento para remarcar sem pagar novamente!</p>
         </div>`
      : "";

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <tr>
            <td style="background-color: #f59e0b; padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">Agendamento Cancelado</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px;">
              <h2 style="color: #1f2937; margin-top: 0; font-size: 24px;">Olá, ${userName}!</h2>
              <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
                Infelizmente, seu agendamento do dia <strong>${formattedDate}</strong> foi cancelado.<br><br>
                <strong>Motivo do cancelamento:</strong><br>
                ${cancellationComment}<br><br>
                <strong>Próximos passos:</strong><br>
                Você pode escolher uma das seguintes opções:<br><br>
                1️⃣ <strong>Solicitar reembolso financeiro</strong> do valor elegível (via Asaas)<br>
                2️⃣ <strong>Escolher um cupom de remarcação</strong> para reagendar<br><br>
                Faça a escolha na <strong>Minha Conta</strong> no site. Se precisar de ajuda, escreva para <a href="mailto:thouse.rec.tremv@gmail.com">thouse.rec.tremv@gmail.com</a>.
              </p>
              ${couponSection}
            </td>
          </tr>
          <tr>
            <td style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">THouse Rec - Estúdio Musical Profissional</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    await transporter.sendMail({
      from: `"THouse Rec" <${process.env.SUPPORT_EMAIL}>`,
      to: userEmail,
      subject: "Agendamento Cancelado - THouse Rec",
      html: htmlContent,
    });

    console.log(`[Email] Agendamento cancelado enviado para ${userEmail}`);
  } catch (error: any) {
    console.error("[Email] Erro ao enviar email de agendamento cancelado:", error);
    throw error;
  }
}
