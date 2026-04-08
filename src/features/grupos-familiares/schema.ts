import { z } from 'zod';

export const GrupoFamiliarSchema = z.object({
  id: z.string().uuid().optional(),
  nome_familia: z.string().min(1, 'O nome da família é obrigatório'),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export type GrupoFamiliar = z.infer<typeof GrupoFamiliarSchema>;
export type CreateGrupoFamiliarDTO = { nome_familia: string };
export type UpdateGrupoFamiliarDTO = { nome_familia: string };
