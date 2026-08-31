"use client";

/**
 * Contato — GO-03F: Design System (PageHeader, Section, Card, LinkButton).
 * Conteúdo de contato mantido, apenas shell visual migrado.
 */

import DuvidasBox from "../components/DuvidasBox";
import { Section, Card, LinkButton, typography } from "@/components/design-system";

export default function ContatoPage() {
  const contactInfo = [
    {
      type: "E-mail",
      value: "thouse.rec.tremv@gmail.com",
      icon: "✉️",
      link: "mailto:thouse.rec.tremv@gmail.com",
      description: "Para dúvidas, orçamentos e agendamentos",
    },
    {
      type: "WhatsApp",
      value: "+55 (21) 99129-2544",
      icon: "📱",
      link: "https://wa.me/5521991292544",
      description: "Atendimento direto e rápido",
    },
    {
      type: "Localização",
      value: "Rio de Janeiro (RJ) — Botafogo",
      icon: "📍",
      link: null,
      description: "Estúdio físico para sessões presenciais",
    },
  ];

  const lgpdContact = {
    email: "thouse.rec.tremv@gmail.com",
    description: "Para assuntos de privacidade e proteção de dados (LGPD)",
  };

  return (
    <main className="relative mx-auto max-w-4xl px-4 sm:px-6 py-3 sm:py-5 text-zinc-100 overflow-x-hidden">
      {/* Hero Contato — mesma imagem; composição alinhada a FAQ/Shopping (sem spacer alto) */}
      <div
        className="contato-hero-bg fixed inset-0 z-0 bg-zinc-900 bg-no-repeat"
        style={{ backgroundImage: "url(/contato-bg.png.jpeg)" }}
        aria-hidden
      />
      <style>{`
        .contato-hero-bg {
          background-size: cover;
          background-position: center top;
        }
        @media (max-width: 767px) {
          .contato-hero-bg {
            background-position: center 5%;
          }
        }
        @media (min-width: 768px) and (max-width: 1023px) {
          .contato-hero-bg {
            background-position: center 2%;
          }
        }
      `}</style>
      <div className="relative z-10 space-y-8">
        {/* TÍTULO PRINCIPAL — no topo da Hero, como FAQ/Shopping */}
        <section className="text-center pt-1 sm:pt-2">
          <h1
            className={`${typography.pageTitle} text-2xl sm:text-3xl md:text-4xl mb-3 sm:mb-4`}
            style={{ textShadow: "0 2px 8px rgba(0, 0, 0, 0.8)" }}
          >
            Contato
          </h1>
          <p
            className="text-black text-xs sm:text-sm md:text-base max-w-xl sm:max-w-2xl md:max-w-3xl mx-auto leading-relaxed"
            style={{
              textShadow:
                "0 0 12px rgba(255,255,255,0.95), 0 0 4px rgba(255,255,255,0.85), 0 2px 10px rgba(0,0,0,0.75)",
            }}
          >
            Entre em contato conosco para tirar dúvidas, solicitar orçamentos, alinhar
            projetos ou tratar de assuntos relacionados aos nossos serviços.
          </p>
        </section>

        {/* BOX PRINCIPAL - INFORMAÇÕES DE CONTATO */}
        <Section className="flex justify-center px-0">
          <Card className="w-full max-w-4xl border-red-500/80 backdrop-blur-md bg-black/60">
            <h2
              className="text-xl md:text-2xl font-semibold text-center text-red-400 mb-6"
              style={{ textShadow: "0 2px 4px rgba(0, 0, 0, 0.5)" }}
            >
              Informações de Contato
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {contactInfo.map((contact, index) => (
                <Card
                  key={index}
                  interactive={!!contact.link}
                  onClick={() => contact.link && window.open(contact.link, "_blank")}
                  className="border-zinc-700 bg-zinc-900/30 text-center space-y-3"
                >
                  <div className="text-3xl">{contact.icon}</div>
                  <div>
                    <p className="text-xs text-zinc-400 mb-1">{contact.type}</p>
                    {contact.link ? (
                      <a
                        href={contact.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-white font-semibold hover:text-red-400 transition-colors block"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {contact.value}
                      </a>
                    ) : (
                      <p className="text-white font-semibold">{contact.value}</p>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400">{contact.description}</p>
                </Card>
              ))}
            </div>
          </Card>
        </Section>

        {/* BOX - HORÁRIO DE ATENDIMENTO E LGPD */}
        <Section className="flex justify-center px-0">
          <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-3">
            <Card className="border-red-500/80 backdrop-blur-md bg-black/60 text-center space-y-3">
              <h3
                className="text-lg md:text-xl font-semibold text-red-400"
                style={{ textShadow: "0 2px 4px rgba(0, 0, 0, 0.5)" }}
              >
                Horário de Atendimento
              </h3>
              <p
                className="text-sm md:text-base text-white text-justify md:text-center"
                style={{ textShadow: "0 2px 8px rgba(0, 0, 0, 0.8)" }}
              >
                O atendimento começa as 10h da manhã e vai até as 10h da noite, apenas em dias
                úteis, salvo exceções. Mensagens enviadas fora desse período serão respondidas
                assim que possível.
              </p>
            </Card>

            <Card className="border-red-500/80 backdrop-blur-md bg-black/60 text-center space-y-3">
              <h3
                className="text-lg md:text-xl font-semibold text-red-400"
                style={{ textShadow: "0 2px 4px rgba(0, 0, 0, 0.5)" }}
              >
                Privacidade e Proteção de Dados (LGPD)
              </h3>
              <div
                className="space-y-2 text-sm md:text-base text-white"
                style={{ textShadow: "0 2px 8px rgba(0, 0, 0, 0.8)" }}
              >
                <p>{lgpdContact.description}</p>
                <p>
                  <a
                    href={`mailto:${lgpdContact.email}`}
                    className="text-blue-400 underline underline-offset-2 hover:text-blue-300 transition-colors font-semibold"
                  >
                    {lgpdContact.email}
                  </a>
                </p>
                <p className="text-zinc-400 text-xs">Rio de Janeiro – RJ</p>
              </div>
            </Card>
          </div>
        </Section>

        {/* BOX - MENSAGEM FINAL */}
        <Section className="flex justify-center px-0">
          <Card className="w-full max-w-4xl border-red-500/80 backdrop-blur-md bg-black/60 space-y-4">
            <p
              className="text-sm md:text-base leading-relaxed text-white text-justify md:text-center"
              style={{ textShadow: "0 2px 8px rgba(0, 0, 0, 0.8)" }}
            >
              A THouse Rec agradece pela confiança, pela escolha e pela oportunidade de estar
              sendo considerada para qualquer tipo de serviço. Cada contato representa uma
              chance de construir algo único, com dedicação, cuidado e respeito pela música e
              pela trajetória de cada artista.
            </p>
            <p
              className="text-sm md:text-base leading-relaxed text-zinc-300 text-justify md:text-center"
              style={{ textShadow: "0 2px 8px rgba(0, 0, 0, 0.8)" }}
            >
              Será um prazer conversar, entender suas ideias e, se fizer sentido para ambos os
              lados, transformar essa troca em trabalho, som e identidade.
            </p>
            <div className="flex justify-center pt-2">
              <LinkButton href="mailto:thouse.rec.tremv@gmail.com" variant="primary" size="md">
                Enviar e-mail
              </LinkButton>
            </div>
          </Card>
        </Section>

        {/* BOX DE DÚVIDAS */}
        <DuvidasBox />
      </div>
    </main>
  );
}
