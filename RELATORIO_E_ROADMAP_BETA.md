# THouse Rec — Relatório do site e roadmap para beta e além

**Data:** Fevereiro 2025  
**Objetivo:** Avaliar o estado atual do site, readiness para lançamento beta, e estruturar um passo a passo para melhorias e novas frentes (discografia, loja, app, eventos, estudos).

---

## Parte 1 — Relatório do site (estado atual)

### 1.1 Eficiência técnica

| Aspecto | Situação | Observação |
|--------|----------|------------|
| **Stack** | Next.js 16, React 19, Prisma, PostgreSQL, Tailwind 4 | Stack moderna e adequada para produção. |
| **Build** | `prisma generate` + `next build` | Build configurado; em produção garantir `prisma migrate deploy` no deploy. |
| **API / Backend** | Rotas server-side (API Routes), webhook Asaas estável (sempre 200), linkagem pagamento via PaymentMetadata | Fluxo de pagamento e webhook corrigidos; consultas a `Appointment` com `select` evitam erro de coluna em produção. |
| **Autenticação** | Context + sessão (cookie/DB), proteção de rotas (`requireAuth`) | Fluxo de login, registro e área logada coerente. |
| **Banco de dados** | PostgreSQL, migrations versionadas, modelo bem definido (User, Appointment, Payment, Plan, FAQ, Chat, etc.) | Falta apenas rodar a migration das colunas de cancelamento no banco de **produção** quando possível. |
| **Performance** | Lazy loading no iframe do YouTube, fontes otimizadas (Geist), pouco JS pesado na home | Razoável; espaço para otimizar imagens (next/image) e lazy load em listas no futuro. |

**Resumo:** O site está **eficiente** para um beta: stack sólida, fluxos críticos (pagamento, agendamento, planos) funcionando. Pontos de atenção: aplicar migration em produção e manter chave Asaas válida (já documentado).

---

### 1.2 Layout e identidade visual

| Aspecto | Situação | Observação |
|--------|----------|------------|
| **Identidade** | Marca THouse Rec, vermelho/dark, tipografia Geist | Consistente em todas as páginas. |
| **Home** | Hero → Bio → Vídeo → Serviços → Planos → FAQ → Contato | Estrutura clara; vídeo do YouTube já integrado. |
| **Navegação** | Header fixo (logo, links, Admin/Perfil/Minha Conta/Sair), nome do usuário no formato "Victor P." | Header ajustado para não sobrepor; três zonas (logo, links, usuário) bem definidas. |
| **Componentes** | ProfessionalBox, cards de serviço/plano, ConditionalHeader, CartButton | Reutilização boa; padrão visual unificado. |
| **Shopping** | Página presente com placeholder "Em desenvolvimento" e categorias (Beats, Roupas, Eventos, Promoções) | Estrutura pronta para evoluir para loja real. |

**Resumo:** Layout **adequado para beta**: profissional, coerente e pronto para receber a seção de discografia e, depois, a loja.

---

### 1.3 Responsividade

| Área | Situação | Observação |
|------|----------|------------|
| **Header** | Breakpoints lg/xl/2xl, grid 3 colunas no desktop, menu hamburger no mobile | Ajustes recentes evitam sobreposição; nome truncado em telas menores. |
| **Home** | Uso de `sm:`, `md:`, `lg:`, `xl:` em textos, espaçamentos e grids | Bio em 9 blocos no mobile e 3 no desktop; serviços e planos em grid responsivo. |
| **Agendamento** | Layout mobile (conversas do chat abaixo), cards de beats com preço em linha | Ajustes feitos para mobile. |
| **Contato** | Conteúdo sobe no mobile (menos “respiro” no topo) | Melhor uso da tela pequena. |
| **Chat, FAQ, Planos, Login, etc.** | Tailwind responsivo aplicado | Nada crítico reportado. |

**Resumo:** Site **responsivo**; principais pontos de quebra (header, agendamento, contato) já tratados.

---

### 1.4 Funcionamento dos fluxos principais

| Fluxo | Status | Observação |
|-------|--------|------------|
| **Cadastro / Login / Recuperar senha** | OK | Fluxo completo com email e códigos. |
| **Agendamento (sessão)** | OK | Escolha de data, serviços, beats, cupom; conflito de horário; checkout Asaas; PaymentMetadata para linkagem. |
| **Carrinho (múltiplos agendamentos)** | OK | Mesmo fluxo de pagamento e linkagem. |
| **Planos (assinatura)** | OK | Checkout Asaas, webhook, criação de plano e cupons. |
| **Pagamento (Asaas)** | OK | Depende de chave API válida (produção + local); webhook estável (sempre 200). |
| **Minha Conta** | OK | Agendamentos, planos, FAQ, reembolso/cupom. |
| **Admin** | OK | Usuários, agendamentos, pagamentos, planos, FAQ, chat, manutenção, estatísticas. |
| **Chat** | OK | Notificações e fluxo de conversa. |
| **FAQ** | OK | Público + perguntas do usuário. |
| **Termos / Contato** | OK | Páginas estáticas e formulário. |
| **Shopping** | Placeholder | Só estrutura; vendas reais vêm nas próximas etapas. |

