import type { ReatribuicaoAtos } from './referencias-ata'
import type { CampoIgreja, DefinicaoCampo, Valores } from './campos'
import type { PaginaTexto } from './pagina'
import type { PaginaSelecao } from './referencias-ata'
import { apiClient } from './client'
export type PoliticaDocumento = 'NAO_PERMITE' | 'OPCIONAL' | 'OBRIGATORIO'
export type TipoCampo = 'TEXTO' | 'DATA' | 'NUMERO' | 'SIM_NAO'
export interface ContextoSecretaria {
  registro_livro?: boolean
  por_extenso?: string
  editor_pagina?: boolean
  id: string; nome: string; sigla: string; tipo: 'ORGAO' | 'ASSEMBLEIA_GERAL'; orgao_id: string | null
  orgao: { ativo?: boolean; tipo: 'ASSEMBLEIA_GERAL' | 'SOCIEDADE_INTERNA' | 'CONSELHO' | 'JUNTA' | 'UNIDADE_MINISTERIAL'; constituicao: 'OFICIAL' | 'ELEICAO' | 'DESIGNACAO' } | null
  pode_gerir_modelos?: boolean; pode_editar_ata_legada?: boolean; pode_classificar_ata?: boolean; somente_atas?: boolean
  pode_agendar?: boolean; pode_preparar: boolean; pode_aprovar: boolean; pode_deliberar: boolean; pode_consultar_restritos: boolean
}
export interface RegraAntecedente { modelo_id: string; campos: Record<string,string> }
export interface Antecedente { versao_id: string; identificacao: string }
export interface PreviaOrigem { antecedente: Antecedente; valores: Valores }
export interface RegraAtuacao { criar: string[]; preparar: string[]; assinar: string[]; substituicao_assinatura?: { titular: string; substituto: string } }
export interface PermissoesModelo { criar: boolean; preparar: boolean; sem_pessoa_vinculada?: boolean }
export interface PapelModelo { id: string; nome: string; codigo: string }
export interface ConfiguracaoModelo {
  assinaturas_reuniao?: 'CARGOS' | 'MESA' | 'PRESENTES'
  vinculo_reuniao?: PoliticaDocumento
  atuacao?: RegraAtuacao
  antecedentes?: RegraAntecedente[]
  perfil: string; contexto: ContextoSecretaria['tipo']; tipos_orgao: NonNullable<ContextoSecretaria['orgao']>['tipo'][]; constituicoes: NonNullable<ContextoSecretaria['orgao']>['constituicao'][]
  motivador: PoliticaDocumento; resolucoes: PoliticaDocumento; registro_livro: boolean; registro_em_livro?: PoliticaDocumento; campos_obrigatorios: string[]; papeis_obrigatorios: string[]; cargos_obrigatorios: string[]
  definicoes?: Record<string, DefinicaoCampo>
  obrigatorios_biblioteca?: string[]
  composicao_padrao?: PaginaTexto
  estrutura_padrao?: EstruturaDocumento
  tipos_campos?: Record<string, TipoCampo>
}
export interface ModeloVersao { id: string; numero: number; tipo: 'ATA' | 'OUTRO'; finalidade: string; configuracao: ConfiguracaoModelo }
export interface ModeloDocumento { permissoes?: PermissoesModelo; id: string; nome: string; revisao: number; estado?: 'EM_EDICAO' | 'PUBLICADO'; rascunho?: (Omit<ModeloVersao, 'numero' | 'id'> & { nome: string }) | null; versoes: ModeloVersao[] }
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
  return (contexto.orgao?.tipo === 'CONSELHO' || contexto.orgao?.tipo === 'JUNTA')
    ? ['ORDINARIA', 'EXTRAORDINARIA', 'REGULAR']
    : ['ORDINARIA', 'EXTRAORDINARIA']
}
export function nomeModalidade(contexto: ContextoSecretaria, modalidade: ModalidadeReuniao) {
  if (modalidade === 'REGULAR' && contexto.orgao?.tipo === 'CONSELHO') return 'Reunião regular do Conselho'
  if (modalidade === 'REGULAR' && contexto.orgao?.tipo === 'JUNTA') return 'Reunião regular da Junta Diaconal'
  return rotulosModalidadeReuniao[modalidade]
}
export const situacoesReuniao = {
  NAO_INSTALADA: 'Não instalada', AGENDADA: 'Agendada', EM_ANDAMENTO: 'Em andamento', ENCERRADA: 'Encerrada', ADIADA: 'Adiada', CANCELADA: 'Cancelada',
} as const
export interface ItemPauta { id?: string; ordem: number; descricao: string; proponente_id: string | null; proponente: { nome_completo: string } | null }
export interface ConfigModeloReuniao {
  tipo: string; natureza: string; obrigatoria: boolean; periodicidade: string; referencia: string
  orgaos_participantes: string[]; primeira: string; segunda: string; antecedencia_dias: number | null
  intervalo_minutos: number | null; minimo_anual: number | null; colegiado: string; fundamentacao: string; observacao: string
}
export interface ModeloReuniao { id: string; finalidade: string; revisao: number; configuracao: ConfigModeloReuniao }
export interface EfetivosAta {
  minimo_declarado?: number
  inicio?: string; fim?: string; local?: string; presentes?: number; habilitados_presentes?: number; universo?: number | null
  pastores_presentes?: number; regentes_presentes?: number; regentes_exercicio?: number
}
export interface DadosReuniao {
  modelo_reuniao_id?: string; modelo_reuniao?: Omit<ModeloReuniao,'id'>; primeira_reuniao_id?: string | null
  formato?: 'Presencial' | 'Virtual' | 'Híbrida'; carater?: 'Regular' | 'Urgente'; convocacao?: 'Primeira' | 'Segunda'
  total_presentes?: number | null; local_efetivo?: string
  horario_previsto?: string
  situacao?: keyof typeof situacoesReuniao
  restrito: boolean; modalidade: ModalidadeReuniao; data: string; local: string; inicio: string | null; fim: string | null; pauta: string; competencia: string
  universo_informado: number; quorum_minimo: number; quorum_conferido: boolean; fundamento_quorum: string; resultado: string; participantes: Participante[]
}
export interface EnderecoLocal {
  endereco_logradouro: string; endereco_numero: string; endereco_complemento: string; endereco_bairro: string
  endereco_cep: string; endereco_cidade: string; endereco_uf: string; endereco_extenso: string; endereco_declarativo: string
}
export interface LocalReuniao extends EnderecoLocal {
  id: string; revisao: number; descritivo: string; extenso_personalizado: string; declarativo_personalizado: string
}
export interface ReuniaoSecretaria {
  instalacao_formal?: boolean
  mesa_atual_id?: string | null
  contexto_id?: string
  local_efetivo_id?: string | null
  local_efetivo_retrato?: (EnderecoLocal & { descritivo: string }) | null
  convocacao_em_curso?: { documento_id: string; versao_id: string; pode_editar: boolean } | null
  convocacoes?: { documento_id: string; versao_id: string; versao: number; assunto: string; agendamento_alterado: boolean | null }[]
  horario_inicio_reuniao?: string | null; horario_inicio_reuniao_por_extenso?: string | null; horario_encerramento_reuniao?: string | null; horario_encerramento_reuniao_por_extenso?: string | null; dia_reuniao_por_extenso?: string; mes_reuniao_por_extenso?: string; ano_reuniao_por_extenso?: string; local_id?: string | null; local_retrato?: (EnderecoLocal & { descritivo: string }) | null; itens_pauta?: ItemPauta[]; id: string; revisao: number; data: string; modalidade: ModalidadeReuniao; dados: DadosReuniao; participantes: (Participante & { retrato: { nome: string } })[] }
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
  item_pauta_id?: string | null
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
export interface PreviaAbertura {
  versao: VersaoInput
  conferencia: string
  preparador: { pessoa_id: string; nome: string } | null
  secretario: { pessoa_id: string; nome: string } | null
  presidente: { pessoa_id: string; nome: string } | null
  pendencias: string[]
}
export interface VersaoInput { atualizar_fontes?: string; confirmar_troca_origem?: boolean; confirmar_troca_livro?: boolean; resolucoes?: ResolucaoInput[]; modelo_versao_id: string; livro_id?: string | null; reuniao_id: string | null; motivador_id: string | null; assunto: string; data_documento: string; conteudo: { efetivos?: EfetivosAta; planejamento_origem?: string; redator_ata?: { pessoa_id: string; nome?: string } | null; antecedente?: Antecedente; valores?: Valores; teor: string; campos: Record<string, string>; arrolados: Arrolado[]; anexos: { arquivo_id: string; nome: string }[]; estrutura?: EstruturaDocumento; composicao?: PaginaTexto } }
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
export type EdicaoAtaLegada = Pick<AtaLegadaInput, 'numero_original' | 'assunto' | 'data_documento' |
  'reuniao_id' | 'reuniao' | 'teor' | 'arrolados' | 'resolucoes'> & { revisao: number; idempotencia: string; reatribuicao_atos?: ReatribuicaoAtos }

