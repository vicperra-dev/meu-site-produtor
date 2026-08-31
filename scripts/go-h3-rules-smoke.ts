import {
  isCouponsOnlyAgendamentoPayment,
  isSingleUnitAgendamentoPurchase,
  exigeAgendamentoHora,
  exigeAgendamentoSomenteData,
  exigeAgendamentoNoCheckout,
} from "../src/app/lib/agendamento-payment-rules";

const mix = [{ id: "mix", nome: "Mixagem", quantidade: 1 }];
const sessao = [{ id: "sessao", nome: "Sessão", quantidade: 1 }];
const multi = [
  { id: "sessao", nome: "Sessão", quantidade: 1 },
  { id: "mix", nome: "Mixagem", quantidade: 1 },
];
const cases = [
  ["mix single", mix, [] as typeof mix],
  ["sessao single", sessao, [] as typeof mix],
  ["multi", multi, [] as typeof mix],
] as const;

for (const [label, s, b] of cases) {
  console.log(label, {
    single: isSingleUnitAgendamentoPurchase(s, b),
    checkout: exigeAgendamentoNoCheckout(s, b),
    hora: exigeAgendamentoHora(s, b),
    soData: exigeAgendamentoSomenteData(s, b),
    couponsOnly: isCouponsOnlyAgendamentoPayment({}, s, b),
  });
}
