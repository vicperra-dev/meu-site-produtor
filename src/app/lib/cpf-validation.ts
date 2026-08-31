export function normalizeCpfDigits(cpf: string | null | undefined): string {
  return String(cpf || "").replace(/\D/g, "");
}

export const CPF_DUPLICATE_MESSAGE = "O CPF informado já está cadastrado.";
