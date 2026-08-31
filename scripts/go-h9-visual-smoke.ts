/**
 * GO-H9 — Smoke da paleta de status e labels de OS.
 */
import { statusVisualMeta, statusFromServiceOrderPhase } from "../src/app/lib/ui/status-palette";
import {
  operationalCategoryFromServiceType,
  serviceOrderLabel,
} from "../src/app/lib/ui/service-order-visual";

let failed = 0;
function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error("FAIL:", msg);
    failed++;
  } else console.log("PASS:", msg);
}

assert(statusVisualMeta("pendente").intent === "pending", "pendente → cinza/pending");
assert(statusVisualMeta("aceito").intent === "success", "aceito → verde");
assert(statusVisualMeta("em_andamento").intent === "warning", "em andamento → laranja");
assert(statusVisualMeta("concluido").intent === "info", "concluido → azul");
assert(statusVisualMeta("recusado").intent === "error", "recusado → vermelho");
assert(statusVisualMeta("cancelado").intent === "cancelled", "cancelado → cinza escuro");

assert(operationalCategoryFromServiceType("sessao") === "presencial", "sessao presencial");
assert(operationalCategoryFromServiceType("captacao") === "presencial", "captacao presencial");
assert(operationalCategoryFromServiceType("beat1") === "producao", "beat producao");
assert(operationalCategoryFromServiceType("mix") === "producao", "mix producao");
assert(operationalCategoryFromServiceType("master") === "producao", "master producao");
assert(operationalCategoryFromServiceType("sonoplastia") === "producao", "sono producao");

assert(serviceOrderLabel("sessao") === "Sessão", "label Sessão");
assert(serviceOrderLabel("mix") === "Mixagem", "label Mixagem");
assert(statusFromServiceOrderPhase("reserved") === "aceito", "phase reserved → aceito");
assert(statusFromServiceOrderPhase("execution") === "em_andamento", "phase execution");
assert(statusFromServiceOrderPhase("completed") === "concluido", "phase completed");

console.log(failed === 0 ? "\nGO-H9 PASS" : `\nGO-H9 FAIL (${failed})`);
process.exit(failed === 0 ? 0 : 1);
