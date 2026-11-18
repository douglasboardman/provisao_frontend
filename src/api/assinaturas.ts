import { apiClient } from './client'
import type { ResultadoSecretaria } from './secretaria'

export type ModalidadeAssinatura = 'ELETRONICA' | 'FISICA'
export type EstadoExpedicao = 'AGUARDANDO' | 'PENDENTE' | 'PROCESSANDO' | 'FALHOU' | 'CONCLUIDA' | 'CANCELADA'
export interface Signatario {
  id: string
  nome: string
  obrigatorio: boolean
  papeis: string[]
  assinatura: { data: string; metodo: ModalidadeAssinatura; evidencias: { data_fisica?: string } } | null
  convite: {
    estado: 'PENDENTE' | 'REVOGADO' | 'RECUSADO' | 'EXPIRADO' | 'ASSINADO'
    entrega?: string
    motivo_recusa: string | null
  } | null
}
export interface Expedicao {
  versao_id: string
  modalidade: ModalidadeAssinatura
  estado: EstadoExpedicao
  fuso_iana: string
  codigo: string | null
  matriz_sha256: string | null
  aceite_sha256: string | null
  final_sha256: string | null
  via_sha256: string | null
  expedido_em: string | null
  signatarios: Signatario[]
  conferencia: { operador: string; data: string; evidencia: string; sha256: string } | null
}
export interface ConviteAssinatura {
  nome: string
  numero: string
  assunto: string
  versao: number
  versao_id: string
  manifesto_sha256: string
  matriz_sha256: string
  fuso_iana: string
  anexos: { id: string; nome: string; sha256: string }[]
  estado: 'PENDENTE' | 'ASSINADO' | 'RECUSADO'
  assinatura_em: string | null
  consentimento: string
  codigo: string | null
}
interface EscopoConvite {
  token: string
  versao_id: string
  manifesto_sha256: string
}
interface Verificacao {
  estado: 'EXPEDIDO' | 'ANULADO'
  modalidade: ModalidadeAssinatura
  expedido_em: string
  sha256: string
}

const secretaria = (doc: string) => `secretaria/documentos/${doc}/assinaturas`
const url = import.meta.env.VITE_API_URL || 'http://localhost:3000'
export const assinaturasHabilitadas = () => import.meta.env.VITE_FEATURE_SECRETARIA_ASSINATURAS === 'true'
export const modalidadeLabel = { ELETRONICA: 'Eletrônica', FISICA: 'Física' }
export const dataAssinatura = (data: string, fuso: string) =>
  new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'medium', timeZone: fuso }).format(new Date(data))
export const verificacaoUrl = (codigo: string) => `/assinaturas/verificar?codigo=${codigo}`

export const assinaturasApi = {
  listar: (doc: string) => apiClient.get<Expedicao[]>(secretaria(doc)),
  comando: (doc: string, acao: 'convidar' | 'revogar' | 'via' | 'repetir', dados: unknown) =>
    apiClient.post<ResultadoSecretaria>(`${secretaria(doc)}/${acao}`, dados),
  conferir: (doc: string, dados: unknown, scan: File) => {
    const body = new FormData()
    body.append('dados', JSON.stringify(dados))
    body.append('file', scan)
    return apiClient.postForm<ResultadoSecretaria>(`${secretaria(doc)}/fisica/conferir`, body)
  },
  arquivoUrl: (doc: string, versao: string, tipo: 'via' | 'scan' | 'final' | 'manifesto') =>
    `${url}/${secretaria(doc)}/${versao}/arquivos/${tipo}`,
  consultar: (token: string) => apiClient.post<ConviteAssinatura>('assinaturas/convite/consulta', { token }),
  baixar: (dados: EscopoConvite & { arquivo_id?: string }) => apiClient.postBlob('assinaturas/convite/arquivo', dados),
  decidir: (dados: EscopoConvite & ({ decisao: 'ASSINAR'; consentimento: true } | { decisao: 'RECUSAR'; motivo: string })) =>
    apiClient.post<{ estado: 'ASSINADO' | 'RECUSADO' }>('assinaturas/convite/decisao', dados),
  verificar: (codigo: string) => apiClient.get<Verificacao>(`assinaturas/verificacao/${encodeURIComponent(codigo)}`),
}
