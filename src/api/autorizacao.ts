import { apiClient } from './client'

export const servicos = {
  PESSOAS_CONSULTAR: 'Consultar o cadastro de pessoas',
  PESSOAS_CADASTRAR: 'Cadastrar pessoas',
  USUARIOS_CONSULTAR: 'Consultar contas de usuário',
  CARGOS_REGISTRAR: 'Registrar eleição, posse e encerramento de cargos',
  MANDATOS_REGISTRAR: 'Registrar e encerrar mandatos de oficiais',
  PRESIDENCIA_CONFERIR: 'Conferir a comprovação da presidência',
  AUDITORIA_CONSULTAR: 'Consultar auditoria',
} as const
export type Servico = string
export type PermissoesNavegacao = Record<string, ('view' | 'create' | 'edit' | 'delete')[]>
export type Liberacao = { acao: Servico; rotulo: string; estado: 'ATRIBUICAO' | 'PAUSADO'; revisao: number; permite_pausar: boolean }
export type PreviaLiberacao = { acao: Servico; revisao: number; previa: string; contas_ativas: number;
  diferencas: { usuario_id: string; nome: string; perfil: string; rota: string; escopo?: string; antes: boolean; depois: boolean }[] }
type AcaoPerfil = { acao: Servico; rotulo: string }
export type AreaPermissaoPerfil = 'pessoas-membresia' | 'financeiro' | 'institucional' | 'administracao'
export type PerfilAtuacao = { id: string; nome: string; requisito: string; requisitos?: string[]; acoes: AcaoPerfil[] }
type ContaElegivel = { id: string; nome_usuario: string; email_login: string }
export type ConcessaoPerfil = {
  id: string; usuario_id: string; nome_usuario: string; email_login: string; inicio: string; fim: string | null; vigente: boolean
}
type PreviaPerfil = { previa: string; fim: string | null; requisito?: string; itens: (AcaoPerfil & { sobreposta: boolean })[] }
export type RequisitoPerfil = { tipo: 'cargo'; id: string } | { tipo: 'oficio'; oficio: string }
export interface AtuacaoConta {
  pessoa_id: string | null
  conta_atuacao: boolean
  pode_salvar_modelo_atuacao?: boolean
  catalogo?: { acao: Servico; rotulo: string }[]
  selecionada_id?: string | null
  servicos_propostos: { acao: Servico; permite: boolean; rotulo?: string }[]
  cargos_propostos: { contexto_id: string; contexto: string; cargo: string; origem_id: string }[]
  atribuicoes: { id: string; acao: Servico; inicio: string; fim: string | null; concessao_modelo_id?: string | null }[]
}
export interface EventoAutorizacao {
  id: string; instante: string; operador_id: string; destinatario_id: string | null; acao: string;
  recurso_id: string | null; fundamento: string; dados: { acao?: string }
}
export const autorizacaoApi = {
  navegacao: () => apiClient.get<{ permissoes: PermissoesNavegacao; perfis_atuacao?: string[] }>('autorizacao/navegacao'),
  liberacoes: () => apiClient.get<Liberacao[]>('autorizacao/liberacoes'),
  previaLiberacao: (acao: Servico) =>
    apiClient.get<PreviaLiberacao>(`autorizacao/liberacoes/${encodeURIComponent(acao)}/previa`),
  atualizarLiberacao: (acao: Servico, dados: { estado: 'ATRIBUICAO' | 'PAUSADO'; revisao: number; fundamento: string; previa?: string }) =>
    apiClient.patch(`autorizacao/liberacoes/${encodeURIComponent(acao)}`, dados),
  historico: (cursor?: string) => apiClient.get<{ itens: EventoAutorizacao[]; proximo_cursor: string | null }>(
    'autorizacao/historico' + (cursor ? '?cursor=' + encodeURIComponent(cursor) : '')),
  me: () => apiClient.get<AtuacaoConta>('autorizacao/me'),
  conta: (id: string) => apiClient.get<AtuacaoConta>(`autorizacao/contas/${id}`),
  escolher: (pessoa_id: string, anterior_id: string | null, conta_id: string | null) =>
    apiClient.post('autorizacao/conta-atuacao', { pessoa_id, anterior_id, conta_id }),
  conceder: (id: string, acao: Servico, inicio: string, fim: string | null) =>
    apiClient.post(`autorizacao/contas/${id}/atribuicoes`, { acao, inicio, fim }),
  perfisAtuacao: () => apiClient.get<{ pode_criar: boolean; modelos: PerfilAtuacao[] }>('autorizacao/modelos-atuacao'),
  opcoesPerfisAtuacao: () => apiClient.get<{ cargos: { id: string; nome: string }[]; oficios: { oficio: string; nome: string }[];
    catalogo: (AcaoPerfil & { area: AreaPermissaoPerfil })[] }>('autorizacao/modelos-atuacao/opcoes'),
  salvarPerfilAtuacao: (nome: string, requisitos: RequisitoPerfil[], acoes: Servico[]) =>
    apiClient.post<{ id: string; nome: string }>('autorizacao/modelos-atuacao', { nome, requisitos, acoes }),
  concessoesPerfil: (id: string) => apiClient.get<{ contas: ContaElegivel[]; concessoes: ConcessaoPerfil[] }>(
    `autorizacao/modelos-atuacao/${id}/concessoes`),
  previaConcessaoPerfil: (id: string, usuario_id: string) =>
    apiClient.post<PreviaPerfil>(`autorizacao/modelos-atuacao/${id}/concessoes/previa`, { usuario_id }),
  concederPerfil: (id: string, usuario_id: string, previa: string) =>
    apiClient.post<{ id: string; atribuidas: number }>(`autorizacao/modelos-atuacao/${id}/concessoes`, { usuario_id, previa }),
  revogarPerfil: (id: string) => apiClient.post(`autorizacao/concessoes-modelo/${id}/revogar`, {}),
  revogar: (id: string) => apiClient.post(`autorizacao/atribuicoes/${id}/revogar`, {}),
  presidencia: (id: string, etapa: 'conferir' | 'encaminhar', fundamento: string) =>
    apiClient.post(`autorizacao/presidencias/${id}/${etapa}`, { fundamento }),
}
