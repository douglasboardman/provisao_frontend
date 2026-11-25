import type { ApuracaoQuorum } from './assembleias'
import { apiClient } from './client'
import type { DefinicaoCampo, Valores } from './campos'
import type { EstruturaDocumento, ResolucaoInput, TipoCampo } from './secretaria'
import type { PaginaTexto } from './pagina'

export type Presente = { direito_voto?: boolean | null; id: string; nome: string; presente: boolean; arrolado: boolean; pode_propor: boolean }
export interface SessaoAssembleia {
  acesso: string
  versao: string
  revisao: number
  revisao_reuniao: number
  titulo: string
  local: string
  data: string
  presidente: string
  secretario: string
  titulares: string[]
  expira: string
  pessoas: Presente[]
  votacao?: ApuracaoQuorum
  universo: number
  minimo: number
  conferir: boolean
  competencia: string
  fundamento: string
  encerrada: boolean
  fim: string | null
  encaminhada: boolean
  decisao: string | null
  teor: string
  tipos_campos?: Record<string, TipoCampo>
  margens_concilio: boolean
  signatarios: { pessoa_id: string; assina: boolean; cargos: string[] }[]
  campos_editaveis: string[]
  campos: Record<string, string>
  composicao?: PaginaTexto
  estrutura?: EstruturaDocumento
  valores?: Valores
  definicoes?: Record<string, DefinicaoCampo>
  politica: string
  resolucoes: ResolucaoInput[]
  pauta: { id: string; ordem: number; descricao: string }[]
  anexos: { arquivo_id: string; nome: string }[]
}
export interface Presidencia {
  mesa_id: string
  secretario: string
  atas: {
    id: string
    assunto: string
    acesso: { id: string; expira_em: string; consumido_em: string | null } | null
    revisao: number
    encaminhada: boolean
  }[]
}
const rota = (id: string, acao = '') => 'minha-assembleia' + acao + '?acesso=' + encodeURIComponent(id)
const presidencia = (r: string) => 'secretaria/reunioes/' + encodeURIComponent(r) + '/presidencia'
export const minhaAssembleia = {
  ativar: (token: string) => apiClient.post<{ id: string }>('minha-assembleia/ativar', { token }),
  ficha: (id: string) => apiClient.get<SessaoAssembleia>(rota(id)),
  pessoas: (id: string, busca: string) =>
    apiClient.get<{ id: string; nome: string; direito_voto?: boolean | null }[]>(rota(id, '/pessoas') + '&busca=' + encodeURIComponent(busca)),
  gravar: (id: string, acao: string, dados: unknown) => apiClient.post(rota(id, '/' + acao), dados),
  arquivo: (id: string, arquivo: string) =>
    (import.meta.env.VITE_API_URL || 'http://localhost:3000') +
    '/' +
    rota(id, '/anexos/' + encodeURIComponent(arquivo)),
  presidencia: (r: string) => apiClient.get<Presidencia>(presidencia(r)),
  conceder: (r: string, dados: unknown) => apiClient.post(presidencia(r) + '/conceder', dados),
  revogar: (r: string, id: string) => apiClient.post(presidencia(r) + '/' + id + '/revogar'),
}
