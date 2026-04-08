import { z } from 'zod';

export const CategoriaSchema = z.object({
  id: z.number().int().positive().optional(),
  nome: z.string().min(1, 'O nome é obrigatório.'),
  cor_hex: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Cor inválida.").optional().or(z.literal('')),
});

export type Categoria = z.infer<typeof CategoriaSchema>;

export const TipoLancamentoSchema = z.object({
  id: z.number().int().positive().optional(),
  nome: z.string().min(1, 'O nome é obrigatório.'),
  categoria_id: z.number().int().positive('Selecione a categoria.'),
  cor_hex: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Cor inválida.").optional().or(z.literal('')),
  requer_pessoa: z.boolean(),
  requer_acao: z.boolean(),
  requer_conta: z.boolean(),
  requer_comprovante: z.boolean(),
});

export type TipoLancamento = z.infer<typeof TipoLancamentoSchema>;
