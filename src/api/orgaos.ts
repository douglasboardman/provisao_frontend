import { apiClient } from './client'
import type { BloqueioOrgao } from './oficiais'

export type TipoOrgao = 'CONSELHO' | 'JUNTA' | 'UNIDADE_MINISTERIAL'
export interface OrgaoResumo { id: string; tipo: TipoOrgao; constituicao: 'OFICIAL' | 'ELEICAO' | 'DESIGNACAO'; nome: string; sigla: string | null; ativo: boolean }
type Pessoa = { id: string; nome_completo: string }
type SituacaoMembresia = 'ELEGIVEL' | 'NAO_ELEGIVEL' | 'INDETERMINADA' | null
export interface DetalheOrgao {
  orgao: OrgaoResumo & { finalidade: string; data_criacao: string }
  data_referencia: string
  vigente_na_data: boolean
  composicao: { membros: { pessoa_id: string; nome: string; oficios: string[]; revisao_pendente: boolean }[]; indeterminados: { pessoa_id: string; nome: string }[] } | null
  cargos_configurados: { id: string; nome: string; codigo: string; permite_acumulacao: boolean }[]
  cargos_limitados: boolean
  politicas: { id: string; versao: string; fonte: string; inicio: string; fim: string; prazo_maximo_meses: number }[]
  politicas_limitadas: boolean
  ultima_ordem_designacao: number | null
  ordem_designacao_indeterminada: boolean
  ocupacoes: { id: string; inicio: string; inicio_ordem: number; fim: string | null; fim_ordem: number | null; termino_previsto: string | null; pessoa: Pessoa; cargo: { nome: string }; situacao_membresia: SituacaoMembresia }[]
  ocupacoes_limitadas: boolean
  proximo_cursor_ocupacao: string | null
  participacoes: { id: string; inicio: string; inicio_ordem?: number; fim: string | null; fim_ordem?: number | null; pessoa: Pessoa; situacao_membresia: SituacaoMembresia }[]
  participacoes_limitadas: boolean
  proximo_cursor_participacao: string | null
}

export const orgaosApi = {
  ato: (orgao: string, ato: string) => apiClient.get<{ id: string; autoridade: string | null; evidencia: string | null; detalhes: Record<string, unknown>; retrato: { orgao?: { nome: string }; operador?: { nome: string }; pessoas?: { id: string; nome: string }[] } | null }>(`orgaos/${encodeURIComponent(orgao)}/atos/${encodeURIComponent(ato)}`),
  relogio: () => apiClient.get<{ data_utc: string; data_operacional: string | null; fuso_iana: string | null; data_no_fuso: string | null }>('orgaos/relogio'),
  listar: (cursor?: string) => apiClient.get<{ itens: OrgaoResumo[]; proximo_cursor: string | null }>(`orgaos${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`),
  detalhe: (id: string, data: string, cursores?: { ocupacao?: string; participacao?: string }) => {
    const params = new URLSearchParams({ data })
    if (cursores?.ocupacao) params.set('cursor_ocupacao', cursores.ocupacao)
    if (cursores?.participacao) params.set('cursor_participacao', cursores.participacao)
    return apiClient.get<DetalheOrgao>(`orgaos/${encodeURIComponent(id)}?${params}`)
  },
  atos: (id: string, cursor?: string) => apiClient.get<Pagina<{ id: string; tipo: string; data_efeito: string; criado_em: string; operador: { nome_usuario: string } }>>(`orgaos/${encodeURIComponent(id)}/atos${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`),
}

