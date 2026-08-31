import { z } from "zod";
import { validateBirthDateString } from "@/app/lib/birth-date-validation";

const sexoEnum = z.enum(["masculino", "feminino", "prefiro_nao_declarar"], {
  errorMap: () => ({ message: "Selecione o sexo." }),
});

const generoEnum = z.enum(
  [
    "heterossexual",
    "homossexual",
    "bissexual",
    "transsexual",
    "nao_binario",
    "outro",
    "prefiro_nao_informar",
  ],
  { errorMap: () => ({ message: "Selecione o gênero." }) }
);

const birthDateSchema = z
  .string()
  .min(1, "Data de nascimento é obrigatória.")
  .superRefine((val, ctx) => {
    const result = validateBirthDateString(val);
    if (!result.valid) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: result.error });
    }
  });

export const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  senha: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
});

export const registroSchema = z.object({
  nomeCompleto: z.string().min(2, "Nome completo deve ter no mínimo 2 caracteres"),
  nomeArtistico: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
  nomeSocial: z.string().optional().nullable(),
  email: z.string().email("Email inválido"),
  senha: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
  telefone: z.string().min(1, "Telefone é obrigatório"),
  cpf: z.string().regex(/^\d{11}$/, "CPF deve conter 11 dígitos numéricos"),
  pais: z.string().min(1, "País é obrigatório"),
  estado: z.string().min(1, "Estado é obrigatório"),
  cidade: z.string().min(1, "Cidade é obrigatória"),
  bairro: z.string().min(1, "Bairro é obrigatório"),
  dataNascimento: birthDateSchema,
  sexo: sexoEnum,
  genero: generoEnum,
  generoOutro: z.string().optional().nullable(),
  estilosMusicais: z.string().optional().nullable(),
  nacionalidade: z.string().optional().nullable(),
});

export const agendamentoSchema = z.object({
  data: z.string(),
  hora: z.string().regex(/^\d{2}:\d{2}$/, "Hora inválida"),
  duracaoMinutos: z.number().int().min(30).max(480),
  tipo: z.string().min(1, "Tipo é obrigatório"),
  observacoes: z.string().optional(),
});

export const updateContaSchema = z.object({
  nomeArtistico: z.string().min(2).optional(),
  nomeSocial: z.string().optional(),
  email: z.string().email().optional(),
  telefone: z.string().optional(),
  sexo: sexoEnum.optional(),
  genero: generoEnum.optional(),
  generoOutro: z.string().optional(),
  senha: z.string().min(6).optional(),
  senhaAtual: z.string().optional(),
  cpf: z.string().optional(),
  cep: z.string().optional(),
  dataNascimento: birthDateSchema.optional(),
  pais: z.string().optional(),
  cidade: z.string().optional(),
  bairro: z.string().optional(),
  estado: z.string().optional(),
  estilosMusicais: z.string().optional().nullable(),
  nacionalidade: z.string().optional().nullable(),
  /** URL pública do avatar (https ou path /uploads/…). Vazio limpa a foto. */
  foto: z
    .string()
    .max(2048)
    .optional()
    .nullable()
    .refine(
      (v) =>
        v == null ||
        v === "" ||
        v.startsWith("https://") ||
        v.startsWith("/uploads/"),
      { message: "URL da foto inválida" }
    ),
});

export const checkoutSchema = z.object({
  planId: z.string().optional(),
  modo: z.enum(["mensal", "anual"]).optional(),
  tipo: z.enum(["plano", "agendamento"]).optional(),
  paymentMethod: z.enum(["cartao_credito", "cartao_debito", "pix", "boleto"]).optional(),
});

export const pagamentoInfoSchema = z.object({
  nome: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
  dataNascimento: birthDateSchema,
  cpf: z.string().regex(/^\d{11}$/, "CPF deve conter 11 dígitos"),
  pais: z.string().min(1, "País é obrigatório"),
  cidade: z.string().min(1, "Cidade é obrigatória"),
  bairro: z.string().min(1, "Bairro é obrigatório"),
  cep: z.string().regex(/^\d{8}$/, "CEP deve conter 8 dígitos"),
  aceiteTermos: z.boolean().refine((val) => val === true, {
    message: "É necessário aceitar os termos de contrato",
  }),
});

export const chatSchema = z.object({
  message: z.string().optional().nullable(),
  sessionId: z.string().optional().nullable(),
  messages: z.array(z.object({
    id: z.string().optional(),
    role: z.string(),
    content: z.string(),
  })).optional().nullable(),
}).refine(
  (data) => data.message || (data.messages && data.messages.length > 0),
  {
    message: "É necessário fornecer 'message' ou 'messages'",
  }
);

export const faqSchema = z.object({
  question: z.string().min(5, "Pergunta muito curta"),
  answer: z.string().min(10, "Resposta muito curta"),
});
