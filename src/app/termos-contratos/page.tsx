"use client";

import { useState } from "react";
import Header from "../components/Header";

type DocKey =
  | "termos"
  | "privacidade"
  | "servicos"
  | "planos"
  | "cancelamento"
  | "imagem"
  | "direitos"
  | "conduta"
  | "backup";

const DOCS: { key: DocKey; title: string; short: string }[] = [
  {
    key: "termos",
    title: "Termos de Uso da Plataforma",
    short:
      "Regras gerais de uso do site, cadastro, login, agendamentos, pagamentos e responsabilidades.",
  },
  {
    key: "privacidade",
    title: "Política de Privacidade (LGPD)",
    short:
      "Como a THouse Rec coleta, usa, armazena e protege os seus dados pessoais.",
  },
  {
    key: "servicos",
    title: "Contrato de Prestação de Serviços de Estúdio",
    short:
      "Sessões avulsas de gravação, mixagem, masterização, beats e produção musical.",
  },
  {
    key: "planos",
    title: "Contrato dos Planos Mensais / Assinaturas",
    short:
      "Regras dos planos mensais: horas de estúdio, renovação, cancelamento e benefícios.",
  },
  {
    key: "cancelamento",
    title: "Política de Cancelamento, Remarcação e Reembolso",
    short:
      "Como funcionam cancelamentos, remarcações, faltas (no-show) e devoluções.",
  },
  {
    key: "imagem",
    title: "Autorização de Uso de Imagem, Voz e Obras Musicais",
    short:
      "Permissão para uso de trechos de áudio, vídeo e imagem em portfólio e redes sociais.",
  },
  {
    key: "direitos",
    title: "Direitos Autorais e Propriedade Intelectual",
    short:
      "Quem é dono de quê: beat, arranjo, voz, letra, mix, master, stems, sessões e templates.",
  },
  {
    key: "conduta",
    title: "Termo de Responsabilidade, Conduta e Uso do Estúdio",
    short:
      "Regras de comportamento, segurança, uso dos equipamentos e do espaço físico.",
  },
  {
    key: "backup",
    title: "Política de Segurança, Backup e Entrega de Arquivos",
    short:
      "O que é entregue, por quanto tempo guardamos arquivos e como funciona o reenvio.",
  },
];

