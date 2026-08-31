// prisma/seed.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const faqs = [
  // ==========================
  // PAGAMENTOS (10 perguntas)
  // ==========================
  {
    question: "Como funciona o pagamento no site?",
    answer: "O pagamento é processado pelo Asaas, aceitando cartão de crédito, débito, Pix e boleto conforme o checkout. Após selecionar seu plano ou serviço, você conclui o pagamento no ambiente seguro do Asaas."
  },
  {
    question: "Meu pagamento ficou pendente e não liberou o plano.",
    answer: "Pagamentos pendentes geralmente são análises do banco ou do Asaas. Aguarde alguns minutos e atualize a página. Se o status continuar pendente por mais de 30 minutos, verifique no seu extrato bancário ou do cartão. Se aparecer como recusado ou cancelado, será necessário tentar novamente."
  },
  {
    question: "O pagamento foi recusado, mas o limite do cartão está ok.",
    answer: "A recusa pode ocorrer por regras de segurança do banco emissor ou do Asaas. Tente novamente usando outro cartão, outra forma de pagamento (como Pix ou boleto) ou entre em contato com o seu banco para liberar a transação online."
  },
  {
    question: "Como faço pagamento via Pix?",
    answer: "Ao selecionar Pix como forma de pagamento, você receberá um QR Code ou código Pix para copiar. Abra seu aplicativo bancário, escaneie o QR Code ou cole o código, confirme o pagamento e aguarde a confirmação. O pagamento via Pix é instantâneo e geralmente confirma em poucos segundos."
  },
  {
    question: "Não consigo finalizar o pagamento com Pix.",
    answer: "Confirme se o seu aplicativo bancário está atualizado e se o QR Code ou link Pix não está expirado. Alguns métodos de Pix têm tempo limite de pagamento. Caso o banco não reconheça o QR Code ou o link, tente gerar um novo pagamento no site ou use outro método, como cartão."
  },
  {
    question: "Eu paguei, mas não fui redirecionado de volta para o site.",
    answer: "Alguns navegadores bloqueiam o redirecionamento automático ou o usuário fecha a aba antes do retorno. Verifique no seu e-mail se o pagamento foi confirmado e depois faça login novamente no site. Se o pagamento estiver aprovado, seu plano ou agendamento deverá aparecer como ativo. Caso contrário, entre em contato com o suporte enviando o comprovante."
  },
  {
    question: "Paguei o plano, mas ele ainda aparece como inativo no site.",
    answer: "A ativação do plano depende da confirmação do pagamento e do processamento interno do sistema. Em geral, isso ocorre em poucos minutos. Se já se passaram mais de 30 minutos e nada mudou, atualize a página, faça logout e login novamente. Persistindo o problema, envie o comprovante para o suporte para ativação manual."
  },
  {
    question: "O valor cobrado pelo Asaas foi diferente do valor exibido no site.",
    answer: "Diferenças podem ocorrer por taxas de IOF, parcelamento, variação de bandeira ou arredondamento. Verifique o detalhamento da transação no extrato do Asaas/banco ou do cartão. Se a diferença for relevante e não estiver justificada por parcelamento ou taxas, entre em contato com o suporte informando o valor exibido no site e o valor cobrado."
  },
  {
    question: "Meu pagamento foi cobrado duas vezes.",
    answer: "Antes de tudo, verifique se realmente há duas transações aprovadas no extrato. Em alguns casos, uma delas aparece como pendente ou cancelada. Se houver duas cobranças aprovadas para o mesmo serviço ou plano, entre em contato imediatamente com o suporte e com o Asaas, anexando o comprovante das duas operações."
  },
  {
    question: "O site mostra erro ao tentar criar o pagamento.",
    answer: "Isso pode ser um erro temporário de comunicação com o Asaas. Feche a página de pagamento, volte para a página de planos ou agendamentos e tente novamente. Se o erro persistir, limpe o cache do navegador ou experimente outro dispositivo."
  },

  // ==========================
  // AGENDAMENTO (10 perguntas)
  // ==========================
  {
    question: "Como faço um agendamento?",
    answer: "Para agendar uma sessão, acesse a página de Agendamento, selecione os serviços ou pacotes desejados, escolha uma data disponível no calendário, selecione um horário e confirme. Você precisará estar logado e aceitar os termos de contrato antes de finalizar."
  },
  {
    question: "Não consigo selecionar horário na agenda, o botão não responde.",
    answer: "Verifique se você selecionou primeiro uma data no calendário. Os horários só são habilitados depois de escolher um dia válido. Caso o problema continue, limpe o cache do navegador ou teste em aba anônima, pois configurações antigas podem estar interferindo."
  },
  {
    question: "Meu agendamento some depois que eu clico em confirmar.",
    answer: "Após confirmar o agendamento, você é redirecionado para a área de planos/pagamentos. O agendamento só é considerado válido depois que essa etapa é concluída. Confira na sua área de usuário se o agendamento aparece na lista e, se não aparecer, refaça o processo confirmando também o pagamento."
  },
  {
    question: "A agenda está toda vazia, não aparecem dias ou horários.",
    answer: "Isso pode acontecer quando o navegador bloqueia scripts ou quando há um erro de conexão temporário. Atualize a página, garanta que o JavaScript esteja habilitado e teste em outro navegador ou dispositivo. Se o problema persistir, tire um print e envie para o suporte."
  },
  {
    question: "O site diz que não há horários disponíveis, mas eu vejo dias livres.",
    answer: "Os horários são liberados conforme a configuração interna do estúdio. Se aparecer que não há horários, provavelmente esse dia foi bloqueado pelo estúdio ou os horários disponíveis já foram ocupados. Experimente escolher outro dia ou horário, ou entre em contato para confirmar a disponibilidade."
  },
  {
    question: "Eu confirmei a data, mas os horários aparecem em vermelho.",
    answer: "Horários em vermelho indicam que já estão ocupados por outros agendamentos. Escolha um horário em verde. Caso todos os horários de um dia estejam em vermelho, selecione outra data na agenda."
  },
  {
    question: "Como sei se o meu agendamento foi realmente confirmado?",
    answer: "Após finalizar o agendamento e a etapa de pagamentos, você receberá uma confirmação na tela e, em alguns casos, por e-mail. Você também poderá visualizar seus agendamentos confirmados na área de usuário. Se não encontrar o agendamento lá, é provável que o processo não tenha sido concluído."
  },
  {
    question: "Posso remarcar ou cancelar um agendamento pelo site?",
    answer: "Sim. Em cancelamento ou recusa de agendamento pago, use a Minha Conta para escolher reembolso financeiro (via Asaas) ou cupom de remarcação. Detalhes estão na Política de Cancelamento em /termos-contratos."
  },
  {
    question: "Não encontrei um horário que encaixa com a minha agenda.",
    answer: "Os horários disponíveis exibidos no site refletem a agenda oficial do estúdio. Se você precisar de um horário especial ou fora do padrão, entre em contato direto com o estúdio para verificar a possibilidade de um encaixe ou horário alternativo."
  },
  {
    question: "Consigo agendar sem escolher nenhum serviço ou pacote?",
    answer: "Não. Para evitar confusão no processo, é necessário selecionar pelo menos um serviço ou pacote antes de confirmar o agendamento. Isso ajuda o estúdio a entender o tipo de sessão que você precisa e a reservar o tempo adequado."
  },

  // ==========================
  // PLANOS (10 perguntas)
  // ==========================
  {
    question: "Qual a diferença entre os planos Bronze, Prata e Ouro?",
    answer: "Bronze: 1 sessão, 2h de captação, 1 Mix e 10% em serviços avulsos (sem Shopping exclusivo). Prata: 1 sessão, 2h captação, 1 Mix, 1 Master, 1 Beat e promoções exclusivas do Shopping. Ouro: 2 sessões, 4h captação, 2 Mix, 2 Master, 2 Beats, 10% em serviços e beats, Shopping exclusivo e acompanhamento artístico. Benefícios são mensais e não acumulam."
  },
  {
    question: "Qual a diferença entre contratar avulso e assinar um plano?",
    answer: "Nos serviços avulsos você paga por sessão ou por faixa. Os planos oferecem um pacote de benefícios por ciclo mensal (cupons) com melhor previsibilidade de custo. Consulte a página de Planos e os Termos para detalhes."
  },
  {
    question: "O que acontece se eu não usar todas as horas do meu plano no mês?",
    answer: "Benefícios não utilizados no ciclo mensal expiram e não acumulam para o mês seguinte. No plano anual há 12 ciclos mensais consecutivos. Organize sua agenda para aproveitar os cupons de cada ciclo."
  },
  {
    question: "Posso alterar de plano Bronze para Prata ou Ouro depois?",
    answer: "Sim, em geral é possível fazer upgrade de plano, ajustando o valor proporcional. Entre em contato com o suporte ou consulte a área de planos para verificar as condições específicas de mudança de plano."
  },
  {
    question: "Meu plano foi cobrado automaticamente e eu não queria renovar.",
    answer: "Se o plano é recorrente, a cobrança pode ser feita automaticamente enquanto a assinatura estiver ativa. Cancele pela Minha Conta para impedir novas cobranças (efeito imediato). O reembolso, quando elegível, desconta os benefícios já utilizados e é processado via Asaas."
  },
  {
    question: "Os planos têm desconto se eu pagar anualmente?",
    answer: "Sim, os planos oferecem opção de pagamento mensal ou anual. Confira os valores na página de Planos. No anual, os benefícios continuam sendo liberados em 12 ciclos mensais."
  },
  {
    question: "O que está incluído no Plano Bronze?",
    answer: "O Plano Bronze inclui 1 sessão (1h) por mês, 2h de captação por mês, 1 Mix por mês e 10% de desconto em serviços avulsos. Não inclui beats personalizados, promoções exclusivas do Shopping nem acompanhamento artístico."
  },
  {
    question: "O que está incluído no Plano Prata?",
    answer: "O Plano Prata inclui 1 sessão por mês, 2h de captação, 1 Mix, 1 Master, 1 Beat e acesso a promoções exclusivas do Shopping. Não inclui desconto percentual em serviços/beats nem acompanhamento artístico."
  },
  {
    question: "O que está incluído no Plano Ouro?",
    answer: "O Plano Ouro inclui 2 sessões, 4h de captação, 2 Mix, 2 Master, 2 Beats, 10% em serviços avulsos, 10% em beats, promoções exclusivas do Shopping e acompanhamento artístico com Tremv."
  },
  {
    question: "Posso cancelar meu plano a qualquer momento?",
    answer: "Sim. O cancelamento é imediato na Minha Conta: cessam novas cobranças e novos ciclos. Cupons não usados são invalidados. Se houver reembolso elegível, o valor é calculado descontando benefícios utilizados (critério interno) e o estorno é via Asaas. Veja /termos-contratos."
  },

  // ==========================
  // LOGIN / CONTA (10 perguntas)
  // ==========================
  {
    question: "Como faço login no site?",
    answer: "Para fazer login, acesse a página de Login, insira seu e-mail e senha cadastrados e clique em Entrar. Se você ainda não tem uma conta, clique em Registro para criar uma nova conta."
  },
  {
    question: "Não consigo fazer login na minha conta.",
    answer: "Verifique se o e-mail está digitado corretamente e se você está usando a mesma forma de login com que criou a conta (por exemplo, e-mail e senha ou login social). Se esqueceu a senha, utilize a opção de recuperação. Caso não receba e-mail de recuperação, confira a caixa de spam ou tente outro endereço de e-mail."
  },
  {
    question: "Esqueci minha senha e não recebi o e-mail para redefinir.",
    answer: "Confira se o e-mail cadastrado está correto e veja também a pasta de spam ou lixo eletrônico. Alguns provedores demoram alguns minutos para entregar o e-mail. Se mesmo assim não receber, tente novamente mais tarde ou entre em contato com o suporte informando o e-mail usado no cadastro."
  },
  {
    question: "Como recupero minha senha?",
    answer: "Na página de Login, clique no link 'Esqueci a senha'. Digite seu e-mail cadastrado e você receberá um e-mail com instruções para redefinir sua senha. Verifique também a pasta de spam caso não receba o e-mail."
  },
  {
    question: "Eu consigo acessar pelo computador, mas não pelo celular.",
    answer: "Isso pode ser causado por cache ou cookies antigos no celular. Tente limpar os dados do navegador ou usar o modo anônimo. Garanta também que você está acessando o mesmo endereço (URL) em ambos os dispositivos."
  },
  {
    question: "Minha sessão cai toda hora e eu sou deslogado.",
    answer: "Por segurança, algumas sessões expiram após um período sem uso. Se isso estiver acontecendo com frequência durante o uso, pode ser bloqueio de cookies pelo navegador. Verifique se o navegador está permitindo cookies para o site e se não está em modo de navegação restrita."
  },
  {
    question: "Não consigo atualizar meus dados de perfil.",
    answer: "Alguns campos, como e-mail usado para login ou CPF/CNPJ, podem ter restrições de edição. Se o campo não estiver habilitado, entre em contato com o suporte para solicitar a alteração manual, informando os dados corretos."
  },
  {
    question: "Como altero meu e-mail cadastrado?",
    answer: "Para alterar seu e-mail, acesse sua área de conta. Se o campo de e-mail não estiver habilitado para edição, entre em contato com o suporte informando o e-mail atual e o novo e-mail desejado para que a alteração seja processada manualmente."
  },
  {
    question: "Preciso estar logado para agendar?",
    answer: "Sim, é necessário estar logado para fazer agendamentos e contratar planos. Isso permite que você acompanhe seus agendamentos, histórico de pagamentos e tenha acesso aos benefícios do seu plano."
  },
  {
    question: "Como crio uma conta no site?",
    answer: "Para criar uma conta, acesse a página de Registro, preencha seus dados (nome, e-mail, senha) e clique em Registrar. Após o registro, você poderá fazer login e começar a usar os serviços do estúdio."
  },

  // ==========================
  // ERROS / TÉCNICO (10 perguntas)
  // ==========================
  {
    question: "O site não abre ou fica travando na minha internet.",
    answer: "Verifique se sua conexão está estável e teste em outro navegador (como Chrome ou Firefox). Fechar outras abas pesadas e reiniciar o roteador também pode ajudar. Se o problema ocorrer apenas neste site e em vários dispositivos, entre em contato com o suporte enviando prints."
  },
  {
    question: "Recebo uma mensagem de erro desconhecido ao tentar usar o site.",
    answer: "Erros desconhecidos podem ser falhas temporárias do servidor ou alguma condição não tratada pelo sistema. Anote (ou fotografe) a mensagem exata que aparece na tela e envie para o suporte, informando também o horário aproximado em que o erro ocorreu."
  },
  {
    question: "A página demora muito para carregar as seções.",
    answer: "Isso pode acontecer em conexões mais lentas ou quando o navegador está com muitos recursos em uso. Tente fechar outros aplicativos e abas, usar uma conexão mais estável ou acessar em outro horário. A equipe também monitora a performance para otimizar o site sempre que possível."
  },
  {
    question: "Não aparece o botão para pagar, apenas uma mensagem de erro.",
    answer: "Isso pode ser causado por bloqueio de scripts de terceiros (como bloqueador de anúncios) ou falha ao carregar o checkout do Asaas. Desative bloqueadores de anúncios, atualize a página e teste em outro navegador. Se o erro continuar, envie o print da tela para o suporte."
  },
  {
    question: "Selecionei serviços e pacotes, mas o total estimado não aparece.",
    answer: "O total estimado é calculado com base nas quantidades selecionadas. Se estiver aparecendo zerado, verifique se todos os campos de quantidade estão preenchidos com números válidos (0 ou mais) e se não há erro de conexão. Atualize a página e tente selecionar novamente."
  },
  {
    question: "O site não está funcionando no meu navegador.",
    answer: "Tente atualizar o navegador para a versão mais recente, limpar o cache e os cookies, ou testar em outro navegador. Navegadores recomendados: Chrome, Firefox, Edge ou Safari (versões recentes). Se o problema persistir, entre em contato com o suporte."
  },
  {
    question: "As imagens não carregam no site.",
    answer: "Isso pode ser causado por bloqueador de imagens, conexão lenta ou cache do navegador. Tente desativar extensões de bloqueio, limpar o cache do navegador ou atualizar a página. Se o problema continuar, verifique sua conexão com a internet."
  },
  {
    question: "Não consigo ver os vídeos ou áudios do site.",
    answer: "Verifique se seu navegador suporta reprodução de mídia e se não há bloqueadores de conteúdo ativos. Tente atualizar o navegador, limpar o cache ou testar em outro navegador. Alguns navegadores mais antigos podem não suportar todos os formatos de mídia."
  },
  {
    question: "O formulário não envia quando clico no botão.",
    answer: "Verifique se todos os campos obrigatórios estão preenchidos corretamente. Alguns navegadores bloqueiam o envio se houver campos inválidos. Tente atualizar a página, limpar o cache ou testar em outro navegador. Se o problema persistir, entre em contato com o suporte."
  },
  {
    question: "Recebo erro 404 ao tentar acessar uma página.",
    answer: "Erro 404 significa que a página não foi encontrada. Verifique se o endereço (URL) está correto. Se você clicou em um link, pode estar quebrado ou a página pode ter sido movida. Tente acessar a página inicial e navegar pelo menu, ou entre em contato com o suporte informando qual página você estava tentando acessar."
  }
];

async function main() {
  console.log("🌱 Iniciando seed de FAQ...");

  // Limpar FAQs existentes (opcional - comente se quiser manter os existentes)
  // await prisma.fAQ.deleteMany({});

  // Criar FAQs - verificar se já existe antes de criar
  let created = 0;
  let updated = 0;

  for (const faq of faqs) {
    const existing = await prisma.fAQ.findFirst({
      where: { question: faq.question },
    });

    if (existing) {
      // Atualizar se já existe
      await prisma.fAQ.update({
        where: { id: existing.id },
        data: {
          answer: faq.answer,
          // Manter views existentes ou atualizar se necessário
        },
      });
      updated++;
    } else {
      // Criar novo
      await prisma.fAQ.create({
        data: {
          question: faq.question,
          answer: faq.answer,
          views: Math.floor(Math.random() * 100) + 1, // Simular views para ordenação
        },
      });
      created++;
    }
  }

  console.log(`✅ Seed de FAQ concluído! ${created} perguntas criadas, ${updated} atualizadas.`);
}

main()
  .catch((e) => {
    console.error("Erro ao executar seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
