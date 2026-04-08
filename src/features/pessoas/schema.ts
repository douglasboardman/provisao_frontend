import { z } from 'zod';

export enum Sexo {
  MASCULINO = 'MASCULINO',
  FEMININO = 'FEMININO',
}

export enum EstadoCivil {
  SOLTEIRO = 'SOLTEIRO',
  CASADO = 'CASADO',
  DIVORCIADO = 'DIVORCIADO',
  VIUVO = 'VIUVO',
}

export enum EstadoOrigem {
  AC = 'AC', AL = 'AL', AP = 'AP', AM = 'AM', BA = 'BA', CE = 'CE', DF = 'DF', ES = 'ES',
  GO = 'GO', MA = 'MA', MT = 'MT', MS = 'MS', MG = 'MG', PA = 'PA', PB = 'PB', PR = 'PR',
  PE = 'PE', PI = 'PI', RJ = 'RJ', RN = 'RN', RS = 'RS', RO = 'RO', RR = 'RR', SC = 'SC',
  SP = 'SP', SE = 'SE', TO = 'TO',
}

export const PessoaSchema = z.object({
  id: z.string().uuid().optional(),
  nome_completo: z.string().min(1, 'O nome completo é obrigatório.'),
  url_foto: z.string().url('A URL da foto é inválida.').optional().or(z.literal('')),
  cpf: z.string().optional().or(z.literal('')), // Poderia usar validação customizada
  data_nascimento: z.string().min(10, 'A data de nascimento é obrigatória.'),
  sexo: z.nativeEnum(Sexo, { errorMap: () => ({ message: 'Selecione o sexo.' }) }),
  estado_civil: z.nativeEnum(EstadoCivil).optional(),
  email: z.string().email('Email inválido.').optional().or(z.literal('')),
  telefone_celular: z.string().optional(),
  cep: z.string().optional(),
  logradouro: z.string().optional(),
  numero: z.string().optional(),
  complemento: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.nativeEnum(EstadoOrigem).optional(),
  grupo_familiar_id: z.string().uuid().optional(),
  data_cad: z.string().optional(),
});

export type Pessoa = z.infer<typeof PessoaSchema>;
