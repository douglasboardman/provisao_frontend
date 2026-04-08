import { z } from 'zod';

export enum TipoTransacao {
  RECEITA = 'RECEITA',
  DESPESA = 'DESPESA',
}

export const LancamentoSchema = z.object({
  id: z.string().uuid().optional(),
  data_transacao: z.string().regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}\.\d{3}Z)?$/, 'Formato de data inválido'),
  valor: z.number().positive('O valor deve ser maior que zero.'),
  tipo_transacao: z.nativeEnum(TipoTransacao),
  conta_id: z.string().uuid('Selecione uma conta válida.'),
  acao_id: z.string().uuid().optional().nullable(),
  receita_id: z.number().int().positive().optional().nullable(),
  despesa_id: z.number().int().positive().optional().nullable(),
  pessoa_id: z.string().uuid().optional().nullable(),
  observacao: z.string().max(1000).optional().nullable(),
  comprovante_url: z.string().url().max(255).optional().nullable().or(z.literal('')),
});

export type Lancamento = z.infer<typeof LancamentoSchema>;
