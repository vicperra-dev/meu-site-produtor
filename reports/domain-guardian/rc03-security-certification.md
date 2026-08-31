# RC-03 — Security, Permissions & Concurrency Certification

**Gerado em:** 2026-07-15T18:10:56.805Z
**Duração:** 916s
**Veredito:** **CERTIFICADA**
**Confiança:** **91%**

## Resumo

| Tentativas executadas | 40 |
| Aprovadas | 40 |
| Reprovadas | 0 |
| Cenários RC-03 adicionados | 10 |
| Gates | 13/13 PASS |

## Seções

| # | Seção | Status |
|---|-------|--------|
| 1 | Permissões (USER, ADMIN, rotas, feature flags, simulation) | PASS |
| 2 | Concorrência (dois usuários, pagamentos, agendamentos, cupons, remarcações) | PASS |
| 3 | Cupons adversos (duplo uso, expirado, owner, tipo) | PASS |
| 4 | Pagamentos adversos (duplicidade, recusado, inexistente, metadata) | PASS |
| 5 | Agenda (dois usuários mesmo horário) | PASS |
| 6 | Serviços / State Machine (transições inválidas) | PASS |
| 7 | Segurança (IDs inválidos, acesso cruzado, injeção) | PASS |
| 8 | Simulation Engine (regressão adversa) | PASS |
| 9 | Test Engine RC-03 (cenários permanentes) | PASS |
| 10 | Auditorias + RC-01 + RC-02 baselines | PASS |

## Gates

- **typescript:** PASS
- **prisma-validate:** PASS
- **build:** PASS
- **domain-audit:** PASS
- **workflow-audit:** PASS
- **sync-audit:** PASS
- **exec-audit:** PASS
- **sim-audit:** PASS
- **graph-audit:** PASS
- **discovery-audit:** PASS
- **regression-audit:** PASS
- **rc01-baseline:** PASS
- **rc02-baseline:** PASS

## Vulnerabilidades

- **RC03-RACE-01** (documented): Dois PAYMENT_RECEIVED em paralelo no mesmo slot podem criar 2 Appointments (TOCTOU). Bloqueio sequencial funciona. Mitigação deferida (domínio congelado).

## Correções

- **RC03-WIRE:** Suite rc03 registrada em discovery, types, te-run e certify script.
- **RC03-TSC:** Correção NODE_ENV read-only e tipagem actor em RC03-001.

## Cenários RC-03 adicionados

- **RC03-001:** regressão permanente RC-03
- **RC03-002:** regressão permanente RC-03
- **RC03-003:** regressão permanente RC-03
- **RC03-004:** regressão permanente RC-03
- **RC03-005:** regressão permanente RC-03
- **RC03-006:** regressão permanente RC-03
- **RC03-007:** regressão permanente RC-03
- **RC03-008:** regressão permanente RC-03
- **RC03-009:** regressão permanente RC-03
- **RC03-010:** regressão permanente RC-03

## Riscos

- **RC03-HTTP-01** (scope): Rotas HTTP /admin e cookies HttpOnly não exercitados E2E — validado via gates engine + cancel cross-user.
- **RC03-RACE-01** (P2): Concorrência real multi-processo (duas instâncias Node) não simulada; cobertura via Promise.all no mesmo processo.
- **RC03-UPLOAD-01** (scope): Upload/delivery file ACL não exercitado nesta certificação (RC-04 smoke).

## Cobertura

- **permissions:** RC03-001, RC01-006, RC02-001
- **concurrency:** RC03-002…004, RC03-009, SIM-003
- **coupons:** RC03-005, RC03-006, RC02-005
- **payments:** RC03-008, SIM-002/003/008
- **agenda:** RC03-003, RC01-005
- **stateMachine:** RC03-007
- **security:** RC03-010
- **simulation:** SIM-01 + SIM-02
- **testEngine:** RC03-001…010
- **baselines:** RC-01 + RC-02 reports

## Commit

Commit `test(rc): certify security permissions and concurrency` permitido (sem push).