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
export type Liberacao = { acao: Servico; rotulo: string; estado: 'LEGADO' | 'ATRIBUICAO' | 'PAUSADO'; revisao: number; permite_pausar: boolean }
export type PreviaLiberacao = { acao: Servico; revisao: number; previa: string; contas_ativas: number;
  diferencas: { usuario_id: string; nome: string; perfil: string; rota: string; escopo?: string; antes: boolean; depois: boolean }[] }
export type ComparacaoConversao = { previa: string; perfil_anterior: string; outra_conta: boolean; conta_atuacao: boolean;
  rotas: { rota: string; acao: Servico; antes: boolean; depois: boolean }[];
  rotas_legadas?: string[];
  existentes: { acao: Servico; inicio: string; fim: string | null }[];
}
export interface AtuacaoConta {
  pessoa_id: string | null
  conta_atuacao: boolean
  competencias?: { id: string; inicio: string; fim: string | null; pode_aprovar: boolean; pode_deliberar: boolean;
    pode_consultar_restritos: boolean; pode_instalar_mesa: boolean; contexto: { nome: string } }[]
  pode_converter?: boolean
  catalogo?: { acao: Servico; rotulo: string }[]
  selecionada_id?: string | null
  servicos_propostos: { acao: Servico; permite: boolean; rotulo?: string }[]
  cargos_propostos: { contexto_id: string; contexto: string; cargo: string; origem_id: string }[]
  atribuicoes: { id: string; acao: Servico; inicio: string; fim: string | null }[]
}
export interface EventoAutorizacao {
  id: string; instante: string; operador_id: string; destinatario_id: string | null; acao: string;
  recurso_id: string | null; fundamento: string; dados: { acao?: string; legado?: boolean; proposta?: boolean }
}
export const autorizacaoApi = {
  navegacao: () => apiClient.get<{ permissoes: PermissoesNavegacao; mandatos_legados?: boolean }>('autorizacao/navegacao'),
  liberacoes: () => apiClient.get<Liberacao[]>('autorizacao/liberacoes'),
  previaLiberacao: (acao: Servico) =>
    apiClient.get<PreviaLiberacao>(`autorizacao/liberacoes/${encodeURIComponent(acao)}/previa`),
  atualizarLiberacao: (acao: Servico, dados: { estado: 'ATRIBUICAO' | 'PAUSADO'; revisao: number; fundamento: string; previa?: string }) =>
    apiClient.patch(`autorizacao/liberacoes/${encodeURIComponent(acao)}`, dados),
  previaConversao: (id: string, acoes: Servico[], competencias: string[]) =>
    apiClient.post<ComparacaoConversao>(`autorizacao/contas/${id}/conversao/previa`, { acoes, competencias }),
  converter: (id: string, acoes: Servico[], competencias: string[], previa: string, fundamento: string) =>
    apiClient.post<{ id: string; perfil: string }>(`autorizacao/contas/${id}/conversao`, { acoes, competencias, previa, fundamento }),
  historico: (cursor?: string) => apiClient.get<{ itens: EventoAutorizacao[]; proximo_cursor: string | null }>(
    'autorizacao/historico' + (cursor ? '?cursor=' + encodeURIComponent(cursor) : '')),
  me: () => apiClient.get<AtuacaoConta>('autorizacao/me'),
  conta: (id: string) => apiClient.get<AtuacaoConta>(`autorizacao/contas/${id}`),
  escolher: (pessoa_id: string, anterior_id: string | null, conta_id: string | null, fundamento: string) =>
    apiClient.post('autorizacao/conta-atuacao', { pessoa_id, anterior_id, conta_id, fundamento }),
  conceder: (id: string, acao: Servico, inicio: string, fim: string | null, fundamento: string) =>
    apiClient.post(`autorizacao/contas/${id}/atribuicoes`, { acao, inicio, fim, fundamento }),
  revogar: (id: string, fundamento: string) => apiClient.post(`autorizacao/atribuicoes/${id}/revogar`, { fundamento }),
  presidencia: (id: string, etapa: 'conferir' | 'encaminhar', fundamento: string) =>
    apiClient.post(`autorizacao/presidencias/${id}/${etapa}`, { fundamento }),
}
