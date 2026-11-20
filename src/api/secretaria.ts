import { apiClient } from './client'
export type PoliticaDocumento = 'NAO_PERMITE' | 'OPCIONAL' | 'OBRIGATORIO'
export type TipoCampo = 'TEXTO' | 'DATA' | 'NUMERO' | 'SIM_NAO'
export interface ContextoSecretaria {
  id: string; nome: string; sigla: string; tipo: 'ORGAO' | 'ASSEMBLEIA_GERAL'; orgao_id: string | null
  orgao: { tipo: 'CONSELHO' | 'JUNTA' | 'UNIDADE_MINISTERIAL'; constituicao: 'OFICIAL' | 'ELEICAO' | 'DESIGNACAO' } | null
  pode_preparar: boolean; pode_aprovar: boolean; pode_deliberar: boolean; pode_consultar_restritos: boolean
}
export interface ConfiguracaoModelo {
  perfil: string; contexto: ContextoSecretaria['tipo']; tipos_orgao: NonNullable<ContextoSecretaria['orgao']>['tipo'][]; constituicoes: NonNullable<ContextoSecretaria['orgao']>['constituicao'][]
  motivador: PoliticaDocumento; resolucoes: PoliticaDocumento; registro_livro: boolean; registro_em_livro?: PoliticaDocumento; campos_obrigatorios: string[]; papeis_obrigatorios: string[]; cargos_obrigatorios: string[]
  estrutura_padrao?: EstruturaDocumento
  tipos_campos?: Record<string, TipoCampo>
}
export interface ModeloVersao { id: string; numero: number; tipo: 'ATA' | 'OUTRO'; finalidade: string; configuracao: ConfiguracaoModelo }
export interface ModeloDocumento { id: string; nome: string; revisao: number; versoes: ModeloVersao[] }
export interface Participante { pessoa_id: string; presente: boolean; papeis: string[]; pode_propor?: boolean }
export const rotulosModalidadeReuniao = {
  ORDINARIA: 'Ordinária',
  EXTRAORDINARIA: 'Extraordinária',
  REGULAR: 'Regular',
  AGO: 'Assembleia geral ordinária',
  AGE: 'Assembleia geral extraordinária',
} as const
type ModalidadeReuniao = keyof typeof rotulosModalidadeReuniao
export function modalidadesParaContexto(contexto: ContextoSecretaria): ModalidadeReuniao[] {
  if (contexto.tipo === 'ASSEMBLEIA_GERAL') return ['AGO', 'AGE']
  return contexto.orgao?.tipo === 'CONSELHO'
    ? ['ORDINARIA', 'EXTRAORDINARIA', 'REGULAR']
    : ['ORDINARIA', 'EXTRAORDINARIA']
}
export interface DadosReuniao {
  restrito: boolean; modalidade: ModalidadeReuniao; data: string; local: string; inicio: string | null; fim: string | null; pauta: string; competencia: string
  universo_informado: number; quorum_minimo: number; quorum_conferido: boolean; fundamento_quorum: string; resultado: string; participantes: Participante[]
}
export interface ReuniaoSecretaria { id: string; revisao: number; data: string; modalidade: ModalidadeReuniao; dados: DadosReuniao; participantes: (Participante & { retrato: { nome: string } })[] }
export interface Arrolado { pessoa_id: string; papeis: string[]; cargo_id: string | null; cargos_ids: string[]; assina: boolean; obrigatorio: boolean; responsavel: boolean; fundamento: string }
export type BlocoDocumento =
  | { tipo: 'TEXTO'; texto: string; alinhamento: 'ESQUERDA' | 'CENTRO' | 'DIREITA' | 'JUSTIFICADO'; estilo: 'NORMAL' | 'TITULO' | 'SUBTITULO'; rico?: boolean }
  | { tipo: 'LISTA'; itens: string[]; ordenada: boolean }
  | { tipo: 'TABELA'; linhas: string[][]; primeira_linha_cabecalho?: boolean }
  | { tipo: 'IMAGEM'; arquivo_id: string; descricao: string }
  | { tipo: 'QUEBRA' | 'ASSINATURAS' }