**Resumo:** Fluxos essenciais para um **beta com amigos** estão **operando**; o que falta é evolução (discografia, loja) e melhorias incrementais, não correções de “não funciona”.

---

### 1.5 Variáveis e configurações importantes

Garantir que estejam corretas no ambiente de **produção** (ex.: Vercel):

| Variável | Uso |
|----------|-----|
| `DATABASE_URL` | Conexão PostgreSQL (produção). |
| `ASAAS_API_KEY` | Checkout e cobranças; renovar se expirar. |
| `ASAAS_WEBHOOK_ACCESS_TOKEN` | Segurança do webhook; mesmo valor configurado no painel Asaas. |
| `NEXTAUTH_SECRET` ou equivalente | Se usar sessão/criptografia (verificar no AuthContext). |
| `SUPPORT_EMAIL` / `SUPPORT_EMAIL_PASSWORD` | Envio de emails (confirmação, notificações). |
| `NEXT_PUBLIC_SITE_URL` | URLs de retorno (sucesso/falha/pendente) após pagamento. |

**Resumo:** Com essas variáveis certas e a migration aplicada em produção quando possível, o site está **bem configurado** para beta.

---

## Parte 2 — Estamos prontos para o lançamento beta?

**Sim.** O site está em condições de **lançamento beta com amigos próximos**, desde que:

1. **Produção:** `ASAAS_API_KEY` (e demais envs) estejam corretos no host e a migration do banco esteja aplicada (ou o código continue usando apenas campos já existentes).
2. **Comunicação:** Deixar claro que é beta (podem surgir pequenos ajustes e melhorias a partir do uso real).
3. **Foco do beta:** Validar cadastro, agendamento, pagamento (Asaas), planos e uso geral em dispositivos reais; anotar feedbacks para a próxima fase.

O que **não** é bloqueante para esse beta:

- Discografia na home (melhoria desejada, não pré-requisito).
- Loja de beats/roupas/eventos (já planejada para etapas seguintes).
- App ou eventos pagos (visão de médio/longo prazo).

Ou seja: podem **divulgar para amigos e testar com usuários reais**; as ideias abaixo entram como **próximos passos** organizados por etapa e carga de trabalho.

---

## Parte 3 — Suas ideias organizadas por etapa e passo a passo

Todas as ideias que você citou foram agrupadas em **fases** e **paralelos** possíveis, considerando faculdade + trabalho (evitando sobrecarregar com duas frentes pesadas ao mesmo tempo).

---

### Fase 0 — Imediato (antes ou junto do beta)

- **Garantir produção estável**
  - Migration em produção (colunas `Appointment`) quando possível.
  - Chave Asaas e webhook conferidos; documentação interna (onde está cada env).
- **Divulgação beta**
  - Divulgar para amigos próximos e acompanhar erros/feedback.

Nenhuma mudança grande de produto aqui; só estabilidade e validação.

---

### Fase 1 — Curto prazo (próximas semanas/meses)

**Objetivo:** Discografia na home + gestão de músicas pelo admin, sem impactar o resto do site.

#### 1.1 Discografia na Home (depois do vídeo)

- **Onde:** Home, nova seção após o bloco do vídeo do YouTube.
- **O que:**
  - Lista de músicas do Victor (título, plataforma(s), links).
  - Filtro por plataforma: **YouTube**, **Spotify**, **SoundCloud** (e “Todas”).
  - Por música:
    - **Três pontinhos (menu):**
      - Ouvir no site (player embutido ou link para áudio, se houver arquivo).
      - Abrir no YouTube / Spotify / SoundCloud (conforme cadastrado).
    - Não é obrigatório ter arquivo de áudio no site; pode ser só links para as plataformas.
- **Dados:** Tabela no banco (ex.: `Track` ou `Discografia`) com: título, artista, tipo (single/EP/álbum), links (YouTube, Spotify, SoundCloud), opcional: URL de áudio próprio, ordem de exibição, ativo/inativo.
- **Admin:** Tela para **adicionar / editar / desativar** músicas (CRUD). Assim você não precisa mexer no código a cada lançamento.

**Ordem sugerida:** (1) Modelo no Prisma + migration → (2) API (listar públicas, admin CRUD) → (3) Seção na home com filtro e menu de ações → (4) Admin “Discografia”.

**Carga:** Média; pode ser feita em 1–2 semanas dependendo do tempo disponível.

---

### Fase 2 — Médio prazo (próximos meses)

Aqui entram **duas frentes** que podem ser feitas em **paralelo**, mas **não as duas no mesmo “sprint”** se a carga estiver pesada (faculdade + trabalho).

#### Opção A — Começar o app do site

