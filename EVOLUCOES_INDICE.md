# Índice para estudo do código

Resumo das áreas do projeto (referência para quando for estudar o código).

- **Avaliações do site:** `AVALIACAO_PROJETO.md` (1ª) e `RELATORIO_COMPLETO_SITE_2025.md` (2ª) — só classificações por categoria.
- **App / páginas:** `src/app/` — page.tsx (home), agendamento, planos, faq, chat, conta, login, registro, admin, etc.
- **API:** `src/app/api/` — auth, agendamentos, planos, pagamentos, webhooks (Asaas), chat, FAQ, payment-provider.
- **Componentes:** `src/app/components/` — Header, ProfessionalBox, SectionBox, ChatNotification, DuvidasBox.
- **Lib:** `src/app/lib/` — prisma, auth, env, asaas (checkout, subscriptions, refund), coupons, sendEmail, knowledgeBase.
- **Banco:** `prisma/schema.prisma` — User, Session, Appointment, Payment, UserPlan, Coupon, ChatSession, FAQ, etc.
