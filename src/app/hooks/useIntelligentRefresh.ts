import { useEffect, useRef } from 'react';

/**
 * Hook para atualização inteligente que:
 * - Atualiza a cada 5 minutos normalmente
 * - Garante atualização no início de cada hora (para marcar horários passados)
 * - Reduz carga no servidor mantendo funcionalidade
 */
export function useIntelligentRefresh(
  refreshFn: () => void | Promise<void>,
  dependencies: any[] = []
) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Executar imediatamente
    refreshFn();

    // Função para calcular próximo intervalo inteligente
    function calcularProximoIntervalo(): number {
      const agora = new Date();
      const minutosAtuais = agora.getMinutes();
      const segundosAtuais = agora.getSeconds();

      // Se estamos no início de uma hora (0-2 minutos), atualizar em 1 minuto
      // Isso garante que horários passados sejam marcados rapidamente quando uma nova hora começa
      if (minutosAtuais < 2) {
        return (2 - minutosAtuais) * 60000 - segundosAtuais * 1000;
      }

      // Caso contrário, atualizar no próximo múltiplo de 5 minutos
      // Isso reduz atualizações de 3 segundos para ~5 minutos
      const proximoMultiplo5 = Math.ceil((minutosAtuais + 1) / 5) * 5;
      const minutosRestantes = proximoMultiplo5 - minutosAtuais;
      return minutosRestantes * 60000 - segundosAtuais * 1000;
    }

    // Função recursiva para atualização inteligente
    function agendarProximaAtualizacao() {
      const intervalo = calcularProximoIntervalo();
      
      timeoutRef.current = setTimeout(() => {
        refreshFn();
        agendarProximaAtualizacao(); // Agendar próxima atualização
      }, intervalo);
    }

    // Iniciar ciclo de atualização inteligente
    agendarProximaAtualizacao();

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, dependencies);
}