export interface DocumentoVersao extends Omit<VersaoInput, 'resolucoes' | 'modelo_versao_id'> {
  livro?: Pick<LivroResumo, 'perfil'> | null
  resolucoes?: ResolucaoDocumento[]
  id: string; numero: number; revisao_conteudo: number; congelado_em: string | null; retifica_versao_id: string | null; modelo: ModeloVersao | null
  modelo_versao_id: string | null; numero_original?: string | null; folhas_legadas?: string | null
  fonte_congelada: { reuniao?: ReuniaoSecretaria | null; igreja?: { nome: string }; contexto: { nome: string }; numero: string | null; registro_livro?: Pick<RegistroLivro, 'ordem' | 'posicao_inicio' | 'posicao_fim' | 'numero_visivel_inicio'> & { numero_livro: number; serie_livro: string }; arrolados?: { pessoa_id: string; retrato: { nome: string; cargo: { nome: string } | null; cargos?: { id: string; nome: string }[] } }[]; legado?: { autoridade: string; evidencia: string; conferido_em: string; operador: string; arquivo_id: string; sha256: string; reuniao: ReuniaoLegada } } | null
  arrolados: (Arrolado & { retrato: { nome: string; fundamento?: string; cargo: { nome: string } | null; cargos?: { id: string; nome: string }[] } })[]
  anexos: { arquivo_id: string; nome: string; arquivo: { sha256: string; tamanho: number } }[]
  deliberacoes: { mesa?: { ordem: number; presidente_nome: string; secretario_nome: string } | null; resultado: string; data: string; autoridade: string; evidencia: string; revisao_conteudo: number }[]
}
export interface DocumentoResumo { criado_em?: string; identificacao_livro?: string | null; modelo_nome?: string | null; id: string; revisao: number; estado: 'EM_EDICAO' | 'APROVADO' | 'EXPEDIDO' | 'CANCELADO' | 'ANULADO' | 'LEGADA_CONFERIDA'; versao_atual: number; restrito: boolean; tipo: string; numero: number | null; ano: number | null; sigla: string | null; encaminhado_em: string | null; versoes: { id: string; numero: number; assunto: string; data_documento: string; numero_original?: string | null }[] }
export const estadosDocumento: Record<DocumentoResumo['estado'], string> = {
  EM_EDICAO: 'Em edição', APROVADO: 'Aprovado', EXPEDIDO: 'Expedido', CANCELADO: 'Cancelado', ANULADO: 'Anulado',
  LEGADA_CONFERIDA: 'Ata legada conferida',
}
export interface PendenciaTramitacao { destino: string; mensagem: string }
export interface DocumentoDetalhe extends Omit<DocumentoResumo, 'versoes'> {
  atuacao?: PermissoesModelo
  sugestoes_arrolados?: Arrolado[]
  tramitacao?: { pendencias: PendenciaTramitacao[]; data_futura: boolean; livros: boolean; assinaturas: boolean }
  contexto_id: string; versoes: DocumentoVersao[] }