export interface EstruturaDocumento { cabecalho: BlocoDocumento[]; corpo: BlocoDocumento[]; rodape: BlocoDocumento[] }
export const resultadosResolucao = {
  APROVADA: 'Aprovada', APROVADA_COM_ALTERACOES: 'Aprovada com alterações',
  REJEITADA: 'Rejeitada', RETIRADA: 'Retirada', ADIADA: 'Adiada',
} as const
export const rotulosApuracao = {
  favoraveis: 'Favoráveis', contrarios: 'Contrários', abstencoes: 'Abstenções',
  impedimentos: 'Impedimentos', quorum: 'Quórum registrado',
} as const
export type ResultadoResolucao = keyof typeof resultadosResolucao
export interface ResolucaoInput {
  ordem: number; assunto: string; texto_proposta: string | null; texto_deliberado: string | null
  resultado: ResultadoResolucao; eficaz: boolean; data_efeito: string | null; votacao_secreta: boolean
  apuracao: Partial<Record<keyof typeof rotulosApuracao, number>> | null
  proponentes_pessoas_ids: string[]; dissidentes_pessoas_ids: string[]
}
type RetratoPessoa = { nome: string; cargo?: { nome: string } | null; cargos?: { nome: string }[] }
type VinculoResolucao = { arrolado: { pessoa_id: string; papeis: string[]; retrato: RetratoPessoa } }
export interface ResolucaoDocumento extends Omit<ResolucaoInput, 'proponentes_pessoas_ids' | 'dissidentes_pessoas_ids'> {
  id: string; proponentes: VinculoResolucao[]; dissidentes: VinculoResolucao[]
}
export interface FiltrosAtuacao {
  tipo: 'resolucoes' | 'registros'; contexto?: string; pessoa?: string; assunto?: string
  de?: string; ate?: string; resultado?: ResultadoResolucao
}
export const rotulosAtuacao = {
  autoria: 'Autoria', coautoria: 'Coautoria', dissidencia: 'Dissidência',
  presenca: 'Presença na reunião', assinatura: 'Assinatura registrada',
} as const
type IndicadorAtuacao = keyof typeof rotulosAtuacao
export type ItemAtuacao = Record<IndicadorAtuacao, boolean> & {
  documento_id: string; contexto_id: string; versao_id: string; versao: number; versao_atual: boolean
  estado: DocumentoResumo['estado']; contexto: string; numero: string; data: string; assunto: string
  resolucao_id: string | null; ordem: number | null; resultado: ResultadoResolucao | null
  eficaz: boolean | null; proponentes: string | null; dissidentes: string | null
}
export interface RelatorioAtuacao {
  itens: ItemAtuacao[]; totais: Record<IndicadorAtuacao | 'total', number>; pagina: number; tamanho: number
}
export interface VersaoInput { resolucoes?: ResolucaoInput[]; modelo_versao_id: string; livro_id?: string | null; reuniao_id: string | null; motivador_id: string | null; assunto: string; data_documento: string; conteudo: { teor: string; campos: Record<string, string>; arrolados: Arrolado[]; anexos: { arquivo_id: string; nome: string }[]; estrutura?: EstruturaDocumento } }
export interface ReuniaoLegada {
  data: string | null; local: string | null; modalidade: DadosReuniao['modalidade'] | null
  inicio: string | null; fim: string | null; pauta: string | null
}
export interface AtaLegadaInput {
  contexto_id: string; restrito: boolean; numero_original: string | null; assunto: string; data_documento: string
  reuniao_id: string | null; reuniao: ReuniaoLegada; pdf: { arquivo_id: string; nome: string }; teor: string
  autoridade: string; evidencia: string; conferida: boolean
  arrolados: Pick<Arrolado, 'pessoa_id' | 'papeis' | 'fundamento'>[]; resolucoes: ResolucaoInput[]
}
export interface DocumentoVersao extends Omit<VersaoInput, 'resolucoes' | 'modelo_versao_id'> {
  resolucoes?: ResolucaoDocumento[]
  id: string; numero: number; revisao_conteudo: number; congelado_em: string | null; retifica_versao_id: string | null; modelo: ModeloVersao | null
  modelo_versao_id: string | null; numero_original?: string | null; folhas_legadas?: string | null
  fonte_congelada: { igreja?: { nome: string }; contexto: { nome: string }; numero: string | null; registro_livro?: Pick<RegistroLivro, 'ordem' | 'posicao_inicio' | 'posicao_fim' | 'numero_visivel_inicio'> & { numero_livro: number; serie_livro: string }; arrolados?: { pessoa_id: string; retrato: { nome: string; cargo: { nome: string } | null; cargos?: { id: string; nome: string }[] } }[]; legado?: { autoridade: string; evidencia: string; conferido_em: string; operador: string; arquivo_id: string; sha256: string; reuniao: ReuniaoLegada } } | null
  arrolados: (Arrolado & { retrato: { nome: string; fundamento?: string; cargo: { nome: string } | null; cargos?: { id: string; nome: string }[] } })[]
  anexos: { arquivo_id: string; nome: string; arquivo: { sha256: string; tamanho: number } }[]
  deliberacoes: { resultado: string; data: string; autoridade: string; evidencia: string; revisao_conteudo: number }[]
}
export interface DocumentoResumo { id: string; revisao: number; estado: 'EM_EDICAO' | 'APROVADO' | 'EXPEDIDO' | 'CANCELADO' | 'ANULADO' | 'LEGADA_CONFERIDA'; versao_atual: number; restrito: boolean; tipo: string; numero: number | null; ano: number | null; sigla: string | null; encaminhado_em: string | null; versoes: { id: string; numero: number; assunto: string; data_documento: string; numero_original?: string | null }[] }
export const estadosDocumento: Record<DocumentoResumo['estado'], string> = {
  EM_EDICAO: 'Em edição', APROVADO: 'Aprovado', EXPEDIDO: 'Expedido', CANCELADO: 'Cancelado', ANULADO: 'Anulado',
  LEGADA_CONFERIDA: 'Ata legada conferida',
}
export interface DocumentoDetalhe extends Omit<DocumentoResumo, 'versoes'> { contexto_id: string; versoes: DocumentoVersao[] }
export interface ResultadoSecretaria { id: string; revisao?: number; versao_id?: string }
export interface ArtefatoDocumento {
  id: string; versao_id: string; revisao_documento: number; finalidade: 'RASCUNHO' | 'MATRIZ_APROVADA' | 'MEDICAO_LIVRO'; paginas_medidas?: number | null;
  estado: 'PENDENTE' | 'PROCESSANDO' | 'CONCLUIDO' | 'FALHOU' | 'OBSOLETO'; sha256: string | null; tamanho: number | null;
}
export interface CompetenciaSecretaria { id: string; contexto_id: string; inicio: string; fim: string | null; pode_aprovar: boolean; pode_deliberar: boolean; pode_consultar_restritos: boolean; titular: { nome_usuario: string }; autoridade: string; evidencia: string }
export type EstadoLivro = 'EM_PREPARACAO' | 'ABERTO' | 'SUSPENSO' | 'EM_ENCERRAMENTO' | 'ENCERRADO'
export type AcaoLivro = 'suspender' | 'retomar' | 'preparar-encerramento' | 'desistir-encerramento'
export type FinalidadeTermo = 'TERMO_ABERTURA' | 'TERMO_ENCERRAMENTO'
export interface LivroResumo {
  id: string; titular: string; serie: string; numero: number; estado: EstadoLivro; revisao: number; restrito: boolean
  capacidade_folhas: number; faces_por_folha: number; modalidade: 'PARA_ENCADERNACAO' | 'ELETRONICO' | 'FISICO_DIGITALIZADO'
  perfil: 'LOCAL_V1' | 'CONCILIO_IPB_2025' | 'ACERVO_HISTORICO'
}
interface FaceLivro { folha: number; face: 'FRENTE' | 'VERSO' }
export interface RegistroLivro {
  id: string; ordem: number; natureza: 'ABERTURA' | 'ATA_ORIGINAL' | 'EXAME' | 'OUTRO_AUTORIZADO' | 'ENCERRAMENTO'
  estado: 'RESERVADO' | 'EFETIVADO' | 'CANCELADO'; posicao_inicio: number; posicao_fim: number; numero_visivel_inicio: number | null
  inicio: FaceLivro; fim: FaceLivro; versao: { documento_id: string; numero: number; assunto: string }; arquivo: { sha256: string } | null
}
export interface LivroDetalhe extends LivroResumo {
  fonte_normativa: string; capacidade_faces: number; reserva_exame: number
  motivo_encerramento: string | null; manifesto_sha256: string | null; arquivo_historico_id: string | null; data_historica: string | null
  aberto_em: string | null; encerrado_em: string | null
  totais: { paginas_utilizadas: number; folhas_utilizadas: number; saldo_folhas: number; saldo_faces: number; total_atas: number; pendencias: number; ultima_posicao: number } | null
  registros: RegistroLivro[]
  termos: { id: string; assunto: string; numero: number; modelo: { finalidade: FinalidadeTermo }; documento: { id: string; estado: DocumentoResumo['estado']; versao_atual: number } }[]
  eventos: { id: string; tipo: string; motivo: string; autoridade: string; evidencia: string; retrato: { nome: string }; criado_em: string }[]
  complementos: { versao_id: string; versao: { documento_id: string; numero: number; assunto: string; documento: { estado: DocumentoResumo['estado'] } } }[]
  atas_legadas?: { documento_id: string; numero_original: string | null; assunto: string; data_documento: string; folhas_legadas: string | null }[]
}

