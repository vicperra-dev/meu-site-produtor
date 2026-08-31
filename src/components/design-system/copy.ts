/**
 * Glossário de textos — padronização de labels de ação (GO-03E).
 * Preferência: português claro, sem misturar Delete/Remover/Excluir.
 */

export const COPY = {
  actions: {
    save: "Salvar",
    saveChanges: "Salvar alterações",
    cancel: "Cancelar",
    delete: "Excluir",
    edit: "Editar",
    confirm: "Confirmar",
    accept: "Aceitar",
    reject: "Recusar",
    complete: "Concluir",
    download: "Download",
    upload: "Upload",
    retry: "Tentar novamente",
    back: "Voltar",
    backHome: "Voltar ao início",
    close: "Fechar",
    refresh: "Atualizar",
    viewDetails: "Ver detalhes",
    continue: "Continuar",
    signIn: "Entrar",
    signOut: "Sair",
    createAccount: "Criar conta",
  },
  states: {
    loading: "Carregando…",
    processing: "Processando…",
    saving: "Salvando…",
    success: "Concluído com sucesso",
    error: "Algo deu errado",
    empty: "Nada por aqui ainda",
  },
  confirm: {
    deleteTitle: "Excluir item?",
    deleteBody: "Esta ação não poderá ser desfeita.",
    cancelTitle: "Cancelar?",
    irreversible: "Esta ação é irreversível.",
  },
} as const;