export interface ResultadoSecretaria { id: string; estado?: string; revisao?: number; versao_id?: string }
export interface ArtefatoDocumento {
  id: string; versao_id: string; revisao_documento: number; finalidade: 'RASCUNHO' | 'MATRIZ_APROVADA' | 'MEDICAO_LIVRO'; paginas_medidas?: number | null;
  estado: 'PENDENTE' | 'PROCESSANDO' | 'CONCLUIDO' | 'FALHOU' | 'OBSOLETO'; sha256: string | null; tamanho: number | null;
}
export interface CompetenciaSecretaria { pode_instalar_mesa?: boolean; id: string; contexto_id: string; inicio: string; fim: string | null; pode_aprovar: boolean; pode_deliberar: boolean; pode_consultar_restritos: boolean; titular: { nome_usuario: string }; autoridade: string; evidencia: string }
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
  contexto_id: string
  fonte_normativa: string; capacidade_faces: number; reserva_exame: number
  motivo_encerramento: string | null; manifesto_sha256: string | null; arquivo_historico_id: string | null; data_historica: string | null
  aberto_em: string | null; encerrado_em: string | null
  totais: { paginas_utilizadas: number; folhas_utilizadas: number; saldo_folhas: number; saldo_faces: number; total_atas: number; pendencias: number; ultima_posicao: number } | null
  registros: RegistroLivro[]
  numeros_cancelados?: { numero: number; cancelada_em: string; motivo: string }[]
  atas_pendentes?: { documento_id: string; numero: number; assunto: string }[]
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
export const nomeLivro = (livro: LivroResumo) => {
  const series: Record<string, string> = { ATA_PADRAO: 'Atas', ATA_ASSEMBLEIA: 'Atas da Assembleia' }
  return `Livro nº ${livro.numero} · ${series[livro.serie] ?? livro.serie}`
}

