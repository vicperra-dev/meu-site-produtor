# Calendário de tarefas — 14 fev a 9 abr 2025

**Contexto:** Seg–Sex 8h–18h trabalho; finais de semana mais livres (nem sempre). Objetivos: (1) concluir discografia THouse Rec e fechar para o próximo passo (loja beats + promoções), (2) iniciar site do laboratório em paralelo, (3) faculdade e vida sem sobrecarregar.

**Legenda:**  
- **TH** = THouse Rec (discografia).  
- **LAB** = Site do laboratório.  
- **Buffer** = Reserva para faculdade, imprevistos ou descanso.  
- **~30 min** = Tarefa curta (noite entre semana).  
- **~1h** = Bloco maior (fim de semana ou noite tranquila).

---

## Semana 1 — 14 fev (sáb) a 20 fev (sex)

| Data | Dia | Tarefa | Projeto | Tempo |
|------|-----|--------|---------|-------|
| 14 fev | Sáb | Ler SYNC_LOCAL_PRODUCAO.md; decidir se faz push do payment-providers + relatório para alinhar local/produção. Rodar `npm run dev` e dar uma volta no site local. | TH | ~30 min |
| 15 fev | Dom | Criar modelo Prisma para discografia (ex.: `Track` com título, artista, linkYouTube, linkSpotify, linkSoundCloud, ordem, ativo). Criar migration. | TH | ~1h |
| 16 fev | Seg | Buffer ou: rodar migration local; conferir se tabela criou no banco. | TH / Buffer | ~30 min |
| 17 fev | Ter | API GET pública: listar músicas ativas (ordenadas). Endpoint ex.: `GET /api/discografia`. | TH | ~30 min |
| 18 fev | Qua | API admin: GET (listar todas) e POST (criar uma música). Proteger com role ADMIN. | TH | ~45 min |
| 19 fev | Qui | API admin: PATCH (editar) e DELETE ou desativar. Testar no Postman/Insomnia ou pelo navegador. | TH | ~45 min |
| 20 fev | Sex | Buffer ou: começar repositório do site do laboratório (Next.js ou stack que escolher); só criar projeto e primeiro commit. | LAB / Buffer | ~30 min |

---

## Semana 2 — 21 fev a 27 fev

| Data | Dia | Tarefa | Projeto | Tempo |
|------|-----|--------|---------|-------|
| 21 fev | Sáb | Home THouse: componente da seção Discografia (após o vídeo). Buscar da API pública; listar título e plataformas. Sem filtro ainda. | TH | ~1h |
| 22 fev | Dom | Home: adicionar filtro (YouTube / Spotify / SoundCloud / Todas). Estado local para filtro; filtrar lista no front. | TH | ~1h |
| 23 fev | Seg | Buffer. | Buffer | — |
| 24 fev | Ter | Home: menu “3 pontinhos” por música — opções “Abrir no YouTube”, “Abrir no Spotify”, “Abrir no SoundCloud” (conforme links cadastrados). | TH | ~45 min |
| 25 fev | Qua | Home: se quiser “Ouvir no site”, adicionar link ou iframe/embed (ex.: YouTube embed) na opção do menu. Opcional: deixar só links externos. | TH | ~30–45 min |
| 26 fev | Qui | Admin THouse: página “Discografia” (lista de músicas, botão adicionar). Listar via API admin. | TH | ~45 min |
| 27 fev | Sex | Admin: formulário de criar/editar música (título, links, ordem, ativo). Salvar via API. | TH | ~45 min |

---

## Semana 3 — 28 fev a 6 mar

| Data | Dia | Tarefa | Projeto | Tempo |
|------|-----|--------|---------|-------|
| 28 fev | Sáb | Testar fluxo completo discografia: criar/editar no admin, ver na home, filtrar, abrir links. Ajustes de layout/texto. | TH | ~1h |
| 1 mar | Dom | Lab: definir estrutura (páginas principais, navegação). Criar layout base e uma página inicial. | LAB | ~1h |
| 2 mar | Seg | Buffer. | Buffer | — |
| 3 mar | Ter | THouse: pequenos ajustes na discografia (ordenação, mensagem “nenhuma música” quando filtro vazio). | TH | ~30 min |
| 4 mar | Qua | Lab: segunda página ou seção (ex.: “Serviços” ou “Contato”). | LAB | ~30 min |
| 5 mar | Qui | Considerar discografia “fechada” para beta: checklist (admin CRUD, home com filtro e links). Documentar no README ou em RELATORIO se quiser. | TH | ~30 min |
| 6 mar | Sex | Buffer ou revisão geral da semana. | Buffer | — |

---

## Semana 4 — 7 mar a 13 mar

