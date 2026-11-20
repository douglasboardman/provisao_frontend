import { apiClient } from './client'

export type GrupoAta = 'MEMBRESIA' | 'MANDATO' | 'PASTORAL' | 'ORGAO' | 'FINANCEIRO'
export type EtapaAta = 'ATO' | 'ELEICAO' | 'POSSE' | 'INICIO' | 'ENCERRAMENTO'
export type AlvoAta = { grupo: GrupoAta; alvo_id: string; etapa: EtapaAta }
export type SituacaoAta = 'PENDENTE' | 'MINUTA_VINCULADA' | 'FORMALIZADA' | 'EXTERNA_CONFERIDA' | 'LEGADA_CONFERIDA' | 'ANULADA' | 'SUPERADA'
export const situacoesAta: Record<SituacaoAta, string> = {
  PENDENTE: 'Documentação pendente', MINUTA_VINCULADA: 'Minuta vinculada', FORMALIZADA: 'Ata formalizada',
  EXTERNA_CONFERIDA: 'Referência externa conferida', ANULADA: 'Ata anulada', SUPERADA: 'Versão cancelada ou superada',
  LEGADA_CONFERIDA: 'Ata legada conferida',
}
export const etapasAta: Record<EtapaAta, string> = { ATO: 'Ato', ELEICAO: 'Eleição', POSSE: 'Posse', INICIO: 'Início', ENCERRAMENTO: 'Encerramento' }
export const gruposAta: Record<GrupoAta, string> = { MEMBRESIA: 'Membresia', MANDATO: 'Mandato', PASTORAL: 'Vínculo pastoral', ORGAO: 'Órgão', FINANCEIRO: 'Autorização financeira' }
export const tiposFinanceiros = {
  ORCAMENTO: 'Aprovação ou revisão de orçamento',
  PRESTACAO_CONTAS: 'Prestação de contas',
  DESPESA_EXTRAORDINARIA: 'Despesa extraordinária',
  APROVACAO_PROJETO: 'Aprovação de projeto',
  ENCERRAMENTO_PROJETO: 'Encerramento de projeto',
  DESTINACAO_RECURSOS: 'Destinação de recursos',
  CONTA_SIGNATARIOS: 'Decisão sobre conta ou signatários',
} as const

interface ReferenciaExterna {
  concilio: string; identificacao: string; data: string; localizacao: string
  origem?: string; livro?: string; paginas?: string; conferida: true
}
export interface AtaOpcao {
  documento_id: string; versao: number; numero: number | null; ano: number | null; sigla: string | null
  data: string; contexto: string; numero_formatado?: string; estado: string
}
export interface BuscaAtaOpcao extends AtaOpcao { versao_id: string; contexto_id: string; assunto: string }
interface Revisao {
  id: string; justificativa: string; criado_em: string; operador: string
  situacao: SituacaoAta; referencia_externa: ReferenciaExterna | null; ata: AtaOpcao | null
}
export interface ItemDocumental extends AlvoAta {
  tipo: string; titulo: string; data: string | null; orgao_id: string | null; versao: number | null; situacao: SituacaoAta
}
interface Autorizacao {
  id: string; tipo: keyof typeof tiposFinanceiros; assunto: string; autoridade: string; data_decisao: string
  evidencia: string; projeto: string | null; conta: string | null; situacao: SituacaoAta
}
interface Pagina<T> { itens: T[]; tem_proxima: boolean }
export interface EntradaReferencia {
  ata_documento_id?: string; versao_id?: string; referencia_externa?: ReferenciaExterna
  justificativa: string; revisao_esperada: string | null
}
const base = 'secretaria'
const caminho = ({ grupo, alvo_id, etapa }: AlvoAta) => `${base}/referencias-ata/${grupo}/${encodeURIComponent(alvo_id)}/${etapa}`
const params = (filtros: Record<string, string>) => new URLSearchParams(filtros).toString()

export const referenciasAtaApi = {
  consultar: (alvo: AlvoAta, pagina = 0) => apiClient.get<Pagina<Revisao> & { situacao?: SituacaoAta; pode_editar: boolean }>(`${caminho(alvo)}?pagina=${pagina}`),
  registrar: (alvo: AlvoAta, dados: EntradaReferencia) => apiClient.post<{ id: string }>(caminho(alvo), dados),
  buscar: (alvo: AlvoAta, filtros: Record<string, string>) => apiClient.get<Pagina<BuscaAtaOpcao> & { contextos: { id: string; nome: string; sigla: string }[] }>(`${caminho(alvo)}/atas?${params(filtros)}`),
  vinculados: (id: string, pagina: number) => apiClient.get<Pagina<ItemDocumental>>(`${base}/documentos/${encodeURIComponent(id)}/registros-vinculados?pagina=${pagina}`),
  pendencias: (pagina: number, grupo?: GrupoAta) => apiClient.get<Pagina<ItemDocumental>>(`${base}/pendencias-documentais?${params({ pagina: String(pagina), ...(grupo ? { grupo } : {}) })}`),
  autorizacoes: (pagina: number, projeto?: string, conta?: string) => apiClient.get<Pagina<Autorizacao> & { pode_criar: boolean }>(`${base}/autorizacoes-financeiras?${params({ pagina: String(pagina), ...(projeto ? { projeto } : {}), ...(conta ? { conta } : {}) })}`),
  registrarAutorizacao: (dados: unknown) => apiClient.post<{ id: string }>(`${base}/autorizacoes-financeiras`, dados),
}
