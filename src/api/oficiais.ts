export type BloqueioOrgao = { bloqueia: boolean; participacoes: number; ocupacoes: number; rol_alterado?: number; rol_preservado?: number; rol_indeterminado?: number; detalhes?: { id: string; inicio: string; tipo: 'PARTICIPACAO' | 'OCUPACAO'; orgao: string; cargo: string | null; comparacao_rol: 'ALTERADO' | 'PRESERVADO' | 'INDETERMINADO' }[]; detalhes_limitados?: boolean }
import { apiClient } from './client'

export interface OficialResumo { id: string; tipo: 'DIACONO' | 'PRESBITERO_REGENTE' | 'PRESBITERO_DOCENTE'; ativo: boolean; pessoa: { id: string; nome_completo: string } }
export interface PaginaOficiais { itens: OficialResumo[]; proximo_cursor: string | null }
export interface ExercicioOficial { situacao: 'EM_EXERCICIO' | 'FORA_DE_EXERCICIO' | 'INDETERMINADA'; data_referencia: string; revisao_pendente?: boolean }
export interface AlertaOficial { id: string; data_alerta: string; natureza: 'ENCERRAMENTO_REGISTRADO' | 'TERMINO_PREVISTO'; oficial: { tipo: OficialResumo['tipo']; pessoa: { nome_completo: string } } }
export type OficioEletivo = 'DIACONO' | 'PRESBITERO_REGENTE'
export interface AtaDeEleicao { versao_id: string; documento_id: string; data: string; assunto: string; numero: string | null }
export interface IndicacaoEleitoral { id: string; oficio: OficioEletivo; data_assembleia: string; pessoa: { nome_completo: string } }
export interface NovaIndicacao { pessoa_id: string; oficio: OficioEletivo; ata_conselho_versao_id: string; data_assembleia: string }
export interface MandatoPorIndicacao { indicacao_id: string; ata_assembleia_versao_id: string; data_posse: string }
export interface PeriodosOficial { mandatos: { id: string; data_eleicao: string; data_posse: string; termino_previsto: string; termino_efetivo: string | null; revisao_pendente?: boolean }[]; vinculos: { id: string; modalidade: string; concilio: string; data_inicio: string; data_fim: string | null; exercicio_institucional: boolean }[] }
export interface AcessoSensivel { pode_consultar: boolean; pode_registrar: boolean }
export interface ConcessaoSensivel extends AcessoSensivel { id: string; usuario_id: string; fundamento: string; concedido_em: string; revogado_em: string | null; usuario: { nome_usuario: string } }
export interface EventoSensivel { id: string; tipo: 'LICENCA' | 'SUSPENSAO' | 'DISPONIBILIDADE' | 'RESTAURACAO' | 'DEPOSICAO'; data_efeito: string; ordem: number; autoridade: string; evidencia: string; observacoes: string | null; evento_restaurado_id: string | null; registrado_por?: { nome: string; data: string } | null }
export interface AcervoHistorico { id: string; tipo: 'ELEICAO' | 'POSSE' | 'ORDENACAO' | 'VINCULO_PASTORAL' | 'FIM_EXERCICIO'; data_evento: string | null; situacao_documental: 'PENDENTE' | 'EXTERNO_CONFERIDO'; criado_em: string }
export interface DetalheAcervo extends AcervoHistorico { data_descricao: string | null; referencia_externa: string | null; autoridade: string | null; criado_por: { nome_usuario: string } }
export interface EventoCorrecao { id: string; tipo_evento: string; data_evento: string; ordem_dia: number | null; rol: string }
export interface PreviaCorrecao { pessoa_id?: string; bloqueio_orgao?: BloqueioOrgao; origens_invalidadas?: string[]; hash: string; data_anterior: string; data_nova: string; bloqueada: boolean; observacao: string; mandatos: { id: string; eleicao: string; posse: string; rol_eleicao_antes: string; rol_eleicao_depois: string; rol_posse_antes: string; rol_posse_depois: string }[]; conferencias: { id: string; data_eleicao: string; rol_antes: string; rol_depois: string }[] }
export interface CorrecaoRegistrada { id: string; data_anterior: string; data_nova: string; justificativa: string; autoridade: string; evidencia: string; criado_em: string; criado_por: { nome_usuario: string }; impacto: PreviaCorrecao }
export interface IdentidadePastoralLocal { referencia: { id: string; criado_em: string } | null }
export interface PoliticaAlertas { ativo: boolean; dias_antecedencia: number; dias_apos_termino: number; fuso_iana: string; autoridade: string; fundamento: string; atualizado_em: string }
export interface ConfiguracaoAlertas { politica: PoliticaAlertas | null; destinatarios: { id: string; usuario_id: string; usuario: { nome_usuario: string; ativo: boolean; perfil: string } }[]; execucao: { ultima_tentativa: string; ultimo_sucesso: string | null; ultimo_erro: string | null; ultimo_total_criado: number } | null }
export interface NotificacaoMandato { id: string; nome: string; tipo: string; data_termino: string; lido_em: string | null }
export interface ItemOrdem { evento_id: string; ordem_anterior: number | null; ordem_nova: number }
export interface PreviaOrdem { pessoa_id?: string; bloqueio_orgao?: BloqueioOrgao; hash: string; data_evento: string; itens: ItemOrdem[]; bloqueada: boolean; observacao: string; inconsistencias_rol_origem: string[]; mandatos: { id: string; eleicao: string; posse: string; rol_eleicao_antes: string; rol_eleicao_depois: string; rol_posse_antes: string; rol_posse_depois: string }[] }
export interface OrdenacaoRegistrada { id: string; data_evento: string; justificativa: string; autoridade: string; evidencia: string; criado_por: { nome_usuario: string }; impacto: PreviaOrdem }
export interface PropostaInsercao { data_evento: string; ordem_dia?: number | null; tipo_evento: string; rol: string; motivacao_evento: string; igreja_origem: string | null; igreja_destino: string | null; observacoes: string | null }
export interface PreviaInsercao { bloqueio_orgao?: BloqueioOrgao; hash: string; bloqueada: boolean; origem_seguinte_invalida: boolean; observacao: string; mandatos: { id: string; eleicao: string; posse: string; rol_eleicao_antes: string; rol_eleicao_depois: string; rol_posse_antes: string; rol_posse_depois: string }[]; conferencias: { id: string; data_eleicao: string; rol_antes: string; rol_depois: string }[] }
export interface InsercaoRegistrada { id: string; data_evento: string; justificativa: string; autoridade: string; evidencia: string; criado_por: { nome_usuario: string } }
export interface PropostaConteudo { evento_id: string; tipo_evento: string; rol: string; motivacao_evento: string }
export interface DetalheConteudo { tipo_evento: string; rol: string; rol_origem: string | null; motivacao_evento: string }
export interface PreviaConteudo { bloqueio_orgao?: BloqueioOrgao; origem_seguinte_invalida: boolean; hash: string; data_evento: string; dados_anteriores: DetalheConteudo; dados_novos: DetalheConteudo; bloqueada: boolean; observacao: string; mandatos: { id: string; eleicao: string; posse: string; rol_eleicao_antes: string; rol_eleicao_depois: string; rol_posse_antes: string; rol_posse_depois: string }[]; conferencias: { id: string; data_eleicao: string; evento_corrigido_utilizado: boolean; rol_antes: string; rol_depois: string }[] }
export interface CorrecaoConteudoRegistrada { id: string; evento_id: string; dados_anteriores: DetalheConteudo; dados_novos: DetalheConteudo; justificativa: string; autoridade: string; evidencia: string; criado_por: { nome_usuario: string } }
export interface PropostaOficialRetroativa { tipo: string; data_efeito: string; ordem: number; autoridade: string; evidencia: string; observacoes: string | null; evento_restaurado_id: string | null }
export interface PreviaOficialRetroativa { hash: string; proposta: PropostaOficialRetroativa; bloqueada: boolean; posse_invalida: boolean; observacao: string; alteracoes: { id: string; tipo: string; data: string; antes: { em_exercicio: boolean; motivo: string }; depois: { em_exercicio: boolean; motivo: string } }[] }
export interface InclusaoOficialRegistrada { id: string; justificativa: string; criado_em: string; criado_por: { nome_usuario: string }; impacto: PreviaOficialRetroativa }
export interface RevisaoEleitoral { id: string; operacao: string; hash_previa: string; autoridade: string; evidencia: string; justificativa: string; criado_em: string; aplicado_em: string | null; criado_por: { nome_usuario: string }; itens: { id: string; conferencia_id: string | null; mandato_id: string | null; revisado_em: string | null; autoridade_revisao: string | null; evidencia_revisao: string | null; conclusao_revisao: string | null; permite_reutilizacao: boolean | null; revisado_por: { nome_usuario: string } | null }[] }
export const oficiaisApi = {
  concluirRevisaoEleitoral: (id: string, dados: unknown) => apiClient.post<unknown>(`oficiais/revisoes-eleitorais/${encodeURIComponent(id)}/concluir`, dados),
  revisoesEleitorais: (pessoaId: string) => apiClient.get<RevisaoEleitoral[]>(`oficiais/pessoas/${encodeURIComponent(pessoaId)}/revisoes-eleitorais`),
  registrarDecisaoEleitoral: (pessoaId: string, dados: unknown) => apiClient.post<{ id: string }>(`oficiais/pessoas/${encodeURIComponent(pessoaId)}/revisoes-eleitorais`, dados),
  insercoesOficial: (id: string) => apiClient.get<InclusaoOficialRegistrada[]>(`oficiais/${encodeURIComponent(id)}/insercoes-retroativas`),
  previaInsercaoOficial: (id: string, dados: PropostaOficialRetroativa) => apiClient.post<PreviaOficialRetroativa>(`oficiais/${encodeURIComponent(id)}/insercoes-retroativas/previa`, dados),
  aplicarInsercaoOficial: (id: string, dados: unknown) => apiClient.post<unknown>(`oficiais/${encodeURIComponent(id)}/insercoes-retroativas/aplicar`, dados),
  correcoesConteudo: (id: string) => apiClient.get<CorrecaoConteudoRegistrada[]>(`oficiais/pessoas/${encodeURIComponent(id)}/correcoes-conteudo`),
  previaConteudo: (id: string, dados: PropostaConteudo) => apiClient.post<PreviaConteudo>(`oficiais/pessoas/${encodeURIComponent(id)}/correcoes-conteudo/previa`, dados),
  aplicarConteudo: (id: string, dados: unknown) => apiClient.post<unknown>(`oficiais/pessoas/${encodeURIComponent(id)}/correcoes-conteudo/aplicar`, dados),
  insercoesRetroativas: (id: string) => apiClient.get<InsercaoRegistrada[]>(`oficiais/pessoas/${encodeURIComponent(id)}/insercoes-retroativas`),
  previaInsercao: (id: string, dados: PropostaInsercao) => apiClient.post<PreviaInsercao>(`oficiais/pessoas/${encodeURIComponent(id)}/insercoes-retroativas/previa`, dados),
  aplicarInsercao: (id: string, dados: unknown) => apiClient.post<unknown>(`oficiais/pessoas/${encodeURIComponent(id)}/insercoes-retroativas/aplicar`, dados),
  ordenacoes: (id: string, porPessoa = false) => apiClient.get<OrdenacaoRegistrada[]>(`oficiais/${porPessoa ? 'pessoas/' : ''}${encodeURIComponent(id)}/ordenacoes-dia`),
  previaOrdenacao: (id: string, dados: { data_evento: string; itens: { evento_id: string; ordem: number }[] }, porPessoa = false) => apiClient.post<PreviaOrdem>(`oficiais/${porPessoa ? 'pessoas/' : ''}${encodeURIComponent(id)}/ordenacoes-dia/previa`, dados),
  aplicarOrdenacao: (id: string, dados: unknown, porPessoa = false) => apiClient.post<unknown>(`oficiais/${porPessoa ? 'pessoas/' : ''}${encodeURIComponent(id)}/ordenacoes-dia/aplicar`, dados),
  notificacoes: () => apiClient.get<NotificacaoMandato[]>('oficiais/notificacoes'),
  marcarNotificacao: (id: string) => apiClient.patch<unknown>(`oficiais/notificacoes/${encodeURIComponent(id)}/lida`, {}),
  configuracaoAlertas: () => apiClient.get<ConfiguracaoAlertas>('oficiais/configuracao-alertas'),
  configurarAlertas: (dados: Omit<PoliticaAlertas, 'atualizado_em'>) => apiClient.post<unknown>('oficiais/configuracao-alertas', dados),
  adicionarDestinatario: (usuario_id: string) => apiClient.post<unknown>('oficiais/destinatarios-alertas', { usuario_id }),
  removerDestinatario: (id: string) => apiClient.patch<unknown>(`oficiais/destinatarios-alertas/${encodeURIComponent(id)}/remover`, {}),
  identidadePastoral: (id: string) => apiClient.get<IdentidadePastoralLocal>(`oficiais/${encodeURIComponent(id)}/identidade-pastoral`),
  convidarIdentidade: (id: string, dados: { destino_igreja_id: string; autoridade: string; evidencia: string }) => apiClient.post<{ codigo: string; expira_em: string }>(`oficiais/${encodeURIComponent(id)}/identidade-pastoral/convites`, dados),
  receberIdentidade: (id: string, dados: { codigo: string; autoridade: string; evidencia: string }) => apiClient.post<{ id: string }>(`oficiais/${encodeURIComponent(id)}/identidade-pastoral/receber`, dados),
  revogarIdentidade: (id: string, motivo: string) => apiClient.patch<{ revogada: boolean }>(`oficiais/${encodeURIComponent(id)}/identidade-pastoral/revogar`, { motivo }),
  correcoes: (id: string, porPessoa = false) => apiClient.get<CorrecaoRegistrada[]>(`oficiais/${porPessoa ? 'pessoas/' : ''}${encodeURIComponent(id)}/correcoes-data`),
  eventosParaCorrecao: (id: string, porPessoa = false) => apiClient.get<EventoCorrecao[]>(porPessoa ? `oficiais/pessoas/${encodeURIComponent(id)}/eventos-para-ordem` : `oficiais/${encodeURIComponent(id)}/membresia-para-correcao`),
  previaCorrecao: (id: string, dados: { evento_id: string; nova_data: string }, porPessoa = false) => apiClient.post<PreviaCorrecao>(`oficiais/${porPessoa ? 'pessoas/' : ''}${encodeURIComponent(id)}/correcoes-data/previa`, dados),
  aplicarCorrecao: (id: string, dados: unknown, porPessoa = false) => apiClient.post<unknown>(`oficiais/${porPessoa ? 'pessoas/' : ''}${encodeURIComponent(id)}/correcoes-data/aplicar`, dados),
  acervo: (id: string) => apiClient.get<AcervoHistorico[]>(`oficiais/${encodeURIComponent(id)}/acervo-historico`),
  detalheAcervo: (id: string) => apiClient.get<DetalheAcervo>(`oficiais/acervo-historico/${encodeURIComponent(id)}/detalhe`),
  meuAcesso: () => apiClient.get<AcessoSensivel>('oficiais/meu-acesso-sensivel'),
  acessos: () => apiClient.get<ConcessaoSensivel[]>('oficiais/acessos-sensiveis'),
  concederAcesso: (dados: { usuario_id: string; pode_consultar: boolean; pode_registrar: boolean; fundamento: string }) => apiClient.post<ConcessaoSensivel>('oficiais/acessos-sensiveis', dados),
  revogarAcesso: (id: string, motivo: string) => apiClient.patch<unknown>(`oficiais/acessos-sensiveis/${encodeURIComponent(id)}/revogar`, { motivo }),
  eventosSensiveis: (id: string) => apiClient.get<EventoSensivel[]>(`oficiais/${encodeURIComponent(id)}/eventos-sensiveis`),
  atasDeEleicao: (tipo: 'CONSELHO' | 'ASSEMBLEIA', busca: string) =>
    apiClient.get<AtaDeEleicao[]>(`oficiais/indicacoes/atas?${new URLSearchParams({ tipo, busca })}`),
  candidatos: (ata: string, busca: string) =>
    apiClient.get<{ id: string; nome_completo: string }[]>(`oficiais/indicacoes/candidatos?${new URLSearchParams({ ata, busca })}`),
  indicacoes: (assembleia?: string) =>
    apiClient.get<IndicacaoEleitoral[]>(`oficiais/indicacoes${assembleia ? `?${new URLSearchParams({ assembleia })}` : ''}`),
  registrarIndicacao: (dados: NovaIndicacao) => apiClient.post<{ id: string }>('oficiais/indicacoes', dados),
  registrarMandatoPorIndicacao: (dados: MandatoPorIndicacao) =>
    apiClient.post<{ id: string; oficial_id: string }>('oficiais/indicacoes/mandatos', dados),
  periodos: (id: string) => apiClient.get<PeriodosOficial>(`oficiais/${encodeURIComponent(id)}/periodos`),
  criarAto: (caminho: string, dados: unknown) => apiClient.post<unknown>(`oficiais/${caminho}`, dados),
  encerrar: (caminho: string, dados: unknown) => apiClient.patch<unknown>(`oficiais/${caminho}`, dados),
  cadastrar: (dados: { pessoa_id: string; tipo: OficialResumo['tipo']; ativo?: boolean }) => apiClient.post<{ id: string }>('oficiais', dados),
  alterarSituacao: ({ id, ativo }: { id: string; ativo: boolean }) =>
    apiClient.patch<{ id: string; ativo: boolean }>(`oficiais/${encodeURIComponent(id)}/situacao`, { ativo }),
  listar: (cursor?: string) => apiClient.get<PaginaOficiais>(`oficiais${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`),
  exercicio: (id: string, data: string) => apiClient.get<ExercicioOficial>(`oficiais/${encodeURIComponent(id)}/exercicio?data=${encodeURIComponent(data)}`),
  alertas: (data: string, dias: number) => apiClient.get<AlertaOficial[]>(`oficiais/alertas?data=${encodeURIComponent(data)}&dias=${dias}`),
}
