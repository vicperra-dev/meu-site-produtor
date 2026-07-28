# GO-H11B — Release Freeze

**Status:** FROZEN  
**Candidata Beta:** `v1.0.0-beta.1`  
**Base commit (pré-release):** `62fde1c` (`main`)  
**Escopo congelado:** GO-H10A → GO-H11A (somente)  
**Data do freeze:** 2026-07-28

## Regras do freeze

- Não aceitar novas funcionalidades.
- Não iniciar refatorações.
- Não alterar regras comerciais.
- Não alterar documentação funcional (exceto correção crítica / runbook operacional).

## Permitido

- Correções críticas descobertas no deploy
- Correções de infraestrutura
- Correções de segurança

## Fora do escopo (não entram no commit Beta)

- Scripts/relatórios experimentais GO-H1 / GO-H2*
- Qualquer mudança não ligada a H10A–H11A

## Próximo passo

Commit consolidado da candidata → backup → validação migrations → deploy → smoke/E2E → decisão Beta.
