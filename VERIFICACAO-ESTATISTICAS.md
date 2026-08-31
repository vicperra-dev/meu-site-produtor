# Verificação final – Estatísticas e deploy

## 1. Associação dos dados com as funções

### API `/api/admin/stats/detalhadas`
| Bloco | Fonte no banco | Regras |
|-------|----------------|--------|
| **Usuários** | `User` | total = count(); comConta = email não vazio; semConta = total - comConta; % = comConta/total |
| **Pagamentos** | `Payment` | Apenas `status: "approved"`; total, porUsuarios (com user), valorTotal (soma amount) |
| **Planos** | `UserPlan` | total; ativos = status "active"; inativos = total - ativos |
| **Agendamentos** | `Appointment` | total = todos; ativos = `cancelledAt: null`; cancelados = `cancelledAt: not null`; hoje/estaSemana/esteMes por data com separação ativos vs cancelados |
| **Serviços** | `Service` | total; pendentes/aceitos/concluidos/cancelados por `status`; aFazer = aceitos |
| **Uso diário** | `LoginLog` | últimos 30 dias, success=true, agrupado por data (usuários únicos por dia) |

- Resposta **sem cache** (`Cache-Control: no-store`), sempre reflete o estado atual do banco.
- Itens excluídos no admin somem das contagens na próxima requisição.
- Cancelados aparecem em contagens específicas (totalCancelados, hojeCancelados, etc.).

### API `/api/admin/stats/graficos`
| Seção | Dados | Filtros |
|-------|--------|--------|
| **usuarios** | `User.createdAt` | diário (por hora), semanal (por dia), mensal (por dia), anual (por mês) |
| **pagamentos** | `Payment` com `status: "approved"` | período mensal por dia; filtro: todos / agendamento / plano:id |
| **planos** | `UserPlan` | mensal por dia; séries: assinados (createdAt) vs cancelados (endDate no período + status cancelled) |
| **agendamentos** | `Appointment` com `cancelledAt: null` | diário (por hora), semanal, mensal |
| **agendamentos-servicos** | `Appointment` com `cancelledAt: null`, agrupado por `tipo` | mesmos períodos; todas as horas/dias preenchidos (0 quando vazio) |
| **filtros-pagamentos** | Lista para dropdown | Todos, Agendamentos, + planos (planId/planName de UserPlan) |

### Página `/admin/estatisticas`
- Carrega estatísticas ao montar e a cada **45s**; ao voltar para a aba (**visibilitychange**) recarrega.
- Cards de **agendamentos** exibem ativos (número principal) e cancelados (linha em laranja); Total mostra total + “X ativos / Y cancelados”.
- **Gráficos** ocultos por padrão; botão “Ver gráfico” abre o bloco; seleção de período/filtro e “Atualizar” buscam a API de gráficos.
- **Serviços**: Total, Pendentes, Aceitos, A fazer, Concluídos, Cancelados (sem gráfico).
- Tratamento de erro com “Tentar novamente”.

## 2. Testes recomendados antes do deploy

1. **Feche o servidor de desenvolvimento** (para evitar EPERM no Prisma durante o build).
2. **Build**: `npm run build` — deve concluir sem erros.
3. **Login como admin** → **Estatísticas**:
   - Verificar se os números batem com o que você vê em Usuários, Pagamentos, Planos, Agendamentos e Serviços no admin.
   - Clicar em “Ver gráfico” em cada seção e em “Atualizar”: gráficos devem carregar (ou mensagem de erro clara).
   - Em Agendamentos, conferir se “X cancelados” aparece quando há agendamentos cancelados.
4. **Atualização**: abrir outra aba, criar/cancelar um agendamento (ou outro dado); voltar para a aba de estatísticas — em até 45s ou ao focar na aba os números devem atualizar.

## 3. Deploy

- Garantir que no ambiente de produção existam:
  - `DATABASE_URL` (PostgreSQL)
  - Variáveis de auth/session (se houver)
- Build no servidor ou CI: `npm run build` (já inclui `prisma generate`).
- Após o deploy, acessar `/admin/estatisticas` logado como admin e repetir os passos do item 2.

## 4. Status da verificação

- **Código**: interfaces e chamadas de API alinhadas (detalhadas + gráficos + página).
- **Lint**: sem erros nos arquivos de estatísticas.
- **Build**: falhou localmente com `EPERM` no `query_engine-windows.dll.node` (arquivo em uso). Rodar `npm run build` com o dev server e outros processos que usem o projeto fechados.

Quando o build passar e os testes manuais acima estiverem ok, pode seguir para o deploy.