export default function TermosContratosPage() {
  const [activeDoc, setActiveDoc] = useState<DocKey>("termos");

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl px-6 py-10 text-zinc-100">
        {/* TÍTULO GERAL */}
        <section className="mb-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold">
            Termos &amp; Contratos
          </h1>
          <p className="mt-4 text-sm md:text-base text-zinc-300">
            Nesta página você encontra todos os documentos legais que regem o
            uso da plataforma THouse Rec, as sessões de estúdio, os planos
            mensais, pagamentos, direitos autorais, uso de imagem, conduta no
            estúdio e armazenamento de arquivos. A leitura destes termos ajuda a
            garantir uma relação transparente, segura e profissional entre o
            estúdio e os artistas.
          </p>
        </section>

        {/* GRID: MENU (ESQ) + CONTEÚDO (DIR) */}
        <section className="grid gap-6 md:grid-cols-[0.9fr,1.6fr]">
          {/* COLUNA ESQUERDA: LISTA DE DOCUMENTOS */}
          <div className="space-y-4">
            {DOCS.map((doc) => {
              const isActive = activeDoc === doc.key;
              return (
                <div key={doc.key} className="space-y-1">
                  <button
                    type="button"
                    onClick={() => setActiveDoc(doc.key)}
                    className={`w-full rounded-xl border px-4 py-3 text-sm transition text-center ${
                      isActive
                        ? "border-red-500 bg-red-600/10 text-red-200"
                        : "border-zinc-700 bg-zinc-900/60 hover:border-red-500/60"
                    }`}
                  >
                    <div className="font-semibold">{doc.title}</div>
                    <div className="mt-1 text-xs text-zinc-400">
                      {doc.short}
                    </div>
                  </button>

                  {isActive && (
                    <div className="mt-2 text-center text-[11px] text-zinc-400">
                      <a
                        href={`#doc-${doc.key}`}
                        className="block underline underline-offset-2 hover:text-red-300"
                      >
                        Ir para o texto completo deste termo
                      </a>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* COLUNA DIREITA: TEXTO DO DOCUMENTO SELECIONADO */}
          <div
            id={`doc-${activeDoc}`}
            className="rounded-2xl border border-zinc-700 bg-zinc-950/70 p-5"
          >
            <h2 className="mb-3 text-lg font-semibold text-center">
              {DOCS.find((d) => d.key === activeDoc)?.title ||
                "Documento selecionado"}
            </h2>

            <div className="max-h-[480px] space-y-3 overflow-y-auto pr-2 text-sm leading-relaxed text-zinc-200">
              {/* 👉 TERMOS DE USO */}
              {activeDoc === "termos" && (
                <>
                  <p className="mt-1 text-center text-xs text-zinc-400">
                    Última atualização: Janeiro/2025
                  </p>

                  <p>
                    Bem-vindo à THouse Rec! Ao usar nosso site, agendar
                    sessões, contratar serviços ou acessar qualquer
                    funcionalidade da plataforma, você concorda com estes
                    Termos de Uso. Leia com atenção — eles existem para
                    garantir uma relação segura, transparente e profissional
                    entre o estúdio e os artistas.
                  </p>

                  <h3 className="mt-4 font-semibold">
                    1. Quem pode usar a plataforma
                  </h3>
                  <p>1.1. Para usar o site, você deve:</p>
                  <ul className="mt-1 list-disc pl-5 space-y-1">
                    <li>ter 18 anos ou mais, OU</li>
                    <li>ter autorização de um responsável maior de idade.</li>
                  </ul>
                  <p className="mt-2">
                    1.2. O usuário é responsável por todas as ações realizadas
                    em sua conta.
                  </p>
                  <p>
                    1.3. A THouse Rec pode suspender contas que violem estes
                    termos.
                  </p>

                  <h3 className="mt-4 font-semibold">
                    2. Cadastro, login e segurança da conta
                  </h3>
                  <p>
                    2.1. Você deve fornecer informações verdadeiras no
                    cadastro.
                  </p>
                  <p>2.2. Não compartilhe sua senha com terceiros.</p>
                  <p>
                    2.3. Em caso de suspeita de acesso indevido, altere sua
                    senha e comunique a THouse Rec imediatamente.
                  </p>

                  <h3 className="mt-4 font-semibold">
                    3. Funcionamento do site e limitações técnicas
                  </h3>
                  <p>
                    3.1. A THouse Rec se esforça para manter o site sempre
                    online, mas falhas, instabilidades, manutenções e
                    indisponibilidades podem ocorrer.
                  </p>
                  <p>
                    3.2. A plataforma pode ser atualizada a qualquer momento
                    sem aviso prévio.
                  </p>

                  <h3 className="mt-4 font-semibold">
                    4. Agendamentos e pagamentos pela plataforma
                  </h3>
                  <p>
                    4.1. O usuário pode agendar sessões, contratar mix, master,
                    beats e pacotes diretamente pelo site.
                  </p>
                  <p>
                    4.2. A confirmação do agendamento só ocorre após o
                    pagamento.
                  </p>
                  <p>
                    4.3. Os valores exibidos são atualizados periodicamente e
                    podem sofrer reajustes.
                  </p>
                  <p>
                    4.4. O pagamento é processado pelo Mercado Pago. A THouse Rec não armazena dados
                    de cartão.
                  </p>

                  <h3 className="mt-4 font-semibold">
                    5. Planos mensais e assinaturas
                  </h3>
                  <p>
                    5.1. Alguns serviços podem ser oferecidos como planos
                    mensais com horas de estúdio e benefícios.
                  </p>
                  <p>5.2. Cada plano possui regras próprias de:</p>
                  <ul className="mt-1 list-disc pl-5 space-y-1">
                    <li>horas incluídas;</li>
                    <li>validade;</li>
                    <li>acúmulo ou não de horas;</li>
                    <li>prioridade de agenda;</li>
                    <li>política de cancelamento.</li>
                  </ul>
                  <p className="mt-2">
                    5.3. Ao assinar um plano, o usuário aceita também as
                    regras específicas do plano escolhido.
                  </p>

                  <h3 className="mt-4 font-semibold">
                    6. Uso do estúdio, conduta e regras internas
                  </h3>
                  <p>
                    6.1. O artista deve chegar no horário agendado; atrasos
                    reduzem o tempo de sessão.
                  </p>
                  <p>6.2. É proibido:</p>
                  <ul className="mt-1 list-disc pl-5 space-y-1">
                    <li>utilizar drogas ilícitas;</li>
                    <li>danificar equipamentos;</li>
                  </ul>
                  <p className="mt-2">
                    6.3. Caso ocorram danos a equipamentos por mau uso, o
                    cliente pode ser responsabilizado.
                  </p>

                  <h3 className="mt-4 font-semibold">
                    7. Entrega de materiais (mix, master, beats e produção
                    musical)
                  </h3>
                  <p>
                    7.1. A entrega de materiais depende do serviço contratado e
                    da complexidade do projeto.
                  </p>
                  <p>
                    7.2. A versão final de mix/master é entregue conforme
                    combinado, sempre buscando o melhor resultado possível
                    dentro do escopo contratado.
                  </p>
                  <p>
                    7.3. Revisões razoáveis podem ser solicitadas; revisões
                    extras podem ter custo adicional.
                  </p>

                  <h3 className="mt-4 font-semibold">
                    8. Direitos autorais e créditos
                  </h3>

                  <p className="mt-2 font-semibold">8.1. Sobre beats</p>
                  <p>
                    Beats produzidos pelo Tremv seguem as regras informadas no
                    ato da compra. O artista pode usá-los comercialmente após o
                    pagamento. Créditos obrigatórios:{" "}
                    <strong>“Prod. Tremv (THouse Rec)”</strong>.
                  </p>

                  <p className="mt-2 font-semibold">8.2. Sobre gravações</p>
                  <p>
                    As vozes gravadas pertencem ao artista. A edição, mix,
                    master e arranjos possuem direitos autorais sobre o
                    trabalho intelectual do produtor.
                  </p>

                  <p className="mt-2 font-semibold">8.3. Sobre mix e master</p>
                  <p>
                    A THouse Rec detém os direitos do trabalho técnico, não da
                    obra musical. É obrigatório o crédito:{" "}
                    <strong>“Mix/Master: THouse Rec”</strong> em lançamentos
                    oficiais.
                  </p>

                  <p className="mt-2 font-semibold">
                    8.4. Uso de imagem, obra e portfólio
                  </p>
                  <p>Ao contratar serviços, o artista autoriza a THouse Rec a:</p>
                  <ul className="mt-1 list-disc pl-5 space-y-1">
                    <li>usar trechos de áudio, vídeo ou imagens da sessão;</li>
                    <li>
                      divulgar o projeto em portfólios, redes sociais e
                      demonstrações comerciais.
                    </li>
                  </ul>
                  <p className="mt-2">
                    Somente trechos (nunca a música completa). Se o artista não
                    quiser essa divulgação, pode solicitar ao produtor.
                  </p>

                  <h3 className="mt-4 font-semibold">
                    9. Conduta artística, letras e conteúdo
                  </h3>
                  <p>9.1. Não serão aceitos conteúdos com:</p>
                  <ul className="mt-1 list-disc pl-5 space-y-1">
                    <li>apologia ao ódio gratuito;</li>
                    <li>incitação à violência real;</li>
                    <li>crimes e discriminação;</li>
                    <li>pornografia envolvendo menores.</li>
                  </ul>
                  <p className="mt-2">
                    9.2. A THouse Rec se reserva o direito de recusar projetos
                    que violem leis brasileiras.
                  </p>

                  <h3 className="mt-4 font-semibold">
                    10. Cancelamentos, remarcações e reembolsos
                  </h3>
                  <p>
                    10.1. Remarcações devem ser feitas com antecedência mínima.
                  </p>
                  <p>
                    10.2. Cancelamentos podem gerar custos ou retenção de parte
                    do valor.
                  </p>
                  <p>
                    10.3. Planos mensais seguem regras próprias de
                    cancelamento.
                  </p>
                  <p>10.4. Atrasos reduzem o tempo de sessão.</p>

                  <h3 className="mt-4 font-semibold">
                    11. Responsabilidades da THouse Rec
                  </h3>
                  <p>11.1. O estúdio não se responsabiliza por:</p>
                  <ul className="mt-1 list-disc pl-5 space-y-1">
                    <li>rejeição da música por plataformas de streaming;</li>
                    <li>
                      violação de direitos autorais cometidos pelo artista
                      (samples, plágio etc.);
                    </li>
                    <li>
                      atrasos causados por envio tardio de arquivos pelo
                      cliente;
                    </li>
                    <li>backups de arquivos após o prazo acordado.</li>
                  </ul>
                  <p>11.2. O estúdio se responsabiliza
                    pelos direitos citados na sessão 11.1. apenas quando o usuário 
                    possui o plano Ouro e tem acesso ao acompanhamento artístico personalizado 
                    feito pelo produtor </p>
                  <h3 className="mt-4 font-semibold">
                    12. Responsabilidades do usuário
                  </h3>
                  <p>12.1. O usuário concorda em:</p>
                  <ul className="mt-1 list-disc pl-5 space-y-1">
                    <li>agir com respeito no estúdio;</li>
                    <li>fornecer materiais com direitos autorizados;</li>
                    <li>seguir orientações técnicas;</li>
                    <li>não abusar ou desrespeitar profissionais do estúdio.</li>
                  </ul>

                  <h3 className="mt-4 font-semibold">
                    13. Alterações nos termos
                  </h3>
                  <p>13.1. Os termos podem ser atualizados a qualquer momento.</p>
                  <p>
                    13.2. O usuário será informado quando alterações
                    significativas forem aplicadas.
                  </p>

                  <h3 className="mt-4 font-semibold">
                    14. Foro e legislação aplicável
                  </h3>
                  <p>
                    Este documento é regido pelas leis brasileiras. Qualquer
                    disputa será resolvida no Foro da Comarca do Rio de Janeiro
                    – RJ.
                  </p>

                  <h3 className="mt-4 font-semibold">15. Aceite dos Termos</h3>
                  <p>
                    Ao clicar em <strong>“Li e aceito os Termos de Uso”</strong>
                    , o usuário declara:
                  </p>
                  <ul className="mt-1 list-disc pl-5 space-y-1">
                    <li>ter lido e entendido o documento;</li>
                    <li>concordar com todas as regras;</li>
                    <li>estar apto legalmente a utilizar o serviço.</li>
                  </ul>
                </>
              )}

              {/* 👉 POLÍTICA DE PRIVACIDADE */}
              {activeDoc === "privacidade" && (
                <>
                  <p className="mt-1 text-center text-xs text-zinc-400">
                    Última atualização: Janeiro/2025
                  </p>
                  <p>
                    A THouse Rec respeita sua privacidade e protege seus dados
                    pessoais de acordo com a LGPD (Lei Geral de Proteção de
                    Dados – Lei 13.709/18). Esta Política explica quais dados
                    coletamos, por que coletamos, como usamos, protegemos e com
                    quem compartilhamos.
                  </p>

                  <h3 className="mt-4 font-semibold">
                    1. Quais dados coletamos
                  </h3>
                  <p>
                    1.1. Dados fornecidos por você (nome, e-mail, senha,
                    telefone se informado, informações em formulários, dados de
                    agendamento).
                  </p>
                  <p>
                    1.2. Dados coletados automaticamente (IP, navegador, sistema
                    operacional, cookies essenciais, logs de acesso).
                  </p>
                  <p>
                    1.3. Dados financeiros sensíveis (como número de cartão)
                    são processados por terceiros como Mercado Pago. A THouse
                    Rec não armazena estes dados.
                  </p>

                  <h3 className="mt-4 font-semibold">
                    2. Para que usamos esses dados
                  </h3>
                  <p>
                    Usamos seus dados para prestar serviços (agendamentos,
                    pagamentos, contato), melhorar sua experiência (histórico,
                    status de planos), garantir segurança (prevenir fraudes) e
                    comunicação (suporte, avisos importantes, melhoria do FAQ).
                  </p>

                  <h3 className="mt-4 font-semibold">
                    3. Base legal para tratamento de dados
                  </h3>
                  <p>
                    O tratamento é feito com base em execução de contrato,
                    legítimo interesse, cumprimento de obrigações legais e,
                    quando necessário, consentimento.
                  </p>

                  <h3 className="mt-4 font-semibold">
                    4. Compartilhamento de dados
                  </h3>
                  <p>Compartilhamos apenas com serviços essenciais, como:</p>
                  <ul className="mt-1 list-disc pl-5 space-y-1">
                    <li>processadores de pagamento (Mercado Pago);</li>
                    <li>hospedagem e infraestrutura (Vercel, banco de dados);</li>
                    <li>provedores de e-mail (para envio de comunicações).</li>
                  </ul>
                  <p className="mt-2">
                    Nunca vendemos seus dados e não compartilhamos para fins de
                    marketing de terceiros.
                  </p>

                  <h3 className="mt-4 font-semibold">5. Proteção dos dados</h3>
                  <p>
                    Adotamos medidas como criptografia de senhas, restrição de
                    acesso, logs de segurança e backups periódicos. Ainda
                    assim, nenhum sistema é 100% imune. Em caso de incidente
                    relevante, os usuários serão informados conforme a LGPD.
                  </p>

                  <h3 className="mt-4 font-semibold">6. Seus direitos (LGPD)</h3>
                  <p>
                    Você pode, a qualquer momento, solicitar acesso, correção,
                    exclusão, portabilidade, informação sobre uso ou revogação
                    de consentimento. Basta enviar um e-mail para:
                  </p>
                  <p className="mt-1">
                    📩 <strong>vicperra@gmail.com</strong>
                  </p>

                  <h3 className="mt-4 font-semibold">
                    7. Prazo de armazenamento
                  </h3>
                  <p>
                    Contas inativas podem ser apagadas após 24 meses. Dados
                    relacionados a contrato e obrigações legais podem ser
                    mantidos por prazo maior. Perguntas do FAQ e histórico de
                    suporte podem ser preservados para melhoria contínua.
                  </p>

                  <h3 className="mt-4 font-semibold">8. Cookies</h3>
                  <p>Utilizamos apenas cookies essenciais, para:</p>
                  <ul className="mt-1 list-disc pl-5 space-y-1">
                    <li>manter você logado;</li>
                    <li>garantir segurança básica;</li>
                    <li>manter algumas preferências simples.</li>
                  </ul>

                  <h3 className="mt-4 font-semibold">
                    9. Menores de idade
                  </h3>
                  <p>
                    Menores de idade só devem usar a plataforma com autorização
                    de um responsável. Em caso de uso irregular, a conta pode
                    ser suspensa.
                  </p>

                  <h3 className="mt-4 font-semibold">
                    10. Alterações nesta Política
                  </h3>
                  <p>
                    Podemos atualizar esta Política de Privacidade sempre que
                    necessário. Mudanças importantes serão comunicadas no site.
                  </p>

                  <h3 className="mt-4 font-semibold">
                    11. Contato para assuntos de privacidade
                  </h3>
                  <p>Para qualquer dúvida sobre seus dados pessoais, fale com a gente:</p>
                  <p className="mt-1">
                    📩 <strong>vicperra@gmail.com</strong> — Rio de Janeiro – RJ
                  </p>

                  <h3 className="mt-4 font-semibold">12. Aceite</h3>
                  <p>
                    Ao usar a plataforma, você declara que leu e aceita esta
                    Política de Privacidade, autorizando o uso de dados nos
                    termos aqui descritos.
                  </p>
                </>
              )}

              {/* 👉 CONTRATO DE PRESTAÇÃO DE SERVIÇOS */}
              {activeDoc === "servicos" && (
                <>
                  <p className="mt-1 text-center text-xs text-zinc-400">
                    Última atualização: Janeiro/2025
                  </p>
                  <p>
                    Este contrato regula a relação entre o Cliente (Artista) e
                    a THouse Rec, referente aos serviços de estúdio, gravação,
                    mixagem, masterização, beats, produção musical e serviços
                    relacionados.
                  </p>

                  <h3 className="mt-4 font-semibold">
                    1. Objeto do contrato
                  </h3>
                  <p>
                    A THouse Rec prestará serviços como gravação, edição,
                    mixagem, masterização, produção musical, beatmaking e
                    direção criativa, conforme opções contratadas pelo Cliente
                    no site ou por canais oficiais.
                  </p>

                  <h3 className="mt-4 font-semibold">
                    2. Agendamentos, horários e funcionamento
                  </h3>
                  <p>
                    O agendamento é feito pela plataforma oficial. A sessão
                    começa e termina nos horários marcados, e atrasos não
                    estendem o tempo. A ausência sem aviso pode implicar perda
                    do valor pago, conforme política de cancelamento.
                  </p>

                  <h3 className="mt-4 font-semibold">
                    3. Pagamentos e valores
                  </h3>
                  <p>
                    Os pagamentos são feitos de forma antecipada, via Mercado
                    Pago ou outro meio indicado. O serviço só é iniciado após a
                    confirmação do pagamento. Valores podem ser reajustados para
                    novas contratações.
                  </p>

                  <h3 className="mt-4 font-semibold">
                    4. Sobre gravação (captação)
                  </h3>
                  <p>
                    A THouse Rec fornece estrutura, operador de áudio e
                    ambiente adequado. O Cliente deve respeitar as normas do
                    estúdio e é responsável pelo conteúdo gravado (letras,
                    mensagens, samples).
                  </p>

                  <h3 className="mt-4 font-semibold">
                    5. Beats, instrumentais e produção musical
                  </h3>
                  <p>
                    Beats e produções criados pela THouse Rec podem ser
                    exclusivos ou não, conforme combinado. O Cliente recebe
                    licença de uso comercial após pagamento, com créditos
                    obrigatórios a Tremv / THouse Rec.
                  </p>

                  <h3 className="mt-4 font-semibold">
                    6. Mixagem e masterização
                  </h3>
                  <p>
                    A THouse Rec entregará mix e master dentro de padrões
                    profissionais, incluindo até 2 revisões leves (salvo
                    ajuste). Revisões extras podem gerar custos adicionais.
                  </p>

                  <h3 className="mt-4 font-semibold">
                    7. Entrega de materiais
                  </h3>
                  <p>
                    A entrega padrão inclui a versão final em WAV/MP3. Stems e
                    sessões completas podem ser cobrados à parte. A THouse Rec
                    não é obrigada a manter arquivos por tempo indeterminado.
                  </p>

                  <h3 className="mt-4 font-semibold">
                    8. Direitos autorais e propriedade intelectual
                  </h3>
                  <p>
                    A voz pertence ao artista; beats, arranjos, mix e master
                    pertencem ao produtor. O Cliente recebe licença de uso
                    após pagamento. Créditos obrigatórios devem ser respeitados.
                  </p>

                  <h3 className="mt-4 font-semibold">
                    9. Uso de imagem, voz e portfólio
                  </h3>
                  <p>
                    O Cliente autoriza a THouse Rec a usar trechos de áudio,
                    vídeo, imagens e bastidores para portfólio e redes sociais,
                    respeitando a imagem do artista. A autorização pode ser
                    revogada por solicitação direta.
                  </p>

                  <h3 className="mt-4 font-semibold">
                    10. Conduta dentro do estúdio
                  </h3>
                  <p>
                    São proibidos danos a equipamentos, consumo de drogas
                    ilícitas, comportamento agressivo ou desrespeitoso.
                    Situações graves podem levar ao encerramento imediato da
                    sessão, sem reembolso.
                  </p>

                  <h3 className="mt-4 font-semibold">
                    11. Cancelamentos e atrasos
                  </h3>
                  <p>
                    Cancelamentos, remarcações e faltas seguem a Política de
                    Cancelamento, Remarcação e Reembolso da THouse Rec
                    disponível em documento específico.
                  </p>

                  <h3 className="mt-4 font-semibold">
                    12. Limitação de responsabilidade
                  </h3>
                  <p>
                    A THouse Rec não se responsabiliza por problemas de
                    direitos autorais causados pelo Cliente, rejeição por
                    plataformas de streaming ou perda de arquivos fora do prazo
                    de backup acordado.
                  </p>

                  <h3 className="mt-4 font-semibold">13. Foro</h3>
                  <p>
                    Fica eleito o Foro da Comarca do Rio de Janeiro – RJ para
                    dirimir quaisquer dúvidas ou conflitos oriundos deste
                    contrato.
                  </p>
                </>
              )}

              {/* 👉 CONTRATO DE PLANOS MENSAIS */}
              {activeDoc === "planos" && (
                <>
                  <p className="mt-1 text-center text-xs text-zinc-400">
                    Última atualização: Janeiro/2025
                  </p>
                  <p>
                    Este contrato regula a assinatura de planos mensais de
                    estúdio da THouse Rec, com horas de gravação, mix, master,
                    beats e benefícios adicionais, conforme o plano escolhido.
                  </p>

                  <h3 className="mt-4 font-semibold">
                    1. Objetivo do plano
                  </h3>
                  <p>
                    Os planos oferecem horas de estúdio, prioridade de agenda e
                    benefícios específicos, descritos na página de planos no
                    momento da contratação.
                  </p>

                  <h3 className="mt-4 font-semibold">
                    2. Vigência e renovação automática
                  </h3>
                  <p>
                    A assinatura é mensal, com renovação automática na mesma
                    data da compra, até cancelamento pelo Cliente. Cobranças
                    são feitas via Mercado Pago ou meio equivalente.
                  </p>

                  <h3 className="mt-4 font-semibold">
                    3. Cancelamento da assinatura
                  </h3>
                  <p>
                    O Cliente pode cancelar a qualquer momento. O cancelamento
                    evita novas cobranças, mas não gera reembolso do mês já
                    pago. O acesso ao plano permanece até o fim do ciclo.
                  </p>

                  <h3 className="mt-4 font-semibold">
                    4. Horas mensais e uso do estúdio
                  </h3>
                  <p>
                    Cada plano inclui um número de horas mensais de estúdio e
                    serviços. Horas não utilizadas normalmente não acumulam
                    para o mês seguinte, salvo promoção específica. Horas
                    extras podem ser cobradas à parte.
                  </p>

                  <h3 className="mt-4 font-semibold">
                    5. Prioridade na agenda
                  </h3>
                  <p>
                    Planos podem ter prioridade padrão, intermediária ou
                    máxima na agenda. Isso aumenta as chances de encontrar
                    horários, mas não garante disponibilidade absoluta.
                  </p>

                  <h3 className="mt-4 font-semibold">
                    6. Beats, produções e materiais incluídos
                  </h3>
                  <p>
                    Quando o plano inclui beats, produções ou revisões, o
                    Cliente só recebe os arquivos, conforme descrito na oferta,
                    quando solicitado ao produtor.
                    Direitos autorais seguem as regras gerais da THouse Rec,
                    com créditos obrigatórios.
                  </p>

                  <h3 className="mt-4 font-semibold">
                    7. Direitos autorais e créditos
                  </h3>
                  <p>
                    O Cliente mantém direitos sobre sua interpretação vocal,
                    enquanto beats, arranjos, mix e master permanecem sob
                    direitos do produtor. Créditos obrigatórios devem ser
                    respeitados em qualquer lançamento.
                  </p>

                  <h3 className="mt-4 font-semibold">
                    8. Cancelamentos, remarcações e faltas
                  </h3>
                  <p>
                    As regras de remarcação e faltas seguem a Política de
                    Cancelamento específica da THouse Rec. Horas perdidas por
                    falta ou atraso excessivo podem ser debitadas normalmente.
                  </p>

                  <h3 className="mt-4 font-semibold">
                    9. Limitação de responsabilidade
                  </h3>
                  <p>
                    A THouse Rec não responde por rejeições de música em
                    plataformas, disputas de direitos entre artistas ou perda
                    de arquivos após o prazo de backup.
                  </p>

                  <h3 className="mt-4 font-semibold">10. Foro</h3>
                  <p>
                    Fica eleito o Foro da Comarca do Rio de Janeiro – RJ para
                    resolução de conflitos relacionados a este contrato.
                  </p>
                </>
              )}

              {/* 👉 POLÍTICA DE CANCELAMENTO */}
              {activeDoc === "cancelamento" && (
                <>
                  <p className="mt-1 text-center text-xs text-zinc-400">
                    Última atualização: Janeiro/2025
                  </p>
                  <p>
                    Esta Política organiza de forma justa os cancelamentos,
                    remarcações, faltas (no-show) e pedidos de reembolso em
                    sessões, pacotes e planos mensais da THouse Rec.
                  </p>

                  <h3 className="mt-4 font-semibold">
                    1. Cancelamento de sessões agendadas
                  </h3>
                  <p>
                    1.1. Cancelamentos com pelo menos 48 horas de antecedência
                    podem ser convertidos em crédito para uso futuro.
                  </p>
                  <p>
                    1.2. Cancelamentos com menos de 48 horas irão gerar
                    retenção de 50% do valor.
                  </p>
                  <p>
                    1.3. Cancelamentos com menos de 24 horas não
                    geram reembolso, nem crédito, sendo o horário considerado
                    como utilizado.
                  </p>

                  <h3 className="mt-4 font-semibold">
                    2. Remarcação de sessões
                  </h3>
                  <p>
                    Remarcações podem ser feitas sem custo dentro do prazo
                    mínimo definido (48 horas). Remarcações fora do prazo
                    podem ser limitadas ou tratadas como cancelamento/utilizado.
                  </p>

                  <h3 className="mt-4 font-semibold">3. Faltas (no-show)</h3>
                  <p>
                    Quando o Cliente não comparece sem avisar, a sessão é
                    considerada realizada, sem direito a reembolso ou crédito.
                  </p>

                  <h3 className="mt-4 font-semibold">
                    4. Reembolsos e créditos
                  </h3>
                  <p>
                    Serviços já realizados, total ou parcialmente, não geram
                    reembolso. Serviços ainda não iniciados podem, em alguns
                    casos, gerar reembolso ou crédito, especialmente dentro do
                    prazo legal de cancelamento (quando aplicável).
                  </p>

                  <h3 className="mt-4 font-semibold">
                    5. Planos mensais e assinaturas
                  </h3>
                  <p>
                    Mensalidades já pagas podem ser reembolsadas no caso de 
                    cancelamento dentro do prazo legal de 2 semanas, exceto 
                    quando o usuário já tenha solicitado algum serviço. 
                    O cancelamento impede futuras cobranças e o Cliente mantém acesso ao
                    plano até o fim do ciclo atual, caso já tenha solicitado algum serviço.
                  </p>

                  <h3 className="mt-4 font-semibold">
                    6. Cancelamento por parte da THouse Rec
                  </h3>
                  <p>
                    Em caso de problemas técnicos, saúde, manutenção ou força
                    maior, a THouse Rec pode remarcar ou cancelar sessões,
                    oferecendo nova data, crédito ou, em alguns casos,
                    reembolso proporcional.
                  </p>

                  <h3 className="mt-4 font-semibold">
                    7. Como solicitar
                  </h3>
                  <p>
                    Cancelamentos, remarcações e dúvidas podem ser tratados
                    pelo site, e-mail ou canais de contato oficiais da THouse
                    Rec. O estúdio se compromete a responder em prazo razoável.
                  </p>
                </>
              )}

              {/* 👉 AUTORIZAÇÃO DE USO DE IMAGEM/VOZ */}
              {activeDoc === "imagem" && (
                <>
                  <p className="mt-1 text-center text-xs text-zinc-400">
                    Última atualização: Janeiro/2025
                  </p>
                  <p>
                    Este termo autoriza a THouse Rec a usar imagem, voz e
                    trechos de obras musicais do Cliente em portfólio, redes
                    sociais e materiais de divulgação, de forma gratuita e não
                    exclusiva.
                  </p>

                  <h3 className="mt-4 font-semibold">
                    1. Finalidade da autorização
                  </h3>
                  <p>
                    O Cliente autoriza o uso de trechos de gravações, vídeos,
                    fotos de bastidores e partes da obra em:
                  </p>
                  <ul className="mt-1 list-disc pl-5 space-y-1">
                    <li>portfólio do produtor;</li>
                    <li>publicações em redes sociais;</li>
                    <li>materiais institucionais da THouse Rec.</li>
                  </ul>

                  <h3 className="mt-4 font-semibold">
                    2. Materiais que podem ser utilizados
                  </h3>
                  <p>
                    Podem ser usados: gravações de voz realizadas no estúdio,
                    trechos de beats produzidos, imagens da sessão, vídeos
                    curtos e demonstrações sonoras.
                  </p>

                  <h3 className="mt-4 font-semibold">
                    3. Prazo e revogação
                  </h3>
                  <p>
                    A autorização é por tempo indeterminado e pode ser
                    revogada pelo Cliente, mediante solicitação por e-mail. A
                    THouse Rec terá prazo de 2 dias para remover o conteúdo fixo de
                    seus canais oficiais e 12 horas para remover conteúdos temporários.
                  </p>

                  <h3 className="mt-4 font-semibold">4. Direitos do Cliente</h3>
                  <p>
                    O Cliente mantém seus direitos de imagem, voz e obra.
                    Nenhuma exclusividade é concedida à THouse Rec, apenas
                    autorização de uso para fins de divulgação.
                  </p>

                  <h3 className="mt-4 font-semibold">
                    5. Gratuidade e não exclusividade
                  </h3>
                  <p>
                    Não há pagamento por esta autorização, e o Cliente pode
                    usar sua obra livremente em outros contextos, sem
                    restrições por parte da THouse Rec.
                  </p>

                  <h3 className="mt-4 font-semibold">6. Aceite</h3>
                  <p>
                    Ao aceitar este termo no site, o Cliente declara ter lido e
                    concordado com a autorização de uso de imagem, voz e
                    trechos da obra para os fins descritos.
                  </p>
                </>
              )}

              {/* 👉 DIREITOS AUTORAIS E PROPRIEDADE INTELECTUAL */}
              {activeDoc === "direitos" && (
                <>
                  <p className="mt-1 text-center text-xs text-zinc-400">
                    Última atualização: Janeiro/2025
                  </p>
                  <p>
                    Esta política explica quem é dono de cada parte da obra
                    produzida na THouse Rec: voz, letra, beat, arranjo, mix,
                    master, stems e projetos de sessão.
                  </p>

                  <h3 className="mt-4 font-semibold">
                    1. Titularidade básica
                  </h3>
                  <p>
                    A voz e a interpretação pertencem ao artista. Letras e
                    melodias criadas pelo Cliente pertencem ao Cliente. Beats,
                    arranjos, produção musical, mixagem e masterização
                    pertencem ao produtor (THouse Rec / Tremv).
                  </p>

                  <h3 className="mt-4 font-semibold">
                    2. Licença de uso para o Cliente
                  </h3>
                  <p>
                    Após o pagamento, o Cliente recebe licença de uso da obra
                    final para lançamentos comerciais, registros e
                    monetização, respeitando os créditos obrigatórios.
                  </p>

                  <h3 className="mt-4 font-semibold">
                    3. Créditos obrigatórios
                  </h3>
                  <p>O Cliente compromete-se a creditar:</p>
                  <ul className="mt-1 list-disc pl-5 space-y-1">
                    <li>“Prod. Tremv – THouse Rec” para beats e produções;</li>
                    <li>“Mix/Master: THouse Rec” para mixagem e master;</li>
                    <li>“Gravado na THouse Rec”, quando informado.</li>
                  </ul>

                  <h3 className="mt-4 font-semibold">
                    4. Stems, multitracks e sessões de projeto
                  </h3>
                  <p>
                    Arquivos de sessão (projetos de DAW) e stems não fazem
                    parte da entrega padrão e podem ser cobrados à parte.
                    Esses arquivos não podem ser revendidos nem utilizados para
                    recriar a produção sem autorização.
                  </p>

                  <h3 className="mt-4 font-semibold">
                    5. Uso indevido de conteúdo
                  </h3>
                  <p>
                    É proibido lançar músicas antes do pagamento completo,
                    revender beats, registrar como próprios elementos
                    produzidos pela THouse Rec ou reutilizar partes da produção
                    em outras obras sem autorização.
                  </p>

                  <h3 className="mt-4 font-semibold">
                    6. Uso de samples e material de terceiros
                  </h3>
                  <p>
                    Quando o Cliente envia samples, loops ou beats externos,
                    declara ter direito de uso. A THouse Rec não se
                    responsabiliza por violações de direitos autorais causadas
                    por material fornecido pelo Cliente, exceto quando o Cliente 
                    possui o acompanhamento personalizado do plano Ouro.
                  </p>

                  <h3 className="mt-4 font-semibold">
                    7. Publicações e lançamentos
                  </h3>
                  <p>
                    O Cliente deve pagar integralmente o projeto antes de
                    lançar. Lançamentos sem pagamento podem gerar solicitação
                    de retirada da obra das plataformas e medidas adicionais.
                  </p>

                  <h3 className="mt-4 font-semibold">
                    8. Disputas e foro
                  </h3>
                  <p>
                    Em caso de conflito sobre autoria ou créditos, as partes
                    buscarão diálogo. Persistindo o problema, aplica-se o Foro
                    da Comarca do Rio de Janeiro – RJ.
                  </p>
                </>
              )}

              {/* 👉 TERMO DE CONDUTA E USO DO ESTÚDIO */}
              {activeDoc === "conduta" && (
                <>
                  <p className="mt-1 text-center text-xs text-zinc-400">
                    Última atualização: Janeiro/2025
                  </p>
                  <p>
                    Este termo define as regras de conduta, uso do espaço
                    físico e responsabilidades do Cliente dentro da THouse
                    Rec, garantindo um ambiente seguro e profissional.
                  </p>

                  <h3 className="mt-4 font-semibold">
                    1. Conduta esperada
                  </h3>
                  <p>
                    O Cliente deve tratar com respeito o produtor, equipe e
                    demais presentes, além de cuidar do espaço físico e dos
                    equipamentos.
                  </p>

                  <h3 className="mt-4 font-semibold">
                    2. Proibições dentro do estúdio
                  </h3>
                  <p>
                    É proibido consumir drogas ilícitas, manipular equipamentos sem
                    autorização, promover agressões ou comportamentos
                    desrespeitosos.
                  </p>

                  <h3 className="mt-4 font-semibold">
                    3. Responsabilidade por equipamentos
                  </h3>
                  <p>
                    Danos causados por mau uso, descuido ou negligência podem
                    ser cobrados do Cliente. Apenas o produtor está autorizado
                    a operar os equipamentos principais.
                  </p>

                  <h3 className="mt-4 font-semibold">
                    4. Acompanhantes
                  </h3>
                  <p>
                    A presença de acompanhantes deve ser combinada
                    previamente. Acompanhantes também devem respeitar todas as
                    regras deste termo.
                  </p>

                  <h3 className="mt-4 font-semibold">
                    5. Pontualidade e atrasos
                  </h3>
                  <p>
                    A sessão inicia no horário marcado. Atrasos não estendem o
                    tempo. Atrasos excessivos podem ser considerados falta
                    (no-show).
                  </p>

                  <h3 className="mt-4 font-semibold">
                    6. Encerramento por conduta inadequada
                  </h3>
                  <p>
                    Em caso de comportamento agressivo, ilegal ou que coloque
                    em risco o ambiente, a THouse Rec pode encerrar a sessão
                    imediatamente, sem reembolso.
                  </p>
                </>
              )}

              {/* 👉 POLÍTICA DE BACKUP E ENTREGA DE ARQUIVOS */}
              {activeDoc === "backup" && (
                <>
                  <p className="mt-1 text-center text-xs text-zinc-400">
                    Última atualização: Janeiro/2025
                  </p>
                  <p>
                    Esta política explica o que é entregue ao Cliente, por
                    quanto tempo os arquivos são mantidos pela THouse Rec e
                    como funcionam reenvios e backups.
                  </p>

                  <h3 className="mt-4 font-semibold">
                    1. O que é entregue
                  </h3>
                  <p>
                    Na entrega padrão de um projeto finalizado, o Cliente
                    recebe arquivos de áudio finais (WAV e MP3). Na entrega dos beats 
                    finalizados, o Cliente recebe arquivo de áudio final (WAV + MP3 + Stems).
                    Multitracks e sessões completas não estão incluídos, salvo
                    negociação específica.
                  </p>

                  <h3 className="mt-4 font-semibold">
                    2. Prazos de backup
                  </h3>
                  <p>
                    A THouse Rec pode manter backups internos por um período
                    limitado (90 dias). Após esse prazo, os
                    arquivos podem ser apagados definitivamente, sem obrigação
                    de retenção.
                  </p>

                  <h3 className="mt-4 font-semibold">
                    3. Reenvio de arquivos
                  </h3>
                  <p>
                    Dentro do prazo de backup, o reenvio da versão final pode
                    ser gratuito. Após esse prazo, a recuperação pode ser
                    possível, se houver ainda cópias disponíveis.
                  </p>

                  <h3 className="mt-4 font-semibold">
                    4. Limitações técnicas e responsabilidade
                  </h3>
                  <p>
                    Embora sejam adotadas boas práticas de armazenamento e
                    backup, falhas técnicas, defeitos de hardware, problemas
                    em serviços de nuvem ou eventos de força maior podem
                    causar perdas de dados alheias à vontade da THouse Rec.
                  </p>
                  <p>
                    O Cliente se compromete a baixar e guardar os arquivos
                    entregues assim que recebê-los.
                  </p>

                  <h3 className="mt-4 font-semibold">
                    5. Aceite desta política
                  </h3>
                  <p>
                    Ao contratar qualquer serviço, o Cliente declara estar
                    ciente de que o estúdio não mantém arquivos por tempo
                    indeterminado e que a guarda definitiva dos materiais é de
                    responsabilidade do próprio Cliente após a entrega.
                  </p>
                </>
              )}
            </div>

            {/* RODAPÉ DA CAIXA */}
            <div className="mt-4 space-y-2 text-xs text-zinc-500">
              <p className="text-center">
                Você pode salvar este termo em PDF ou imprimir diretamente pelo
                navegador.
              </p>

              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="rounded-full border border-zinc-600 px-3 py-2 text-[11px] font-semibold hover:bg-zinc-800"
                >
                  Gerar PDF deste termo
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  className="rounded-full border border-zinc-600 px-3 py-2 text-[11px] font-semibold hover:bg-zinc-800"
                >
                  Imprimir
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