const base = 'secretaria'
export const secretariaApi = {
  modelosReuniao: (contexto: string) => apiClient.get<ModeloReuniao[]>(`${base}/contextos/${contexto}/modelos-reuniao`),
  salvarModeloReuniao: (contexto: string,dados: unknown) => apiClient.post<ModeloReuniao>(`${base}/contextos/${contexto}/modelos-reuniao`,dados),
  opcoesOrgaos: ()=>apiClient.get<{id:string;nome:string}[]>(base+'/modelos-reuniao/orgaos-participantes'),
  primeirasConvocacoes: (contexto: string,modelo: string) => apiClient.get<{id:string;data:string;horario?:string;pauta:string}[]>(`${base}/contextos/${contexto}/primeiras-convocacoes?modelo=${modelo}`),
  camposBiblioteca: () => apiClient.get<CampoIgreja[]>(`${base}/campos`),
  criarCampo: (dados: unknown) => apiClient.post<CampoIgreja>(`${base}/campos`, dados),
  editarCampo: (id: string, dados: unknown) => apiClient.patch<CampoIgreja>(`${base}/campos/${id}`, dados),
  reuniao: (id: string) => apiClient.get<ReuniaoSecretaria>(`secretaria/reunioes/${encodeURIComponent(id)}`),
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
  previaAbertura: (livro: string, modelo: string, acao: 'criar' | 'preparar', data?: string) =>
    apiClient.post<PreviaAbertura>(`${base}/livros/${livro}/previa-abertura`, { modelo_versao_id: modelo, acao, data }),
  previaEncerramento: (livro: string, modelo: string, acao: 'criar' | 'preparar', data?: string) =>
    apiClient.post<{ versao: VersaoInput }>(`${base}/livros/${livro}/previa-encerramento`, { modelo_versao_id: modelo, acao, data }),
  criarLivro: (d: unknown) => apiClient.post<ResultadoSecretaria>(`${base}/livros`, d),
  importarLivro: (d: unknown) => apiClient.post<ResultadoSecretaria>(`${base}/livros/importar`, d),
  acaoLivro: (id: string, acao: AcaoLivro, d: unknown) => apiClient.post<ResultadoSecretaria>(`${base}/livros/${id}/acoes/${acao}`, d),
  selecaoComplementos: (livro: string, filtros: Record<string, string>) =>
    apiClient.get<PaginaSelecao>(`${base}/livros/${livro}/complementos/selecao?${new URLSearchParams(filtros)}`),
  previaOrigem: (d: { modelo_versao_id: string; origem_id: string; reuniao_id?: string; restrito: boolean; excluir?: string }) =>
    apiClient.post<PreviaOrigem>(`${base}/antecedentes/previa`, d),
  selecaoMotivadores: (filtros: Record<string, string>) =>
    apiClient.get<PaginaSelecao>(`${base}/motivadores?${new URLSearchParams(filtros)}`),
  candidatosComplemento: (id: string, pagina: number) => apiClient.get<{ id: string; assunto: string; numero: number }[]>(`${base}/livros/${id}/complementos/candidatos?pagina=${pagina}`),
  complementarLivro: (id: string, d: unknown) => apiClient.post<ResultadoSecretaria>(`${base}/livros/${id}/complementos`, d),
  arquivoRegistroUrl: (livro: string, registro: string) => `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/${base}/livros/${livro}/registros/${registro}/arquivo`,
  arquivoLivroUrl: (id: string, tipo: 'historico' | 'manifesto' | 'compilacao') => `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/${base}/livros/${id}/arquivos/${tipo}`,
  medirLivro: (id: string, revisao: number) => apiClient.post<ArtefatoDocumento>(`${base}/documentos/${id}/medicao-livro`, { revisao }),
  papeisModelo: (c: string) => apiClient.get<PapelModelo[]>(`${base}/contextos/${c}/papeis-modelo`),
  pessoasDoContexto: (c: string) => apiClient.get<{ id: string; nome_completo: string }[]>(`${base}/contextos/${c}/pessoas`),
  cargos: (c: string) => apiClient.get<{ id: string; nome: string }[]>(`${base}/contextos/${c}/cargos`),
  contextos: () => apiClient.get<ContextoSecretaria[]>(`${base}/contextos`),
  competencias: () => apiClient.get<CompetenciaSecretaria[]>(`${base}/competencias`),
  modelos: (c: string) => apiClient.get<ModeloDocumento[]>(`${base}/modelos?contexto=${encodeURIComponent(c)}`),
  reunioes: (c: string, p = 0) => apiClient.get<ReuniaoSecretaria[]>(`${base}/reunioes?contexto=${encodeURIComponent(c)}&pagina=${p}`),
  consultarDocumentos: (filtros: URLSearchParams) => apiClient.get<{ itens: DocumentoResumo[]; tem_proxima: boolean }>(`${base}/documentos/consulta?${filtros}`),
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
  iniciarEdicaoModelo: (id: string, d: unknown) => apiClient.post<ResultadoSecretaria>(`${base}/modelos/${id}/editar`, d),
  salvarRascunhoModelo: (id: string, d: unknown) => apiClient.patch<ResultadoSecretaria>(`${base}/modelos/${id}/rascunho`, d),
  publicarModelo: (id: string, d: unknown) => apiClient.post<ResultadoSecretaria>(`${base}/modelos/${id}/publicar`, d),
  versionarModelo: (id: string, d: unknown) => apiClient.post<ResultadoSecretaria>(`${base}/modelos/${id}/versoes`, d),
  locais: () => apiClient.get<LocalReuniao[]>(`${base}/locais`),
  criarLocal: (d: unknown) => apiClient.post<ResultadoSecretaria>(`${base}/locais`, d),
  editarLocal: (id: string, d: unknown) => apiClient.patch<ResultadoSecretaria>(`${base}/locais/${encodeURIComponent(id)}`, d),
  criarReuniao: (d: unknown) => apiClient.post<ResultadoSecretaria>(`${base}/reunioes`, d),
  editarReuniao: (id: string, d: unknown) => apiClient.patch<ResultadoSecretaria>(`${base}/reunioes/${id}`, d),
  previaFontes: (id: string, versao: VersaoInput, revisao: number) => apiClient.post<{ assinatura: string; valores: Valores; planejamento_origem?: string }>(`secretaria/documentos/${id}/previa-fontes`, { versao, revisao }),
  criarDocumento: (d: unknown) => apiClient.post<ResultadoSecretaria>(`${base}/documentos`, d),
  criarAtaLegada: (d: AtaLegadaInput & { idempotencia: string }) => apiClient.post<ResultadoSecretaria>(`${base}/atas-legadas`, d),
  editarAtaLegada: (id: string, d: EdicaoAtaLegada) => apiClient.patch<ResultadoSecretaria>(`${base}/atas-legadas/${id}`, d),
  extrairTeorLegado: (d: { contexto_id: string; arquivo_id: string }) => apiClient.post<{ teor: string }>(`${base}/atas-legadas/teor`, d),
  vincularLivroLegado: (id: string, d: { idempotencia: string; revisao: number; livro_id: string | null; folhas: string | null; autoridade: string; evidencia: string }) =>
    apiClient.post<ResultadoSecretaria>(`${base}/atas-legadas/${id}/livro`, d),
  editarDocumento: (id: string, d: unknown) => apiClient.patch<ResultadoSecretaria>(`${base}/documentos/${id}`, d),
  comando: (id: string, acao: string, d: unknown) => apiClient.post<ResultadoSecretaria>(`${base}/documentos/${id}/${acao}`, d),
  logoParaDocumento: async (signal: AbortSignal) => {
    const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/${base}/logo-da-igreja`, { credentials: 'include', signal })
    if (res.status === 404) throw new Error('Esta igreja não tem um logo disponível. Escolha um arquivo.')
    if (!res.ok) throw new Error('Não foi possível carregar o logo da igreja.')
    const blob = await res.blob()
    return new File([blob], 'logo.' + blob.type.split('/')[1], { type: blob.type })
  },
  enviarImagem: async (file: File, chave: string, signal: AbortSignal) => {
    const body = new FormData()
    body.append('file', file)
    body.append('idempotencia', chave)
    const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/${base}/imagens`, { method: 'POST', credentials: 'include', headers: { 'X-Provisao-Request': '1' }, body, signal })
    if (!res.ok) throw new Error('Falha ao enviar a imagem. Confira o arquivo e tente novamente.')
    return res.json() as Promise<{ id: string }>
  },
  upload: async (file: File) => {
    const body = new FormData(); body.append('file', file)
    const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/arquivos-privados`, { method: 'POST', credentials: 'include', headers: { 'X-Provisao-Request': '1' }, body })
    if (!res.ok) throw new Error('Não foi possível enviar o anexo privado (limite de 10 MB).')
    return res.json() as Promise<{ id: string; tamanho: number }>
  },
  imagemModeloUrl: (versao: string, arquivo: string, rascunho = false) => `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/${base}/modelos/${rascunho ? versao+'/rascunho' : 'versoes/'+versao}/imagens/${arquivo}`,
  anexoUrl: (doc: string, versao: string, arquivo: string) => `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/${base}/documentos/${doc}/versoes/${versao}/anexos/${arquivo}`,
}
export function numeroDocumento(d: Pick<DocumentoResumo, 'numero' | 'ano' | 'sigla'> & Partial<Pick<DocumentoResumo, 'estado' | 'versoes' | 'versao_atual' | 'identificacao_livro'>>) {
  if (d.estado === 'LEGADA_CONFERIDA') return d.versoes?.find(v => v.numero === d.versao_atual)?.numero_original ?? 'Sem número no original'
  if (d.identificacao_livro) return d.identificacao_livro
  return d.numero ? `${String(d.numero).padStart(3, '0')}/${d.ano}/${d.sigla}` : 'Sem número reservado'
}
