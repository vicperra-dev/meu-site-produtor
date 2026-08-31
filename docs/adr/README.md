# Architecture Decision Records (ADR)

Índice gerado pelo **Architecture Decision Agent V1**.

O registro completo e atualizado está em:

- [`reports/domain-guardian/architecture-decisions.md`](../../reports/domain-guardian/architecture-decisions.md)
- [`reports/domain-guardian/architecture-decisions.json`](../../reports/domain-guardian/architecture-decisions.json)

## Como regenerar

```bash
node --experimental-strip-types scripts/architecture-decision-agent.ts
```

## Uso por agentes

Futuros agentes podem consultar `architecture-decisions.json` para responder:

- "Por que esse código existe?"
- "Nunca remover isso porque..."
- "Essa decisão substituiu outra."
- "Essa decisão ainda é válida?"
