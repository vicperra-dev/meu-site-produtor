/**
 * Helpers imperativos de feedback (GO-03F).
 * Permitem substituir diálogos nativos do browser em handlers async
 * sem depender de window.* — usam o mesmo Toast/Confirm do DS.
 *
 * Nota: useFeedback() deve ser chamado em componentes React.
 * Para módulos utilitários, prefira receber toast/confirm por parâmetro.
 */

import { useConfirm } from "./Confirm";
import { useToast } from "./Toast";
import { COPY } from "./copy";

export function useFeedback() {
  const toast = useToast();
  const confirmDialog = useConfirm();

  return {
    toast,
    /** Notificação de sucesso */
    notifySuccess: (title: string, description?: string) =>
      toast.success(title, description),
    /** Notificação de erro */
    notifyError: (title: string, description?: string) =>
      toast.error(title, description),
    /** Notificação informativa */
    notify: (title: string, description?: string) =>
      toast.info(title, description),
    /** Pedido de confirmação — retorna true se o usuário confirmar */
    ask: async (title: string, description?: string, danger = false) =>
      confirmDialog({
        title,
        description,
        danger,
        confirmLabel: danger ? COPY.actions.delete : COPY.actions.confirm,
        cancelLabel: COPY.actions.cancel,
      }),
    /** Confirmação destrutiva padronizada */
    askDelete: async (
      title: string = COPY.confirm.deleteTitle,
      description: string = COPY.confirm.deleteBody
    ) =>
      confirmDialog({
        title,
        description,
        danger: true,
        confirmLabel: COPY.actions.delete,
        cancelLabel: COPY.actions.cancel,
      }),
  };
}
