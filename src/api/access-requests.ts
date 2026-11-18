import { apiClient } from './client'
export interface AccessRequest { id: string; nome_usuario: string; email_login: string; created_at: string; estado: string; situacao_acesso: string | null }
export const accessRequestsApi = {
  list: (page = 1) => apiClient.get<AccessRequest[]>(`solicitacoes-acesso?pagina=${page}`),
  approve: (id: string) => apiClient.patch<{ message: string }>(`solicitacoes-acesso/${id}/aprovar`),
  reject: (id: string) => apiClient.patch<{ message: string }>(`solicitacoes-acesso/${id}/rejeitar`),
}
export interface AccessAuthority { id: string; usuario_id: string; pessoa_id: string; referencia: string; usuario: { nome_usuario: string; ativo: boolean; perfil: string; pessoa_id: string | null } }
export const accessAuthoritiesApi = {
  list: () => apiClient.get<AccessAuthority[]>('solicitacoes-acesso/competencias'),
  grant: (usuario_id: string, referencia: string) => apiClient.post<{ id: string }>('solicitacoes-acesso/competencias', { usuario_id, referencia }),
  revoke: (id: string) => apiClient.patch<{ message: string }>(`solicitacoes-acesso/competencias/${id}/revogar`),
}
