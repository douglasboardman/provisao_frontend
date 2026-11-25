import { apiClient } from './client'
import type { ResultadoSecretaria } from './secretaria'

export interface LinhaRol { pessoa_id: string; nome: string; categoria: 'COMUNGANTES' | 'NAO_COMUNGANTES' | 'CONFERIR' }
interface Folha { id: string; versao: number; referencia: string; extraida_em: string; identificacao: string }
export interface FolhaAssembleia extends Folha { linhas: LinhaRol[] }
export interface ApuracaoQuorum { base: 'VOTANTES_CONFIRMADOS' | 'PRESENCAS_LEGADAS'; presentes: number; votantes_presentes: string[] | null; minimo: number }
export interface CriterioPresidencia {
  impedimentos: { oficial_id: string; motivo: 'AUSENTE' | 'IMPEDIDO'; fundamento: string }[]
  determinacao_presbiterio?: string
}
export interface FichaAssembleia {
  orgao_id?: string
  votacao?: ApuracaoQuorum
  prioridade?: { ordem: number; funcao: string; ids: string[] }[]
  pode_gerar: boolean; pode_instalar: boolean; institucional: string | null
  folhas: Folha[]; oficiais: { id: string; pessoa_id: string; nome: string; tipo: string; prioridade?: number | null }[]
  mesas: { id: string; ordem: number; presidente_nome: string; secretario_nome: string; presidente_oficial_id: string; secretario_id: string
    vigente_desde: string; motivo: string; fundamento: string; criterio_presidencia?: CriterioPresidencia | null; votantes_confirmados?: string[] | null; operador: { nome_usuario: string } }[]
}
const caminho = (id: string) => 'secretaria/reunioes/' + encodeURIComponent(id) + '/assembleia'
export const assembleiasApi = {
  ficha: (id: string) => apiClient.get<FichaAssembleia>(caminho(id)),
  rol: (id: string, referencia: string) => apiClient.get<LinhaRol[]>(caminho(id) + '/rol?referencia=' + encodeURIComponent(referencia)),
  folha: (id: string, folha: string) => apiClient.get<FolhaAssembleia>(caminho(id) + '/folhas/' + encodeURIComponent(folha)),
  gerar: (id: string, dados: { referencia: string; idempotencia: string }) => apiClient.post<ResultadoSecretaria>(caminho(id)+'/folhas',dados),
  instalar: (id: string, dados: MesaInput & { idempotencia: string }) => apiClient.post<ResultadoSecretaria>(caminho(id)+'/mesa',dados),
}
export interface MesaInput { criterio_presidencia?: CriterioPresidencia; votantes_confirmados?: string[]; quorum?: { minimo: number; competencia: string; fundamento: string }; revisao: number; presidente_oficial_id: string; secretario_id: string; confirmar_presencas: string[]; universo: number; vigente_desde: string; motivo: string; fundamento: string }
