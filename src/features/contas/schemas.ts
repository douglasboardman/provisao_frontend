import { z } from 'zod';

export enum TipoConta {
  CORRENTE = 'CORRENTE',
  POUPANCA = 'POUPANCA',
  INVESTIMENTO = 'INVESTIMENTO',
  CAIXA = 'CAIXA',
}

export const ContaSchema = z.object({
  id: z.string().uuid().optional(),
  descricao: z.string().min(1, 'A descrição é obrigatória.'),
  banco: z.string().optional(),
  tipo_conta: z.nativeEnum(TipoConta, { errorMap: () => ({ message: 'Tipo inválido.' }) }),
  num_conta: z.string().optional(),
  agencia: z.string().optional(),
  saldo_inicial: z.number().min(0, 'O saldo inicial não pode ser negativo.'),
  cor_hex: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Cor inválida.").optional().or(z.literal('')),
});

export type Conta = z.infer<typeof ContaSchema>;