export type InstituicaoOficial = { tipo: 'CONSELHO' | 'JUNTA'; nome: string; sigla?: string; finalidade: string; data_criacao: string; idempotencia: string }
export type InstituicaoUnidade = { nome: string; sigla?: string; finalidade: string; constituicao: 'ELEICAO' | 'DESIGNACAO'; data_criacao: string; evidencia: string; idempotencia: string }
export type CompetenciaUnidades = { usuario_id: string; inicio: string; fim?: string; autoridade: string; evidencia: string; idempotencia: string }
export type Pagina<T> = { itens: T[]; proximo_cursor: string | null }
export type CompetenciaResumo = { id: string; inicio: string; fim: string | null; pessoa_id: string; pessoa: { nome_completo: string }; usuario: { nome_usuario: string; ativo: boolean; perfil: string; pessoa_id: string | null } }
export type PresidenciaResumo = { id: string; inicio: string; fim: string | null; oficial: { id: string; pessoa: { nome_completo: string } } }
export type DocenteResumo = { id: string; pessoa: { nome_completo: string } }
export type AtoEleicao = { pessoa_id: string; data_eleicao: string; data_posse: string; termino_previsto: string; autoridade: string; evidencia: string; idempotencia: string }
export type AtoEncerramento = { data_efeito: string; motivo: string; autoridade: string; evidencia: string; idempotencia: string }
export type RegraCargo = { permite_acumulacao: boolean; fonte: string; versao: string; autoridade: string; evidencia: string; idempotencia: string }
export type PoliticaUnidade = { versao: string; fonte: string; autoridade: string; evidencia: string; inicio: string; fim: string; prazo_maximo_meses: number; idempotencia: string }
export type PreviaImpactos = { data_inicial: string; participacoes: { id: string; inicio: string; inicio_ordem?: number; fim: string | null; fim_ordem?: number | null; orgao: { nome: string } }[]; participacoes_limitadas: boolean; proximo_cursor_participacao: string | null; ocupacoes: { id: string; inicio: string; fim: string | null; cargo: { nome: string; orgao: { nome: string } } }[]; ocupacoes_limitadas: boolean; proximo_cursor_ocupacao: string | null }

