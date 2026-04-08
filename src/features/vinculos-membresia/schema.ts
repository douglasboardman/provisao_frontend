import { z } from 'zod';

// ─── Enums alinhados ao schema.prisma ────────────────────────────────────────

export enum VinculoRol {
  COMUNGANTE    = 'COMUNGANTE',
  NAO_COMUNGANTE = 'NAO_COMUNGANTE',
  ROL_SEPARADO  = 'ROL_SEPARADO',
}

export enum FormaAdmissao {
  BATISMO       = 'BATISMO',
  PROFISSAO_DE_FE = 'PROFISSAO_DE_FE',
  TRANSFERENCIA = 'TRANSFERENCIA',
}

export enum ModalidadeExclusao {
  TRANSFERENCIA = 'TRANSFERENCIA',
  EXCOMUNHAO    = 'EXCOMUNHAO',
  MUDANCA_ROL   = 'MUDANCA_ROL',
}

// ─── Labels amigáveis para exibição na UI ────────────────────────────────────

export const VinculoRolLabel: Record<VinculoRol, string> = {
  [VinculoRol.COMUNGANTE]:     'Membro Comungante',
  [VinculoRol.NAO_COMUNGANTE]: 'Membro Não Comungante',
  [VinculoRol.ROL_SEPARADO]:   'Rol Separado',
};

export const FormaAdmissaoLabel: Record<FormaAdmissao, string> = {
  [FormaAdmissao.BATISMO]:         'Batismo',
  [FormaAdmissao.PROFISSAO_DE_FE]: 'Profissão de Fé',
  [FormaAdmissao.TRANSFERENCIA]:   'Transferência',
};

export const ModalidadeExclusaoLabel: Record<ModalidadeExclusao, string> = {
  [ModalidadeExclusao.TRANSFERENCIA]: 'Transferência',
  [ModalidadeExclusao.EXCOMUNHAO]:    'Excomunhão',
  [ModalidadeExclusao.MUDANCA_ROL]:   'Mudança de Rol',
};

// ─── Schema Zod ──────────────────────────────────────────────────────────────

export const VinculoMembresiaSchema = z.object({
  id: z.string().uuid().optional(),
  pessoa_id: z.string().uuid('Selecione a pessoa.'),
  rol: z.nativeEnum(VinculoRol, { errorMap: () => ({ message: 'Selecione o rol do membro.' }) }),
  data_admissao: z.string().min(10, 'Data de admissão obrigatória.'),
  forma_admissao: z.nativeEnum(FormaAdmissao, { errorMap: () => ({ message: 'Selecione a forma de admissão.' }) }),
  igreja_origem: z.string().optional(),
  data_exclusao: z.string().optional(),
  modalidade_exclusao: z.nativeEnum(ModalidadeExclusao).optional(),
  igreja_destino: z.string().optional(),
  vinculo_ativo: z.boolean().default(true),
  // Campo populado no retorno do GET — nome do model Prisma é 'pessoas' (plural)
  pessoas: z.object({ nome_completo: z.string() }).optional(),
});

export type VinculoMembresia = z.infer<typeof VinculoMembresiaSchema>;

// ─── Schema específico para encerramento de vínculo ────────────────────────────────────
// Só expõe os campos editáveis no fluxo de saída; vinculo_ativo será fixado em false.
export const VinculoEncerramentoSchema = z.object({
  data_exclusao: z.string().min(10, 'Data de exclusão obrigatória.'),
  modalidade_exclusao: z.nativeEnum(ModalidadeExclusao, {
    errorMap: () => ({ message: 'Selecione o motivo da saída.' }),
  }),
  igreja_destino: z.string().optional(),
});

export type VinculoEncerramento = z.infer<typeof VinculoEncerramentoSchema>;
