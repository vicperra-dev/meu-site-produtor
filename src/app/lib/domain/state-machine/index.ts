/**
 * HS-03B — State Machine pública.
 */
export * from "@/app/lib/domain/state-machine/types";
export * from "@/app/lib/domain/state-machine/guards";
export * from "@/app/lib/domain/state-machine/events";
export { transition } from "@/app/lib/domain/state-machine/transition";
export { recordTransitionHistory, listTransitionHistory } from "@/app/lib/domain/state-machine/history";
export { planTransitionEffects } from "@/app/lib/domain/state-machine/effects";