export const gestaoOrgaosApi = {
  manter: (orgao: string, dados: { nome: string; sigla: string | null; finalidade: string; autoridade: string; evidencia: string; idempotencia: string }) => apiClient.patch<{ ato_id: string; orgao_id: string }>(`orgaos/gestao/${encodeURIComponent(orgao)}/cadastro`, dados),
  conducao: (orgao: string, dados: { pessoa_id: string; referencia: string; data_reuniao: string; motivo: string; modalidade: 'MEMBRO_CONSELHO' | 'CONVIDADO'; fundamento: string; limites_pauta: string; ratificacao_pendente: boolean; autoridade: string; evidencia: string; idempotencia: string }) => apiClient.post<{ ato_id: string; orgao_id: string }>(`orgaos/gestao/${encodeURIComponent(orgao)}/conducoes-reuniao`, dados),
  conferirDecisoesOrgao: (pessoa: string, dados: { operacao: 'DATA' | 'CONTEUDO' | 'ORDEM' | 'INSERCAO'; oficial_id?: string; proposta: object; hash_previa: string; decisoes: string[]; pagina?: number; hash_conferencia?: string }) => apiClient.post<{ pagina: number; proxima_pagina: number | null; hash_conferencia: string; totais: { total: number; preservar: number; revisar: number; indeterminado: number; sem_encaminhamento: number; divergentes: number }; resultados: { favoravel: number; desfavoravel: number; nao_informado: number }; divergencias: { id: string; tipo: string; orgao: string; inicio: string; encaminhamentos: string[] }[]; divergencias_limitadas: boolean }>(`orgaos/gestao/pessoas/${encodeURIComponent(pessoa)}/conferencia-decisoes-orgaos`, dados),
  previaVinculosOrgao: (pessoa: string, dados: { operacao: 'DATA' | 'CONTEUDO' | 'ORDEM' | 'INSERCAO'; oficial_id?: string; proposta: object; hash_previa: string; pagina: number; hash_detalhes?: string }) => apiClient.post<{ hash_detalhes: string; itens: NonNullable<BloqueioOrgao['detalhes']>; pagina: number; proxima_pagina: number | null; total: number }>(`orgaos/gestao/pessoas/${encodeURIComponent(pessoa)}/previa-vinculos-orgaos`, dados),
  decisoesOrgao: (pessoa: string, cursor?: string) => {
    const params = new URLSearchParams()
    if (cursor) params.set('cursor', cursor)
    const sufixo = params.toString()
    return apiClient.get<Pagina<{ id: string; operacao: string; resultado: 'FAVORAVEL' | 'DESFAVORAVEL' | null; anotacoes_vinculos: { tipo: 'PARTICIPACAO' | 'OCUPACAO'; id: string; observacao: string; encaminhamento?: 'PRESERVAR' | 'REVISAR' | 'INDETERMINADO' }[] | null; hash_previa: string; proposta: Record<string, unknown>; impacto: { bloqueio_orgao?: BloqueioOrgao; resumo_encaminhamentos?: { total: number; preservar: number; revisar: number; indeterminado: number; sem_encaminhamento: number }; vinculos_anotados?: NonNullable<BloqueioOrgao['detalhes']> }; autoridade: string; evidencia: string; justificativa: string; criado_em: string; criado_por: { nome_usuario: string } }>>(`orgaos/gestao/pessoas/${encodeURIComponent(pessoa)}/decisoes-orgaos${sufixo ? `?${sufixo}` : ''}`)
  },
  registrarDecisaoOrgao: (pessoa: string, dados: { operacao: 'DATA' | 'CONTEUDO' | 'ORDEM' | 'INSERCAO'; resultado: 'FAVORAVEL' | 'DESFAVORAVEL'; hash_detalhes?: string; anotacoes_vinculos?: { tipo: 'PARTICIPACAO' | 'OCUPACAO'; id: string; observacao: string; encaminhamento?: 'PRESERVAR' | 'REVISAR' | 'INDETERMINADO' }[]; oficial_id?: string; proposta: object; hash_previa: string; autoridade: string; evidencia: string; justificativa: string; idempotencia: string; ciente: true }) => apiClient.post<{ id: string }>(`orgaos/gestao/pessoas/${encodeURIComponent(pessoa)}/decisoes-orgaos`, dados),
  fuso: () => apiClient.get<{ configuracao: { fuso_iana: string; atualizado_em: string } | null; em_uso_pelos_orgaos: true }>('orgaos/gestao/fuso'),
  registrarFuso: (dados: { fuso_iana: string; autoridade: string; evidencia: string; idempotencia: string }) => apiClient.patch<{ id: string; fuso_iana: string }>('orgaos/gestao/fuso', dados),
  eventosBaseMembresia: (pessoa: string, cursor?: string) => {
    const params = new URLSearchParams({ pessoa })
    if (cursor) params.set('cursor', cursor)
    return apiClient.get<{ itens: { id: string; data_evento: string }[]; limitados: boolean; proximo_cursor: string | null }>(`orgaos/gestao/eventos-base-membresia?${params}`)
  },
  impactosMembresia: (pessoa: string, data: string, evento?: string, cursores?: { participacao?: string; ocupacao?: string }) => {
    const params = new URLSearchParams({ pessoa })
    if (data) params.set('data', data)
    if (evento) params.set('evento', evento)
    if (cursores?.participacao) params.set('cursor_participacao', cursores.participacao)
    if (cursores?.ocupacao) params.set('cursor_ocupacao', cursores.ocupacao)
    return apiClient.get<PreviaImpactos>(`orgaos/gestao/impactos-membresia?${params}`)
  },
  criarOficial: (dados: InstituicaoOficial) => apiClient.post<{ id: string }>('orgaos/gestao/oficiais', dados),
  criarUnidade: (dados: InstituicaoUnidade) => apiClient.post<{ id: string }>('orgaos/gestao/unidades', dados),
  registrarCompetencia: (dados: CompetenciaUnidades) => apiClient.post<{ id: string }>('orgaos/gestao/competencias', dados),
  competencias: (cursor?: string) => apiClient.get<Pagina<CompetenciaResumo>>(`orgaos/gestao/competencias${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`),
  presidencias: (cursor?: string) => apiClient.get<Pagina<PresidenciaResumo>>(`orgaos/gestao/presidencias${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`),
  docentes: (cursor?: string) => apiClient.get<Pagina<DocenteResumo>>(`orgaos/gestao/docentes${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`),
  registrarPresidencia: (dados: { oficial_id: string; inicio: string; evidencia: string; idempotencia: string }) => apiClient.post<{ id: string }>('orgaos/gestao/presidencias', dados),
  encerrarCompetencia: (id: string, dados: { data_fim: string; autoridade: string; evidencia: string; idempotencia: string }) => apiClient.patch<{ id: string; fim: string }>(`orgaos/gestao/competencias/${encodeURIComponent(id)}/encerrar`, dados),
  encerrarPresidencia: (id: string, dados: { data_efeito: string; autoridade: string; evidencia: string; idempotencia: string }) => apiClient.patch<{ id: string; fim: string }>(`orgaos/gestao/presidencias/${encodeURIComponent(id)}/encerrar`, dados),
  participacao: (orgaoId: string, acao: 'incluir' | 'sair', dados: { pessoa_id: string; data_efeito: string; evidencia: string; idempotencia: string }) => apiClient.post<{ ato_id: string; membro_id: string }>(`orgaos/gestao/${encodeURIComponent(orgaoId)}/participacoes/${acao}`, dados),
  designar: (orgaoId: string, cargoId: string, dados: { pessoa_id: string | null; data_efeito: string; ordem_efeito: number; evidencia: string; idempotencia: string }) => apiClient.post<{ ato_id: string; ocupacao_id: string | null }>(`orgaos/gestao/${encodeURIComponent(orgaoId)}/cargos/${encodeURIComponent(cargoId)}/designacoes`, dados),
  criarCargo: (orgaoId: string, dados: RegraCargo & { codigo: string; nome: string; funcao?: 'SECRETARIO' | 'TESOUREIRO' | 'OUTRO' }) => apiClient.post<{ id: string }>(`orgaos/gestao/${encodeURIComponent(orgaoId)}/cargos`, dados),
  configurarAcumulacao: (orgaoId: string, cargoId: string, dados: RegraCargo) => apiClient.patch<{ id: string; permite_acumulacao: boolean }>(`orgaos/gestao/${encodeURIComponent(orgaoId)}/cargos/${encodeURIComponent(cargoId)}/acumulacao`, dados),
  registrarPolitica: (orgaoId: string, dados: PoliticaUnidade) => apiClient.post<{ id: string }>(`orgaos/gestao/${encodeURIComponent(orgaoId)}/politicas`, dados),
  registrarEleicao: (orgaoId: string, cargoId: string, tipo: 'oficial' | 'unidade', dados: AtoEleicao & { politica_id?: string }) => apiClient.post<{ ato_id: string; ocupacao_id: string }>(`orgaos/gestao/${encodeURIComponent(orgaoId)}/cargos/${encodeURIComponent(cargoId)}/eleicao-${tipo}`, dados),
  encerrarOcupacao: (orgaoId: string, ocupacaoId: string, tipo: 'oficial' | 'unidade', dados: AtoEncerramento) => apiClient.patch<{ ato_id: string; ocupacao_id: string }>(`orgaos/gestao/${encodeURIComponent(orgaoId)}/ocupacoes/${encodeURIComponent(ocupacaoId)}/encerrar-${tipo}`, dados),
  desativar: (orgaoId: string, dados: AtoEncerramento) => apiClient.patch<{ ato_id: string; orgao_id: string }>(`orgaos/gestao/${encodeURIComponent(orgaoId)}/desativar`, dados),
}
