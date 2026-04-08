import { z } from 'zod';

export const UsuarioSchema = z.object({
  id: z.string().optional(),
  nome_usuario: z.string().min(1, 'O nome é obrigatório'),
  email_login: z.string().email('E-mail inválido'),
  senha_hash: z.string().optional(), // opcional na edição, obrigatório na criação (tratado separadamente ou pelo backend)
  perfil: z.enum(['ADMINISTRADOR', 'GESTOR', 'TESOUREIRO', 'OPERADOR', 'AUDITOR', 'SECRETARIO']),
  ativo: z.boolean().default(true),
});

export type Usuario = z.infer<typeof UsuarioSchema>;