- **O que:** App (React Native, Expo ou PWA instalável) que consome a mesma API do site (login, agendamento, planos, etc.).
- **Vantagem:** Reaproveita 100% do backend; foco em telas mobile e experiência nativa ou PWA.
- **Carga:** Alta (novo projeto, deploy, lojas de app se for nativo).
- **Sugestão:** Fazer em paralelo com **estudos** (ver abaixo); não iniciar no mesmo mês que a loja.

#### Opção B — Loja: beats originais + promoções com cupons

- **O que:**
  - Página **Shopping** real: listagem de beats do Victor (nome, preview, preço).
  - Carrinho de beats (ou integrado ao fluxo atual se fizer sentido).
  - Checkout Asaas (igual agendamento/planos); vincular cupons às promoções já pensadas.
- **Dados:** Modelo `Product` (ou `Beat`) com nome, descrição, preço, arquivo de preview, link de compra/entrega; uso dos cupons existentes para campanhas.
- **Carga:** Média-alta (catálogo, carrinho, checkout, cupons).
- **Sugestão:** Fazer **depois** da discografia estável; pode ser a “grande” frente do trimestre.

**Recomendação:** Escolher **uma** grande frente por vez (App **ou** Loja), e alternar com melhorias menores e estudos.

---

### Fase 3 — Mais à frente (empresa + roupas)

- **Contexto:** Abertura de empresa (CNPJ), compra de roupas personalizadas/customizáveis.
- **No site:**
  - Seção/catálogo de **roupas** (fotos, descrição, tamanhos, preço).
  - Seleção e pagamento pelo site (Asaas ou outro gateway), integrado ao fluxo atual.
- **Requisitos:** CNPJ, logística, estoque ou encomenda; site já terá experiência de “loja” com beats (Fase 2).
- **Ordem:** Só depois da loja de beats e da operação da empresa definida.

---

### Fase 4 — Longo prazo (eventos e shows)

- **Contexto:** Eventos/shows com patrocínio da empresa, quando houver caixa.
- **No site:**
  - Páginas de **eventos** (data, local, descrição).
  - Inscrição e **pagamento** (ingressos ou lista) pelo próprio site.
- **Requisitos:** Modelo de dados (Evento, Ingresso, etc.), integração com pagamento; pode reutilizar cupons para early bird ou promoções.
- **Ordem:** Depois de loja e roupas estáveis; é a camada mais “nova” do negócio.

---

### Paralelo contínuo — Estudos (programação do site)

- **Objetivo:** Entender o que foi criado e como cada parte funciona (Next.js, React, Prisma, APIs, Asaas, etc.).
- **Sugestão:**
  - **Curto prazo:** Documentar por cima a estrutura (pastas, fluxos de agendamento e pagamento, webhook). Você pode ir anotando enquanto implementa a discografia.
  - **Médio prazo:** Cursos/tutoriais de Next.js e React (rotas, componentes, “use client” vs server); depois Prisma e APIs.
  - **Prática:** Pequenas tarefas no próprio site (textos, novos campos no admin, pequenos ajustes de layout) para fixar.
- **Pode ser feito ao mesmo tempo que:** Discografia, ou que o início do app, ou que a loja — desde que em ritmo leve para não sobrecarregar.

---

## Parte 4 — Passo a passo sugerido (resumo)

1. **Agora**
   - Divulgar beta para amigos; monitorar erros e feedback.
   - Aplicar migration em produção quando possível; manter envs (Asaas, etc.) corretos.

2. **Curto prazo (1–2 meses)**
   - Implementar **discografia na home** + **admin para músicas** (CRUD, filtros YouTube/Spotify/SoundCloud, links e opção “ouvir no site” se quiser).
   - Em paralelo: **estudar** a base do projeto (estrutura, fluxos principais).

3. **Médio prazo (3–6 meses)**
   - Escolher **uma** grande frente por vez:
     - **Opção A:** App (PWA ou nativo) + continuar estudos.
     - **Opção B:** Loja (beats + promoções com cupons).
   - Não fazer app e loja ao mesmo tempo em ritmo forte; alternar ou fazer uma por trimestre.

4. **Depois**
   - Empresa (CNPJ) + **loja de roupas** no site (catálogo, seleção, pagamento).
   - Por último: **eventos/shows** (datas, inscrição, pagamento pelo site).

5. **Sempre que possível**
   - Manter **estudos** em ritmo sustentável (documentação, cursos, pequenas alterações no código).

---

## Conclusão

- **Site hoje:** Eficiente, layout e responsividade adequados, fluxos principais funcionando; **pronto para beta com amigos**.
- **Próximo passo imediato:** Discografia na home + admin de músicas; em paralelo, estudos e estabilidade da produção.
- **Demais ideias:** Foram organizadas em fases (loja de beats → app ou o contrário → roupas → eventos) e em paralelo contínuo (estudos), de forma a não sobrecarregar com faculdade e trabalho.

Se quiser, na próxima etapa podemos detalhar só a **discografia** (modelo de dados, endpoints e wireframe da seção na home e do admin) para você já começar a implementar ou passar para alguém que vá codar.
