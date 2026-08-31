/**
 * Smoke mínimo HS-03B — guards + transition() API shapes (sem mudar UI).
 */
import {
  isTransitionAllowed,
  assertTransitionAllowed,
  ALLOWED_TRANSITIONS,
} from "../src/app/lib/domain/state-machine/guards";

function must(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

must(isTransitionAllowed("appointment", "pendente", "aceito"), "apt pendente→aceito");
must(!isTransitionAllowed("appointment", "concluido", "pendente"), "block concluido→pendente");
must(!isTransitionAllowed("appointment", "recusado", "em_andamento"), "block recusado→em_andamento");
must(!isTransitionAllowed("payment", "reembolsado", "confirmado"), "block refund→confirm");
must(!isTransitionAllowed("coupon", "utilizado", "criado"), "block used→created");
must(isTransitionAllowed("service", "aceito", "em_andamento"), "svc aceito→em_andamento");
must(isTransitionAllowed("service", "em_andamento", "concluido"), "svc andamento→concluido");
must(isTransitionAllowed("payment", "pendente", "confirmado"), "pay pendente→confirmado");
must(isTransitionAllowed("coupon", "criado", "utilizado"), "coupon criado→utilizado");

let threw = false;
try {
  assertTransitionAllowed("payment", "refunded", "approved");
} catch {
  threw = true;
}
must(threw, "assert Transition throws on refund→confirm");

must(
  Object.keys(ALLOWED_TRANSITIONS).sort().join(",") ===
    "appointment,coupon,payment,service",
  "entities graph"
);

console.log("[workflow-smoke] PASS");