| Data | Dia | Tarefa | Projeto | Tempo |
|------|-----|--------|---------|-------|
| 7 mar | Sáb | THouse: deploy da discografia (commit + push main). Testar em produção. | TH | ~45 min |
| 8 mar | Dom | Lab: continuar conteúdo ou estilo (cores, fontes, textos). | LAB | ~1h |
| 9 mar | Seg | Buffer. | Buffer | — |
| 10 mar | Ter | Organizar próximos passos: loja (beats + promoções). Listar o que precisa (modelo Produto/Beat, página Shopping real, cupons). | TH | ~30 min |
| 11 mar | Qua | Lab: uma funcionalidade ou página nova, conforme escopo do laboratório. | LAB | ~30 min |
| 12 mar | Qui | Buffer ou estudo do código do site (ler uma rota de API ou um componente). | Buffer / Estudo | ~30 min |
| 13 mar | Sex | Buffer. | Buffer | — |

---

## Semana 5 — 14 mar a 20 mar

| Data | Dia | Tarefa | Projeto | Tempo |
|------|-----|--------|---------|-------|
| 14 mar | Sáb | THouse: começar modelo/API da loja (ex.: `Beat` ou `Product` — nome, preço, preview). Só backend. | TH | ~1h |
| 15 mar | Dom | Lab: avançar uma entrega combinada (ex.: formulário, lista, integração). | LAB | ~1h |
| 16 mar | Seg | Buffer. | Buffer | — |
| 17 mar | Ter | THouse: listagem pública de beats (API GET). | TH | ~30 min |
| 18 mar | Qua | Lab: ajustes ou nova página. | LAB | ~30 min |
| 19 mar | Qui | Buffer. | Buffer | — |
| 20 mar | Sex | Revisão: anotar pendências da loja e do lab para as próximas semanas. | TH / LAB | ~20 min |

---

## Semana 6 — 21 mar a 27 mar

| Data | Dia | Tarefa | Projeto | Tempo |
|------|-----|--------|---------|-------|
| 21 mar | Sáb | THouse: página Shopping com lista de beats (card, preço, link ou botão). Sem checkout ainda se preferir. | TH | ~1h |
| 22 mar | Dom | Lab: continuar desenvolvimento conforme prioridades do laboratório. | LAB | ~1h |
| 23 mar | Seg | Buffer. | Buffer | — |
| 24 mar | Ter | THouse: carrinho de beats ou “comprar” levando ao checkout (reaproveitar fluxo Asaas). Definir um passo por vez. | TH | ~45 min |
| 25 mar | Qua | Lab ou buffer. | LAB / Buffer | ~30 min |
| 26 mar | Qui | THouse: vincular cupons a promoções (ex.: cupom “LANCAMENTO10” na loja). Ajuste fino. | TH | ~30 min |
| 27 mar | Sex | Buffer. | Buffer | — |

---

## Semana 7 — 28 mar a 3 abr

| Data | Dia | Tarefa | Projeto | Tempo |
|------|-----|--------|---------|-------|
| 28 mar | Sáb | THouse: testar fluxo loja (beats + cupom + pagamento). Corrigir bugs. | TH | ~1h |
| 29 mar | Dom | Lab: fechar uma entrega ou demo (versão “mostrável”). | LAB | ~1h |
| 30 mar | Seg | Buffer. | Buffer | — |
| 31 mar | Ter | THouse ou Lab: o que tiver mais urgente. | TH / LAB | ~30 min |
| 1 abr | Qua | Buffer. | Buffer | — |
| 2 abr | Qui | Revisão geral: checklist discografia + loja (beats + promoções) e lab. | TH / LAB | ~30 min |
| 3 abr | Sex | Buffer. | Buffer | — |

---

## Semana 8 — 4 abr a 9 abr

| Data | Dia | Tarefa | Projeto | Tempo |
|------|-----|--------|---------|-------|
| 4 abr | Sáb | Ajustes finais no que ficou pendente (THouse ou Lab). Documentar estado atual. | TH / LAB | ~1h |
| 5 abr | Dom | Idem ou descanso. | TH / LAB / Buffer | ~1h |
| 6 abr | Seg | Buffer. | Buffer | — |
| 7 abr | Ter | Revisar calendário e planejar próxima leva (abril em diante). | — | ~20 min |
| 8 abr | Qua | Buffer. | Buffer | — |
| 9 abr | Sex | Meta: discografia fechada e em produção; loja (beats + promoções) em andamento ou concluída conforme ritmo; lab com base estável. | — | — |

---

## Resumo por objetivo

- **Discografia THouse:** Base (modelo + API + admin + home) entre **14 fev e 6 mar**; deploy e “fechamento” até **~13 mar**.  
- **Loja (beats + promoções):** Começo em **14 mar**, com loja funcional e cupons até **fim de mar / início abr**.  
- **Site do laboratório:** Início **20 fev** (projeto) ou **1 mar** (estrutura); evolução contínua aos sábados/domingos e 1–2 noites por semana.  
- **Buffer:** Várias noites e sextas reservadas para faculdade e imprevistos; use como “reposição” se um dia de TH/LAB não der.

Se um dia estiver pesado, troque por “Buffer” e deslize a tarefa para o próximo bloco livre. O importante é manter ritmo sustentável e concluir a discografia para o próximo passo ser loja e promoções.
