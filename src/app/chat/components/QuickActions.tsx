"use client";

type QuickActionsProps = {
  onSend: (text: string) => void;
};

export default function QuickActions({ onSend }: QuickActionsProps) {
  return (
    <div className="flex flex-wrap gap-0">
      <button
        onClick={() => onSend("Quais são os preços?")}
        className="rounded-full border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-zinc-200 hover:border-red-500 hover:bg-zinc-800 hover:text-red-300 transition-all"
      >
        Preços
      </button>

      <button
        onClick={() => onSend("Como funciona o agendamento?")}
        className="rounded-full border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-zinc-200 hover:border-red-500 hover:bg-zinc-800 hover:text-red-300 transition-all"
      >
        Agendamento
      </button>

      <button
        onClick={() => onSend("Quais planos vocês oferecem?")}
        className="rounded-full border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-zinc-200 hover:border-red-500 hover:bg-zinc-800 hover:text-red-300 transition-all"
      >
        Planos
      </button>

      <button
        onClick={() => onSend("Quais serviços vocês fazem no estúdio?")}
        className="rounded-full border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-zinc-200 hover:border-red-500 hover:bg-zinc-800 hover:text-red-300 transition-all"
      >
        Serviços
      </button>

      <button
        onClick={() => onSend("Quero falar com um atendente humano")}
        className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-all"
        style={{ textShadow: "0 2px 4px rgba(0, 0, 0, 0.8)" }}
      >
        Atendimento humano
      </button>
    </div>
  );
}
