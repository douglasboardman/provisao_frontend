import { z } from 'zod';

export const AcaoSchema = z.object({
  id: z.string().optional(),
  nome: z.string().min(1, 'O nome é obrigatório'),
  descricao_detalhada: z.string().nullable().optional(),
  cor_hex: z.string().nullable().optional(),
  responsavel_pessoa_id: z.string().min(1, 'O responsável é obrigatório'),
  conta_id: z.string().min(1, 'A conta é obrigatória'),
  data_inicio: z.string().min(1, 'A data de início é obrigatória'),
  data_fim: z.string().nullable().optional(),
  orcamento_receita: z.number().nonnegative('Orçamento de receita não pode ser negativo'),
  orcamento_despesa: z.number().nonnegative('Orçamento de despesa não pode ser negativo'),
});

export type Acao = z.infer<typeof AcaoSchema>;