export const livrosHabilitados = () => import.meta.env.VITE_FEATURE_SECRETARIA_LIVROS === 'true'
export const finalidadeTermo = (s?: string): s is FinalidadeTermo => s === 'TERMO_ABERTURA' || s === 'TERMO_ENCERRAMENTO'
export const politicaLivro = (config: ConfiguracaoModelo) => config.registro_em_livro ?? (config.registro_livro ? 'OBRIGATORIO' : 'NAO_PERMITE')
export const estadosLivro: Record<EstadoLivro, string> = {
  EM_PREPARACAO: 'Em preparação', ABERTO: 'Aberto', SUSPENSO: 'Suspenso', EM_ENCERRAMENTO: 'Em encerramento', ENCERRADO: 'Encerrado',
}
export const nomeLivro = (livro: LivroResumo) => `Livro nº ${livro.numero} · ${livro.serie}`

const base = 'secretaria'
export const secretariaApi = {
  atuacao: (filtros: FiltrosAtuacao, pagina: number) => {
    const params = new URLSearchParams({ ...filtros, pagina: String(pagina) })
    return apiClient.get<RelatorioAtuacao>(`${base}/atuacao?${params}`)
  },
  exportarAtuacao: (filtros: FiltrosAtuacao) => apiClient.postBlob(`${base}/atuacao/exportar`, filtros),
  livros: (contexto: string, pagina = 0, filtro?: { serie?: string; restrito: boolean; estado: EstadoLivro; modalidade?: 'FISICO_DIGITALIZADO' }) => {
    const params = new URLSearchParams({ contexto, pagina: String(pagina) })
    if (filtro) {
      params.set('restrito', String(filtro.restrito))
      params.set('estado', filtro.estado)
      if (filtro.modalidade) params.set('modalidade', filtro.modalidade)
      if (filtro.serie) params.set('serie', filtro.serie)
    }
    return apiClient.get<LivroResumo[]>(`${base}/livros?${params}`)
  },
  livro: (id: string) => apiClient.get<LivroDetalhe>(`${base}/livros/${id}`),
  criarLivro: (d: unknown) => apiClient.post<ResultadoSecretaria>(`${base}/livros`, d),
  importarLivro: (d: unknown) => apiClient.post<ResultadoSecretaria>(`${base}/livros/importar`, d),
  acaoLivro: (id: string, acao: AcaoLivro, d: unknown) => apiClient.post<ResultadoSecretaria>(`${base}/livros/${id}/acoes/${acao}`, d),
  candidatosComplemento: (id: string, pagina: number) => apiClient.get<{ id: string; assunto: string; numero: number }[]>(`${base}/livros/${id}/complementos/candidatos?pagina=${pagina}`),
  complementarLivro: (id: string, d: unknown) => apiClient.post<ResultadoSecretaria>(`${base}/livros/${id}/complementos`, d),
  arquivoRegistroUrl: (livro: string, registro: string) => `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/${base}/livros/${livro}/registros/${registro}/arquivo`,
  arquivoLivroUrl: (id: string, tipo: 'historico' | 'manifesto' | 'compilacao') => `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/${base}/livros/${id}/arquivos/${tipo}`,
  medirLivro: (id: string, revisao: number) => apiClient.post<ArtefatoDocumento>(`${base}/documentos/${id}/medicao-livro`, { revisao }),
  cargos: (c: string) => apiClient.get<{ id: string; nome: string }[]>(`${base}/contextos/${c}/cargos`),
  contextos: () => apiClient.get<ContextoSecretaria[]>(`${base}/contextos`),
  competencias: () => apiClient.get<CompetenciaSecretaria[]>(`${base}/competencias`),
  modelos: (c: string) => apiClient.get<ModeloDocumento[]>(`${base}/modelos?contexto=${encodeURIComponent(c)}`),
  reunioes: (c: string, p = 0) => apiClient.get<ReuniaoSecretaria[]>(`${base}/reunioes?contexto=${encodeURIComponent(c)}&pagina=${p}`),
  documentos: (c: string, p = 0) => apiClient.get<DocumentoResumo[]>(`${base}/documentos?contexto=${encodeURIComponent(c)}&pagina=${p}`),
  historico: (id: string, p = 0) => apiClient.get<{ id: string; operacao: string; criado_em: string; operador: string; autoridade: string | null; evidencia: string | null }[]>(`${base}/documentos/${id}/historico?pagina=${p}`),
  documento: (id: string) => apiClient.get<DocumentoDetalhe>(`${base}/documentos/${encodeURIComponent(id)}`),
  solicitarRascunho: (id: string, revisao: number) => apiClient.post<{ id: string; estado: string }>(`${base}/documentos/${id}/rascunhos`, { revisao }),
  artefatos: (id: string) => apiClient.get<ArtefatoDocumento[]>(`${base}/documentos/${id}/artefatos`),
  solicitarMatriz: (id: string, versao: string) => apiClient.post<{ id: string }>(`${base}/documentos/${id}/versoes/${versao}/matriz`, {}),
  artefatoUrl: (id: string, trabalho: string) => `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/${base}/documentos/${id}/artefatos/${trabalho}/arquivo`,
  criarContexto: (d: unknown) => apiClient.post<ResultadoSecretaria>(`${base}/contextos`, d),
  conceder: (d: unknown) => apiClient.post<ResultadoSecretaria>(`${base}/competencias`, d),
  encerrarCompetencia: (id: string, d: unknown) => apiClient.post<ResultadoSecretaria>(`${base}/competencias/${id}/encerrar`, d),
  criarModelo: (d: unknown) => apiClient.post<ResultadoSecretaria>(`${base}/modelos`, d),
  versionarModelo: (id: string, d: unknown) => apiClient.post<ResultadoSecretaria>(`${base}/modelos/${id}/versoes`, d),
  criarReuniao: (d: unknown) => apiClient.post<ResultadoSecretaria>(`${base}/reunioes`, d),
  editarReuniao: (id: string, d: unknown) => apiClient.patch<ResultadoSecretaria>(`${base}/reunioes/${id}`, d),
  criarDocumento: (d: unknown) => apiClient.post<ResultadoSecretaria>(`${base}/documentos`, d),
  criarAtaLegada: (d: AtaLegadaInput & { idempotencia: string }) => apiClient.post<ResultadoSecretaria>(`${base}/atas-legadas`, d),
  extrairTeorLegado: (d: { contexto_id: string; arquivo_id: string }) => apiClient.post<{ teor: string }>(`${base}/atas-legadas/teor`, d),
  vincularLivroLegado: (id: string, d: { idempotencia: string; revisao: number; livro_id: string | null; folhas: string | null; autoridade: string; evidencia: string }) =>
    apiClient.post<ResultadoSecretaria>(`${base}/atas-legadas/${id}/livro`, d),
  editarDocumento: (id: string, d: unknown) => apiClient.patch<ResultadoSecretaria>(`${base}/documentos/${id}`, d),
  comando: (id: string, acao: string, d: unknown) => apiClient.post<ResultadoSecretaria>(`${base}/documentos/${id}/${acao}`, d),
  upload: async (file: File) => {
    const body = new FormData(); body.append('file', file)
    const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/arquivos-privados`, { method: 'POST', credentials: 'include', headers: { 'X-Provisao-Request': '1' }, body })
    if (!res.ok) throw new Error('Não foi possível enviar o anexo privado (limite de 10 MB).')
    return res.json() as Promise<{ id: string; tamanho: number }>
  },
  anexoUrl: (doc: string, versao: string, arquivo: string) => `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/${base}/documentos/${doc}/versoes/${versao}/anexos/${arquivo}`,
}
export function numeroDocumento(d: Pick<DocumentoResumo, 'numero' | 'ano' | 'sigla'> & Partial<Pick<DocumentoResumo, 'estado' | 'versoes' | 'versao_atual'>>) {
  if (d.estado === 'LEGADA_CONFERIDA') return d.versoes?.find(v => v.numero === d.versao_atual)?.numero_original ?? 'Sem número no original'
  return d.numero ? `${String(d.numero).padStart(3, '0')}/${d.ano}/${d.sigla}` : 'Sem número reservado'
}
