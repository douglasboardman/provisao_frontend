vi.mock('../hooks/use-navegacao', () => ({ useNavegacao: () => ({ data: { permissoes: {secretaria:['view'], 'campos-secretaria':['view','create','edit'], 'vinculos-documentais':['view','edit'], pessoas:['view']} }, isPending: false }) }))
import { novaPagina } from '../api/pagina'
import EditorSecretariaPage from '../pages/secretaria/editor/EditorSecretariaPage'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SecretariaPage } from '../pages/secretaria/SecretariaPage'
import { secretariaApi, type ContextoSecretaria, type DocumentoDetalhe, type ModeloDocumento } from '../api/secretaria'
import { pessoasApi } from '../api/pessoas'
import { useAuthStore } from '../stores/auth'
import { Perfil } from '../types/enums'
import { ApiRequestError } from '../api/client'

const contexto: ContextoSecretaria = { id: 'ctx', nome: 'Assembleia Geral', sigla: 'AG', tipo: 'ASSEMBLEIA_GERAL', orgao_id: 'assembleia', orgao: { ativo: true, tipo: 'ASSEMBLEIA_GERAL', constituicao: 'OFICIAL' }, pode_gerir_modelos: true, pode_preparar: true, pode_aprovar: false, pode_deliberar: false, pode_consultar_restritos: false }
const modelo: ModeloDocumento = { id: 'm', nome: 'Carta', revisao: 1, versoes: [{ id: 'mv', numero: 1, tipo: 'OUTRO', finalidade: 'CARTA', configuracao: { perfil: 'CARTA', contexto: 'ASSEMBLEIA_GERAL', tipos_orgao: [], constituicoes: [], motivador: 'OPCIONAL', resolucoes: 'OPCIONAL', registro_livro: false, campos_obrigatorios: [], papeis_obrigatorios: [], cargos_obrigatorios: [] } }] }
function documento(): DocumentoDetalhe { return { id: 'doc', contexto_id: 'ctx', revisao: 1, estado: 'EM_EDICAO', versao_atual: 1, restrito: false, tipo: 'OUTRO', numero: null, ano: null, sigla: null, encaminhado_em: null, versoes: [{ id: 'v1', numero: 1, revisao_conteudo: 1, assunto: 'Carta antiga', data_documento: '2026-01-10', modelo_versao_id: 'mv', reuniao_id: null, motivador_id: null, retifica_versao_id: null, modelo: modelo.versoes[0], congelado_em: null, fonte_congelada: null, conteudo: { teor: 'Conteúdo original', campos: {}, arrolados: [], anexos: [] }, arrolados: [], anexos: [], deliberacoes: [] }] } }
function montar(perfil = Perfil.COMUM, entrada = '/secretaria') {
  useAuthStore.setState({ status: 'ready', user: { sub: 'u', igreja_id: 'i', perfil, username: 'Pessoa', login: 'x' } })
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}><RouterProvider router={createMemoryRouter([
    { path: '/secretaria', element: <SecretariaPage/> },
    { path: '/secretaria/:contextoId/documentos/:documentoId', element: <SecretariaPage/> },
    { path: '/secretaria/:contextoId/editor/:entidade/:id', element: <EditorSecretariaPage/> },
  ], { initialEntries: [entrada] })}/></QueryClientProvider>)
}
async function selecionarContexto() { fireEvent.change(await screen.findByLabelText('Contexto documental'), { target: { value: 'ctx' } }); await screen.findByRole('button', { name: 'Novo documento' }) }
beforeEach(() => {
  vi.spyOn(secretariaApi, 'pessoasDoContexto').mockResolvedValue([{ id: 'p', nome_completo: 'Pessoa da igreja' }] as Awaited<ReturnType<typeof secretariaApi.pessoasDoContexto>>)
  vi.spyOn(secretariaApi, 'historico').mockResolvedValue([])
  vi.spyOn(secretariaApi, 'artefatos').mockResolvedValue([])
  vi.spyOn(secretariaApi, 'contextos').mockResolvedValue([contexto])
  vi.spyOn(secretariaApi, 'modelos').mockResolvedValue([modelo])
  vi.spyOn(secretariaApi, 'reunioes').mockResolvedValue([])
  vi.spyOn(secretariaApi, 'documentos').mockResolvedValue([])
  vi.spyOn(secretariaApi, 'consultarDocumentos').mockResolvedValue({ itens: [], tem_proxima: false })
  vi.spyOn(secretariaApi, 'documento').mockResolvedValue(documento())
  vi.spyOn(secretariaApi, 'cargos').mockResolvedValue([])
  vi.spyOn(pessoasApi, 'list').mockResolvedValue([{ id: 'p', nome_completo: 'Pessoa da igreja' }] as Awaited<ReturnType<typeof pessoasApi.list>>)
})
afterEach(() => { cleanup(); vi.restoreAllMocks() })
describe('Edição de ata legada por atuação institucional', () => {
  function legada() {
    const d = documento()
    d.estado = 'LEGADA_CONFERIDA'
    d.tipo = 'ATA'
    d.versoes[0].modelo = null
    d.versoes[0].modelo_versao_id = null
    return d
  }
  it('exibe a edição para a conta comum habilitada no contexto', async () => {
    vi.mocked(secretariaApi.contextos).mockResolvedValue([{ ...contexto, pode_editar_ata_legada: true }])
    vi.mocked(secretariaApi.documento).mockResolvedValue(legada())
    montar(Perfil.COMUM, '/secretaria/ctx/documentos/doc')
    expect(await screen.findByRole('button', { name: 'Editar ata legada' })).toBeTruthy()
  })
  it('oculta a edição quando a API não reconhece secretaria vigente', async () => {
    vi.mocked(secretariaApi.contextos).mockResolvedValue([{ ...contexto, pode_editar_ata_legada: false }])
    vi.mocked(secretariaApi.documento).mockResolvedValue(legada())
    montar(Perfil.COMUM, '/secretaria/ctx/documentos/doc')
    await screen.findByRole('button', { name: 'Recarregar documento' })
    expect(screen.queryByRole('button', { name: 'Editar ata legada' })).toBeNull()
  })
})

describe('E04: interface da secretaria', () => {
  it('mostra a classificação ao mandatário autorizado e preserva a leitura de atas sem consultas aos demais cadastros', async () => {
    vi.mocked(secretariaApi.contextos).mockResolvedValue([{ ...contexto, somente_atas: true, pode_preparar: false, pode_classificar_ata: true }])
    const ata = { ...documento(), tipo: 'ATA' as const }
    vi.mocked(secretariaApi.documento).mockImplementation(async () => ({ ...ata }))
    const comando = vi.spyOn(secretariaApi, 'comando').mockImplementation(async () => {
      ata.restrito = true
      return { id: ata.id, revisao: ++ata.revisao }
    })
    montar(Perfil.COMUM, '/secretaria/ctx/documentos/doc')
    fireEvent.click(await screen.findByRole('button', { name: 'Restringir ata' }))
    await screen.findByRole('button', { name: 'Retirar restrição da ata' })
    expect(comando).toHaveBeenCalledWith('doc', 'sigilo', expect.objectContaining({ revisao: 1, restrito: true, idempotencia: expect.any(String) }))
    expect(secretariaApi.modelos).not.toHaveBeenCalled()
    expect(secretariaApi.reunioes).not.toHaveBeenCalled()
    expect(pessoasApi.list).not.toHaveBeenCalled()
    cleanup()
    vi.mocked(secretariaApi.contextos).mockResolvedValue([{ ...contexto, pode_consultar_restritos: true, pode_classificar_ata: false }])
    montar(Perfil.ADMINISTRADOR, '/secretaria/ctx/documentos/doc')
    await screen.findByText('Conteúdo original')
    expect(screen.queryByRole('button', { name: 'Retirar restrição da ata' })).toBeNull()
  })
  it('alterna catálogo, campos e consulta sem empilhar o editor nem perder a identificação do modelo', async () => {
    vi.spyOn(secretariaApi, 'camposBiblioteca').mockResolvedValue([])
    const v2 = { ...modelo.versoes[0], id: 'v2', numero: 2 }
    vi.mocked(secretariaApi.modelos).mockResolvedValue([{ ...modelo, versoes: [v2, ...modelo.versoes] }])
    montar()
    fireEvent.click(await screen.findByRole('tab', { name: 'Modelos' }))
    const tabela = await screen.findByRole('table', { name: 'Modelos cadastrados' })
    expect(within(tabela).getAllByRole('row')).toHaveLength(2)
    fireEvent.click(within(tabela).getByRole('button', { name: 'Consultar' }))
    await screen.findByText('Versão publicada 2')
    fireEvent.change(screen.getByLabelText('Versão publicada'), { target: { value: modelo.versoes[0].id } })
    await screen.findByText('Versão publicada 1')
    fireEvent.click(screen.getByRole('button', { name: 'Voltar à Secretaria' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Novo modelo' }))
    const nome = await screen.findByRole('textbox', { name: 'Nome do modelo' })
    fireEvent.change(nome, { target: { value: 'Ata de teste' } })
    fireEvent.click(screen.getByRole('button', { name: 'Prévia' }))
    fireEvent.click(screen.getByRole('button', { name: 'Editar' }))
    expect((nome as HTMLInputElement).value).toBe('Ata de teste')
    fireEvent.click(screen.getByRole('button', { name: 'Voltar à Secretaria' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Continuar editando' }))
    expect((nome as HTMLInputElement).value).toBe('Ata de teste')
    fireEvent.click(screen.getByRole('button', { name: 'Voltar à Secretaria' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Descartar' }))
    await screen.findByRole('table', { name: 'Modelos cadastrados' })
  })
  it('salva e sai somente após a confirmação do servidor, inclusive depois de uma falha', async () => {
    const criar = vi.spyOn(secretariaApi, 'criarModelo').mockRejectedValueOnce(new Error('Servidor indisponível')).mockResolvedValue({ id: 'novo-id', revisao: 1, estado: 'EM_EDICAO' })
    vi.spyOn(secretariaApi, 'camposBiblioteca').mockResolvedValue([])
    montar(Perfil.COMUM, '/secretaria?contexto=ctx&aba=modelos')
    fireEvent.click(await screen.findByRole('button', { name: 'Novo modelo' }))
    const nome = await screen.findByLabelText('Nome do modelo')
    expect(criar).not.toHaveBeenCalled()
    fireEvent.change(nome, { target: { value: 'Minuta' } })
    async function sair() {
      fireEvent.click(await screen.findByRole('button', { name: 'Voltar à Secretaria' }))
      fireEvent.click(await screen.findByRole('button', { name: 'Salvar e sair' }))
    }
    await sair()
    await screen.findByText('Servidor indisponível')
    expect((nome as HTMLInputElement).value).toBe('Minuta')
    await sair()
    await screen.findByRole('table', { name: 'Modelos cadastrados' })
    expect(criar).toHaveBeenCalledTimes(2)
  })
  it('protege a criação por link direto em contexto de leitura', async () => {
    vi.mocked(secretariaApi.contextos).mockResolvedValue([{ ...contexto, pode_preparar: false }])
    montar(Perfil.AUDITOR, '/secretaria/ctx/editor/documentos/novo')
    await screen.findByText('Você não tem permissão para editar neste contexto.')
    expect(secretariaApi.modelos).not.toHaveBeenCalled()
    expect(pessoasApi.list).not.toHaveBeenCalled()
  })
  it('preserva a consulta no contexto inativo e bloqueia criação por link direto para o administrador', async () => {
    vi.mocked(secretariaApi.contextos).mockResolvedValue([{ ...contexto, nome: 'SAF', sigla: 'SAF', tipo: 'ORGAO',
      orgao_id: 'sociedade', orgao: { tipo: 'SOCIEDADE_INTERNA', constituicao: 'ELEICAO', ativo: false }, pode_preparar: false }])
    montar(Perfil.ADMINISTRADOR, '/secretaria?contexto=ctx&aba=modelos')
    await screen.findByRole('table', { name: 'Modelos cadastrados' })
    expect(screen.queryByRole('button', { name: 'Novo modelo' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Consultar' })).toBeTruthy()
    cleanup()
    montar(Perfil.ADMINISTRADOR, '/secretaria/ctx/editor/modelos/novo')
    await screen.findByText('Você não tem permissão para editar neste contexto.')
  })
  it('seleciona, remove e exige um campo da biblioteca antes de editar o texto', async () => {
    const campo = { id: 'campo-data', codigo: null, nome: 'Data prevista', tipo: 'data', origem: 'manual', ativo: true, revisao: 1, multiplo: false } as const
    vi.spyOn(secretariaApi, 'camposBiblioteca').mockResolvedValue([campo])
    const salvar = vi.spyOn(secretariaApi, 'criarModelo').mockResolvedValue({ id: 'm2', revisao: 1, estado: 'EM_EDICAO' })
    montar()
    fireEvent.click(await screen.findByRole('tab', { name: 'Modelos' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Novo modelo' }))
    fireEvent.change(await screen.findByLabelText('Nome do modelo'), { target: { value: 'Ata nova' } })
    fireEvent.click(screen.getByText('Regras', { selector: 'summary' }))
    const busca = screen.getByRole('combobox', { name: 'Pesquisar campo da biblioteca' })
    async function incluir() {
      fireEvent.change(busca, { target: { value: 'prevista' } })
      fireEvent.click(await screen.findByRole('option', { name: campo.nome }))
      fireEvent.click(screen.getByRole('button', { name: 'Incluir' }))
    }
    await incluir()
    fireEvent.click(screen.getByRole('button', { name: 'Remover Data prevista' }))
    expect(screen.queryByRole('cell', { name: campo.nome })).toBeNull()
    await incluir()
    fireEvent.click(within(screen.getByRole('group', { name: 'Resoluções' })).getByRole('radio', { name: 'Não se aplica' }))
    fireEvent.click(screen.getByRole('button', { name: 'Salvar rascunho' }))
    await waitFor(() => expect(salvar).toHaveBeenCalledWith(expect.objectContaining({
      configuracao: expect.objectContaining({ obrigatorios_biblioteca: [campo.id], campos_obrigatorios: [], resolucoes: 'NAO_PERMITE' }),
    })))
  })
  it('consulta a reunião pela linha correspondente com permissão de leitura', async () => {
    vi.mocked(secretariaApi.contextos).mockResolvedValue([{ ...contexto, pode_preparar: false }])
    vi.mocked(secretariaApi.reunioes).mockResolvedValue(['Templo', 'Salão'].map((local, i) => ({
      id: 'r' + i, data: '2026-11-22', modalidade: 'AGO', revisao: 1, horario_inicio_reuniao: '19:30', participantes: [],
      dados: { data: '2026-11-22', modalidade: 'AGO', local, restrito: false, inicio: null, fim: null, pauta: 'Pauta do ' + local,
        competencia: '', universo_informado: 0, quorum_minimo: 0, quorum_conferido: false, fundamento_quorum: '', resultado: '', participantes: [] },
    })))
    montar(Perfil.AUDITOR)
    fireEvent.click(await screen.findByRole('tab', { name: 'Reuniões' }))
    const tabela = await screen.findByRole('table', { name: 'Reuniões cadastradas' })
    const linha = within(tabela).getByRole('row', { name: /Salão/ })
    expect(within(linha).getByText('22/11/2026')).toBeTruthy()
    expect(within(linha).getByText('19:30')).toBeTruthy()
    expect(within(tabela).queryByRole('button', { name: 'Editar' })).toBeNull()
    fireEvent.click(within(linha).getByRole('button', { name: 'Consultar' }))
    await screen.findByText('Pauta do Salão')
  })
  it.each(['ficha', 'documentos'])('abre o edital da reunião a partir de %s', async (origem) => {
    const edital = { ...modelo, nome: 'Edital do Conselho', estado: 'PUBLICADO' as const, permissoes: { criar: true, preparar: false },
      versoes: [{ ...modelo.versoes[0], finalidade: 'CONVOCACAO' }] }
    const reuniao = { id: 'reuniao', data: '2027-01-10', modalidade: 'AGO' as const, revisao: 1, participantes: [],
      dados: { data: '2027-01-10', modalidade: 'AGO' as const, situacao: 'AGENDADA' as const, local: 'Salão', restrito: false, inicio: null, fim: null,
        pauta: 'Visitas', competencia: '', universo_informado: 0, quorum_minimo: 0, quorum_conferido: false, fundamento_quorum: '', resultado: '', participantes: [] } }
    vi.mocked(secretariaApi.modelos).mockResolvedValue([edital])
    vi.mocked(secretariaApi.reunioes).mockResolvedValue([reuniao])
    vi.spyOn(secretariaApi, 'reuniao').mockResolvedValue(reuniao)
    const criar = vi.spyOn(secretariaApi, 'criarDocumento').mockResolvedValue({ id: 'doc', revisao: 1 })
    montar()
    if (origem === 'ficha') {
      fireEvent.click(await screen.findByRole('tab', { name: 'Reuniões' }))
      fireEvent.click(await screen.findByRole('button', { name: 'Consultar' }))
      fireEvent.click(await screen.findByRole('button', { name: 'Gerar convocação' }))
    } else {
      fireEvent.click(await screen.findByRole('button', { name: 'Criar edital' }))
      await screen.findByRole('option', { name: /Salão/ })
      fireEvent.change(screen.getByLabelText('Reunião a convocar'), { target: { value: reuniao.id } })
    }
    fireEvent.click(await screen.findByRole('button', { name: 'Abrir edital no editor' }))
    await screen.findByRole('button', { name: 'Voltar à Secretaria' })
    expect(criar).toHaveBeenCalledWith(expect.objectContaining({ contexto_id: contexto.id, retomar_convocacao: true,
      versao: expect.objectContaining({ reuniao_id: reuniao.id, modelo_versao_id: edital.versoes[0].id }) }))
  })
  it('muda de órgão na aba Reuniões e renumera os itens com seus proponentes', async () => {
    const conselho: ContextoSecretaria = { ...contexto, id: 'conselho', nome: 'Conselho', tipo: 'ORGAO', orgao_id: 'orgao', orgao: { tipo: 'CONSELHO', constituicao: 'OFICIAL' } }
    const junta: ContextoSecretaria = { ...conselho, id: 'junta', nome: 'Junta Diaconal', orgao: { tipo: 'JUNTA', constituicao: 'OFICIAL' } }
    vi.mocked(secretariaApi.contextos).mockResolvedValue([contexto, conselho, junta])
    vi.spyOn(secretariaApi,'modelosReuniao').mockImplementation(async id=>[{id:id+'-modelo',revisao:1,finalidade:'Ordinária da '+id,configuracao:{
      tipo:'Ordinária',natureza:'Administrativa',obrigatoria:true,periodicidade:'Trimestral',referencia:'Integrantes do órgão/unidade',
      orgaos_participantes:[],primeira:'Maioria absoluta',segunda:'Não prevista',colegiado:'Colegiado',fundamentacao:'Regimento',observacao:'',
      antecedencia_dias:null,intervalo_minutos:null,minimo_anual:null}}])
    vi.spyOn(secretariaApi, 'locais').mockResolvedValue([{ id: 'templo', descritivo: 'Templo', endereco_extenso: 'Rua Central, 100' }] as Awaited<ReturnType<typeof secretariaApi.locais>>)
    const salvar = vi.spyOn(secretariaApi, 'criarReuniao').mockResolvedValue({ id: 'r', revisao: 1 })
    montar()
    fireEvent.click(await screen.findByRole('tab', { name: 'Reuniões' }))
    for (const id of ['conselho','junta']) {
      fireEvent.change(screen.getByLabelText('Contexto documental'), { target: { value: id } })
      fireEvent.click(await screen.findByRole('button', { name: 'Agendar reunião' }))
      await screen.findByRole('option',{name:'Ordinária da '+id+' · Ordinária'})
      fireEvent.change(screen.getByLabelText('Modelo de reunião'),{target:{value:id+'-modelo'}})
    }
    await screen.findByRole('option', { name: 'Templo' })
    fireEvent.change(screen.getByLabelText('Local da reunião'), { target: { value: 'templo' } })
    await screen.findByText('Rua Central, 100')
    fireEvent.change(screen.getByLabelText('Horário previsto'), { target: { value: '19:00' } })
    expect(screen.queryByText('Presença e mesa')).toBeNull()
    fireEvent.click(screen.getByText('Adicionar item de pauta'))
    fireEvent.change(screen.getByLabelText('Descrição do item 2'), { target: { value: 'Visitas às famílias' } })
    fireEvent.focus(screen.getByLabelText('Proponente do item 2 (opcional)'))
    fireEvent.click(await screen.findByRole('option', { name: 'Pessoa da igreja' }))
    fireEvent.click(screen.getByText('Remover item 1'))
    expect((screen.getByLabelText('Descrição do item 1') as HTMLTextAreaElement).value).toBe('Visitas às famílias')
    fireEvent.submit(screen.getByText('Salvar reunião').closest('form')!)
    await waitFor(() => expect(salvar).toHaveBeenCalledWith(expect.objectContaining({ contexto_id: 'junta', local_id: 'templo', dados: expect.objectContaining({
      modelo_reuniao_id:'junta-modelo', formato:'Presencial', carater:'Regular',convocacao:'Primeira',modalidade:'ORDINARIA', situacao: 'AGENDADA', horario_previsto: '19:00', inicio: null, fim: null, itens_pauta: [{ descricao: 'Visitas às famílias', proponente_id: 'p' }],
    }) })))
  })
  it('permite escolher o redator ao criar a ata, independentemente dos arrolados', async () => {
    vi.mocked(secretariaApi.reunioes).mockResolvedValue([{ id: 'reuniao', contexto_id: 'ctx', revisao: 1, data: '2027-01-10', modalidade: 'AGO',
      dados: { modalidade: 'AGO', data: '2027-01-10', situacao: 'AGENDADA', horario_previsto: '19:30', local: 'Templo', restrito: false,
        inicio: null, fim: null, pauta: 'Prestação de contas', competencia: '', universo_informado: 0, quorum_minimo: 0, quorum_conferido: false,
        fundamento_quorum: '', resultado: '', participantes: [] }, participantes: [] }])
    const ata = { ...modelo.versoes[0], tipo: 'ATA' as const }
    vi.mocked(secretariaApi.modelos).mockResolvedValue([{ ...modelo, nome: 'Ata', versoes: [ata] }])
    const criar = vi.spyOn(secretariaApi, 'criarDocumento').mockResolvedValue({ id: 'doc' })
    montar()
    await selecionarContexto()
    fireEvent.click(screen.getByRole('button', { name: 'Novo documento' }))
    fireEvent.change(await screen.findByLabelText('Modelo e versão'), { target: { value: 'mv' } })
    await screen.findByRole('option', { name: /2027-01-10/ })
    fireEvent.change(screen.getByLabelText('Reunião da ata'), { target: { value: 'reuniao' } })
    expect((screen.getByLabelText('Data do ato') as HTMLInputElement).value).toBe('2027-01-10')
    fireEvent.click(screen.getByText('Redator da ata (opcional na preparação)'))
    const seletor = await screen.findByLabelText('Redator da ata')
    expect((seletor as HTMLInputElement).value).toBe('')
    fireEvent.focus(seletor)
    fireEvent.click(await screen.findByRole('option', { name: 'Pessoa da igreja' }))
    fireEvent.click(screen.getByRole('button', {name:'Preparar ata'}))
    await waitFor(() => expect(criar).toHaveBeenCalledWith(expect.objectContaining({ versao: expect.objectContaining({
      conteudo: expect.objectContaining({ redator_ata: { pessoa_id: 'p', nome: 'Pessoa da igreja' }, arrolados: [] }) }) })))
  })
  it('durante a pausa oferece a versão clássica e abre o teor no formulário anterior', async () => {
    const v1 = modelo.versoes[0]
    const v2 = { ...v1, id: 'v2', numero: 2, configuracao: { ...v1.configuracao, composicao_padrao: novaPagina('Página publicada') } }
    vi.mocked(secretariaApi.contextos).mockResolvedValue([{ ...contexto, editor_pagina: false }])
    vi.mocked(secretariaApi.modelos).mockResolvedValue([{ ...modelo, revisao: 2, versoes: [v2, v1] }])
    montar()
    await selecionarContexto()
    fireEvent.click(screen.getByRole('button', { name: 'Novo documento' }))
    const seletor = await screen.findByRole('combobox', { name: 'Modelo e versão' })
    expect(within(seletor).queryByText('Carta — v2')).toBeNull()
    fireEvent.change(seletor, { target: { value: v1.id } })
    expect(screen.getByRole('textbox', { name: 'Teor' })).toBeDefined()
    expect(screen.queryByRole('button', { name: 'Usar editor de página' })).toBeNull()
  })
  it('auditor consulta conteúdo e versões sem controles de preparação, aprovação ou assinatura', async () => {
    vi.mocked(secretariaApi.contextos).mockResolvedValue([{ ...contexto, pode_preparar: false }])
    const d = documento(); d.estado = 'APROVADO'; d.versoes[0].congelado_em = '2026-01-10T12:00:00Z'
    vi.mocked(secretariaApi.consultarDocumentos).mockResolvedValue({ itens: [d], tem_proxima: false }); vi.mocked(secretariaApi.documento).mockResolvedValue(d)
    montar(Perfil.AUDITOR)
    fireEvent.change(await screen.findByLabelText('Contexto documental'), { target: { value: 'ctx' } })
    fireEvent.click(await screen.findByRole('button', { name: 'Abrir documento' }))
    await screen.findByText('Conteúdo original')
    expect(screen.queryByRole('button', { name: 'Novo documento' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Editar conteúdo' })).toBeNull()
    expect(screen.queryByLabelText('Ação documental')).toBeNull()
    expect(screen.queryByRole('button', { name: /assinar|expedir/i })).toBeNull()
    expect(pessoasApi.list).not.toHaveBeenCalled()
  })
  it('abre a correção indicada e só encaminha a revisão conferida depois de salvar', async () => {
    let d = documento()
    d.tramitacao = { pendencias: [{ destino: 'arrolados', mensagem: 'Indique o responsável.' }], livros: false, assinaturas: false, data_futura: false }
    vi.mocked(secretariaApi.consultarDocumentos).mockResolvedValue({ itens: [d], tem_proxima: false })
    vi.mocked(secretariaApi.documento).mockImplementation(async () => d)
    const salvar = vi.spyOn(secretariaApi, 'editarDocumento').mockImplementation(async () => {
      d = { ...d, revisao: 2, tramitacao: { ...d.tramitacao!, pendencias: [] } }
      return { id: d.id, revisao: 2 }
    })
    const encaminhar = vi.spyOn(secretariaApi, 'comando').mockResolvedValue({ id: d.id, revisao: 3 })
    montar(); await selecionarContexto()
    fireEvent.click(await screen.findByRole('button', { name: 'Abrir documento' }))
    expect((await screen.findByRole('button', { name: 'Encaminhar para aprovação' }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Corrigir' }))
    await screen.findByLabelText('Adicionar arrolado')
    expect(document.getElementById('arrolados')?.contains(document.activeElement)).toBe(true)
    fireEvent.change(screen.getByLabelText('Assunto'), { target: { value: 'Carta conferida' } })
    fireEvent.click(screen.getByText('Tramitação e assinaturas', { selector: 'summary' }))
    fireEvent.click(screen.getByRole('button', { name: 'Salvar e conferir tramitação' }))
    await screen.findByText('Tramitação · Versão 1 · Revisão 2')
    expect(salvar).toHaveBeenCalledOnce()
    expect(encaminhar).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Encaminhar para aprovação' }))
    fireEvent.change(screen.getByLabelText('Autoridade da ação'), { target: { value: 'Mesa' } })
    fireEvent.change(screen.getByLabelText('Fundamento e evidência da ação'), { target: { value: 'Revisão conferida' } })
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar · Encaminhar para aprovação' }))
    await waitFor(() => expect(encaminhar).toHaveBeenCalledWith('doc', 'encaminhar', expect.objectContaining({ revisao: 2, idempotencia: expect.any(String) })))
  })
  it('protege a aprovação de ata por revisão, deliberação e medição do livro', async () => {
    vi.stubEnv('VITE_FEATURE_SECRETARIA_LIVROS', 'true')
    try {
      const d = documento(); d.tipo = 'ATA'; d.revisao = 5; d.numero = 1; d.encaminhado_em = '2026-01-10'
      d.versoes[0].livro_id = 'livro'; d.versoes[0].revisao_conteudo = 3
      d.versoes[0].deliberacoes = [{ resultado: 'APROVADA', data: '2026-01-10', autoridade: 'Mesa', evidencia: 'Ata', revisao_conteudo: 2 }]
      vi.mocked(secretariaApi.contextos).mockResolvedValue([{ ...contexto, pode_aprovar: true, pode_deliberar: true }])
      vi.mocked(secretariaApi.consultarDocumentos).mockResolvedValue({ itens: [d], tem_proxima: false })
      vi.mocked(secretariaApi.documento).mockResolvedValue(d)
      montar(Perfil.COMUM); await selecionarContexto()
      fireEvent.click(await screen.findByRole('button', { name: 'Abrir documento' }))
      const aprovar = await screen.findByRole('button', { name: 'Aprovar tecnicamente' }) as HTMLButtonElement
      expect(aprovar.disabled).toBe(true)
      expect(screen.getByText('Aguarda deliberação favorável desta revisão.')).toBeDefined()
      vi.mocked(secretariaApi.documento).mockResolvedValue({ ...d, versoes: [{ ...d.versoes[0], deliberacoes: [{ ...d.versoes[0].deliberacoes[0], revisao_conteudo: 3 }] }] })
      vi.mocked(secretariaApi.artefatos).mockResolvedValue([{ id: 'antiga', versao_id: 'v1', revisao_documento: 4, finalidade: 'MEDICAO_LIVRO', estado: 'CONCLUIDO', sha256: null, tamanho: null }])
      fireEvent.click(screen.getByRole('button', { name: 'Recarregar documento' }))
      expect(await screen.findByText('Aguarda medição das páginas desta revisão.')).toBeDefined()
      expect(aprovar.disabled).toBe(true)
    } finally { vi.unstubAllEnvs() }
  })
  it('inicia pela versão vigente, pede cada campo uma vez e deixa os dados complementares para o editor', async () => {
    const v1 = modelo.versoes[0]
    const v2 = { ...v1, numero: 2, id: 'v2', configuracao: { ...v1.configuracao,
      campos_obrigatorios: ['ASSUNTO', 'REFERENCIA'], tipos_campos: { ASSUNTO: 'TEXTO' as const, REFERENCIA: 'TEXTO' as const, OPCIONAL: 'TEXTO' as const } } }
    vi.mocked(secretariaApi.modelos).mockResolvedValue([{ ...modelo, revisao: 8, versoes: [v1, v2] },
      { ...modelo, id: 'rascunho', nome: 'Em revisão', estado: 'EM_EDICAO', versoes: [v1] }])
    const criar = vi.spyOn(secretariaApi, 'criarDocumento').mockResolvedValue({ id: 'doc', revisao: 1 })
    montar()
    await selecionarContexto()
    fireEvent.click(screen.getByRole('button', { name: 'Novo documento' }))
    const modelos = await screen.findByRole('combobox', { name: 'Modelo e versão' })
    expect(within(modelos).queryByText('Carta — v1')).toBeNull()
    expect(within(modelos).queryByText('Em revisão — v1')).toBeNull()
    expect(screen.queryByLabelText('Assunto')).toBeNull()
    fireEvent.change(modelos, { target: { value: 'v2' } })
    fireEvent.change(screen.getByLabelText('Assunto'), { target: { value: 'Ofício' } })
    fireEvent.change(screen.getByLabelText('Campo: referencia'), { target: { value: 'Secretaria' } })
    expect(screen.queryByLabelText('Campo: assunto')).toBeNull()
    expect(screen.queryByLabelText('Campo: opcional')).toBeNull()
    expect(screen.queryByLabelText('Adicionar arrolado')).toBeNull()
    expect(secretariaApi.reunioes).not.toHaveBeenCalled()
    expect(pessoasApi.list).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Criar documento' }))
    await waitFor(() => expect(criar).toHaveBeenCalledWith(expect.objectContaining({
      usar_modelo_vigente: true, versao: expect.objectContaining({ modelo_versao_id: 'v2', assunto: 'Ofício', conteudo: expect.objectContaining({ campos: { ASSUNTO: 'Ofício', REFERENCIA: 'Secretaria' } }) }),
    })))
  })
  it('arrola uma pessoa com vários papéis e registra separadamente responsabilidade e assinatura', async () => {
    vi.mocked(secretariaApi.cargos).mockResolvedValue([{ id: 'cargo1', nome: 'Secretário titular' }, { id: 'cargo2', nome: 'Tesoureiro' }])
    const criar = vi.spyOn(secretariaApi, 'criarDocumento').mockResolvedValue({ id: 'doc', revisao: 1 })
    const editar = vi.spyOn(secretariaApi, 'editarDocumento').mockResolvedValue({ id: 'doc', revisao: 2 })
    montar(); await selecionarContexto()
    fireEvent.click(screen.getByRole('button', { name: 'Novo documento' }))
    fireEvent.change(await screen.findByLabelText('Modelo e versão'), { target: { value: 'mv' } })
    fireEvent.change(screen.getByLabelText('Assunto'), { target: { value: 'Carta nova' } })
    expect(screen.queryByLabelText('Teor')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Criar documento' }))
    await waitFor(() => expect(criar).toHaveBeenCalledWith(expect.objectContaining({ contexto_id: 'ctx', usar_modelo_vigente: true, versao: expect.objectContaining({ assunto: 'Carta nova' }) })))
    fireEvent.change(await screen.findByLabelText('Teor'), { target: { value: 'Teor da carta' } })
    fireEvent.change(screen.getByLabelText('Adicionar arrolado'), { target: { value: 'igreja' } })
    fireEvent.click(await screen.findByRole('option', { name: 'Pessoa da igreja' }))
    fireEvent.click(screen.getByRole('button', { name: 'Arrolar pessoa' }))
    fireEvent.change(screen.getByLabelText('Papéis no documento (separados por vírgula)'), { target: { value: 'Presidente, Secretário' } })
    fireEvent.click(screen.getByLabelText('Responsável pelo documento'))
    fireEvent.click(screen.getByLabelText('Secretário titular'))
    fireEvent.click(screen.getByLabelText('Tesoureiro'))
    fireEvent.change(screen.getByLabelText('Fundamento do papel e da competência'), { target: { value: 'Indicação expressa' } })
    fireEvent.focus(screen.getByLabelText('Adicionar arrolado'))
    expect(screen.queryByRole('option', { name: 'Pessoa da igreja' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Salvar documento' }))
    await waitFor(() => expect(editar).toHaveBeenCalledWith('doc', expect.objectContaining({ revisao: 1, idempotencia: expect.any(String), versao: expect.objectContaining({ conteudo: expect.objectContaining({ arrolados: [{ pessoa_id: 'p', papeis: ['PRESIDENTE', 'SECRETARIO'], cargo_id: null, cargos_ids: ['cargo1', 'cargo2'], assina: false, obrigatorio: false, responsavel: true, fundamento: 'Indicação expressa' }] }) }) })))
  })
  it('identifica o modelo de origem no autocomplete e o vínculo opcional na preparação', async () => {
    const campo = { nome: 'Pauta', tipo: 'texto', origem: 'manual', multiplo: false, codigo: null, ativo: true, revisao: 1 } as const
    const campos = [{ ...campo, id: 'recebida' }, { ...campo, id: 'local' }]
    const pagina = novaPagina()
    pagina.corpo = [{ tipo: 'paragrafo', alinhamento: 'esquerda', trechos: [{ tipo: 'campo', campo_id: 'recebida', apresentacao: 'individual' }] }]
    const config = { ...modelo.versoes[0].configuracao, composicao_padrao: pagina, definicoes: Object.fromEntries(campos.map(c => [c.id, c])),
      antecedentes: [{ modelo_id: 'edital', campos: { recebida: 'itens' } }] }
    const versao = { ...modelo.versoes[0], configuracao: config }
    const m = { ...modelo, estado: 'EM_EDICAO' as const, rascunho: { ...versao, nome: 'Ata' }, versoes: [versao] }
    const edital = { ...modelo, id: 'edital', nome: 'Edital de convocação', versoes: [] }
    vi.mocked(secretariaApi.modelos).mockResolvedValue([m, edital])
    vi.spyOn(secretariaApi, 'camposBiblioteca').mockResolvedValue(campos)
    montar(Perfil.COMUM, '/secretaria/ctx/editor/modelos/m')
    fireEvent.click(await screen.findByRole('button', { name: 'Inserir campo' }))
    fireEvent.change(await screen.findByRole('combobox', { name: 'Pesquisar campo' }), { target: { value: 'pauta' } })
    expect(screen.getByRole('option', { name: 'Pauta · Campo local do modelo' })).toBeDefined()
    expect(screen.getByRole('option', { name: 'Pauta · A receber de Edital de convocação' })).toBeDefined()
    cleanup()
    vi.mocked(secretariaApi.modelos).mockResolvedValue([{ ...m, estado: 'PUBLICADO', rascunho: null }, edital])
    montar(Perfil.COMUM, '/secretaria/ctx/editor/documentos/novo')
    fireEvent.change(await screen.findByLabelText('Modelo e versão'), { target: { value: versao.id } })
    await screen.findByRole('textbox', { name: 'Pauta', description: 'A receber de Edital de convocação · Vínculo opcional em aberto' })
  })
  it('distingue na folha e no painel a pauta local e a recepcionada, e mostra apenas os valores na prévia', async () => {
    const d = documento(), v = d.versoes[0]
    const definicao = { nome: 'Pauta', tipo: 'texto', multiplo: false, origem: 'manual' } as const
    const pagina = novaPagina()
    pagina.corpo = [{ tipo: 'paragrafo', alinhamento: 'esquerda', trechos: [
      { tipo: 'campo', campo_id: 'local', apresentacao: 'individual' },
      { tipo: 'texto', texto: ' / ' },
      { tipo: 'campo', campo_id: 'recebida', apresentacao: 'individual' },
    ] }]
    const config = { ...modelo.versoes[0].configuracao, composicao_padrao: pagina, definicoes: { local: definicao, recebida: definicao },
      antecedentes: [{ modelo_id: 'edital', campos: { recebida: 'itens' } }] }
    const m = { ...modelo, versoes: [{ ...modelo.versoes[0], configuracao: config }] }
    v.modelo = m.versoes[0]
    v.motivador_id = 'edital-v1'
    v.conteudo.composicao = pagina
    v.conteudo.antecedente = { versao_id: 'edital-v1', identificacao: '001/2026/AG · Edital de convocação · v1' }
    v.conteudo.valores = {
      local: { ...definicao, valor: 'Dízimos', origem: { tipo: 'manual' }, ajustado_manualmente: true },
      recebida: { ...definicao, valor: 'Obras', origem: { tipo: 'documento_anterior', versao_id: 'edital-v1', campo_id: 'itens' }, ajustado_manualmente: false },
    }
    vi.mocked(secretariaApi.modelos).mockResolvedValue([m])
    vi.mocked(secretariaApi.documento).mockResolvedValue(d)
    montar(Perfil.COMUM, '/secretaria/ctx/editor/documentos/doc')
    const origem = 'Recepcionado de ' + v.conteudo.antecedente.identificacao
    const recebida = await screen.findByRole('textbox', { name: 'Pauta', description: origem })
    expect(screen.getByRole('textbox', { name: 'Pauta', description: 'Campo local do modelo' })).toHaveProperty('value', 'Dízimos')
    expect(document.querySelector('[data-campo="recebida"]')?.getAttribute('title')).toBe(origem)
    fireEvent.change(recebida, { target: { value: 'Obras e manutenção' } })
    expect(document.querySelector('[data-campo="recebida"]')?.getAttribute('data-procedencia')).toBe('Recepcionado · ajustado')
    expect(document.querySelector('[data-campo="local"]')?.getAttribute('data-procedencia')).toBe('Local')
    fireEvent.click(screen.getByRole('button', { name: 'Prévia' }))
    const previa = screen.getByRole('region', { name: 'Corpo' })
    expect(previa.textContent).toContain('Dízimos / Obras e manutenção')
    expect(previa.querySelector('[data-procedencia]')).toBeNull()
  })
  it('confere a nova origem antes de trocar um valor manual e preserva o rascunho ao cancelar', async () => {
    const d = documento(), v = d.versoes[0]
    const config = { ...modelo.versoes[0].configuracao, antecedentes: [{ modelo_id: 'edital', campos: { pauta: 'itens' } }],
      definicoes: { pauta: { nome: 'Pauta', tipo: 'texto' as const, multiplo: false, origem: 'manual' as const } } }
    const m = { ...modelo, versoes: [{ ...modelo.versoes[0], configuracao: config }] }
    v.modelo = m.versoes[0]
    v.motivador_id = 'origem1'
    v.conteudo.antecedente = { versao_id: 'origem1', identificacao: 'Primeiro edital' }
    v.conteudo.valores = { pauta: { tipo: 'texto', multiplo: false, valor: 'Minha edição', origem: { tipo: 'documento_anterior', versao_id: 'origem1', campo_id: 'itens' }, ajustado_manualmente: true } }
    vi.mocked(secretariaApi.modelos).mockResolvedValue([m])
    vi.mocked(secretariaApi.consultarDocumentos).mockResolvedValue({ itens: [d], tem_proxima: false })
    vi.mocked(secretariaApi.documento).mockResolvedValue(d)
    vi.spyOn(secretariaApi, 'selecaoMotivadores').mockResolvedValue({ contextos: [contexto], tem_proxima: false, itens: [{
      documento_id: 'd2', versao_id: 'origem2', versao: 1, data: '2026-01-10', assunto: 'Segundo edital', numero: 2, ano: 2026, sigla: 'AG', estado: 'EXPEDIDO', contexto: contexto.nome, contexto_id: contexto.id, pauta: '', arrolados: [], resolucoes: [],
    }] })
    vi.spyOn(secretariaApi, 'previaOrigem').mockResolvedValue({ antecedente: { versao_id: 'origem2', identificacao: 'Segundo edital' },
      valores: { pauta: { ...v.conteudo.valores.pauta, valor: 'Nova pauta', origem: { tipo: 'documento_anterior', versao_id: 'origem2', campo_id: 'itens' }, ajustado_manualmente: false } } })
    montar(); await selecionarContexto()
    fireEvent.click(await screen.findByRole('button', { name: 'Abrir documento' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Editar conteúdo' }))
    fireEvent.click(await screen.findByText('Modelo e documento anterior', { selector: 'summary' }))
    async function escolher() {
      fireEvent.click(await screen.findByRole('button', { name: /^Selecionar$/ }))
      const linha = await screen.findByRole('row', { name: /Segundo edital/ })
      fireEvent.click(within(linha).getByRole('button', { name: 'Selecionar' }))
      await within(await screen.findByRole('dialog', { name: 'Conferir documento anterior' })).findByText('Nova pauta')
    }
    await escolher()
    expect(screen.getByRole('dialog').textContent).toContain('Minha edição')
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }))
    expect((screen.getByLabelText('Pauta', { exact: true }) as HTMLInputElement).value).toBe('Minha edição')
    await escolher()
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar substituição' }))
    expect((screen.getByLabelText('Pauta', { exact: true }) as HTMLInputElement).value).toBe('Nova pauta')
    expect((screen.getByLabelText('Documento anterior') as HTMLInputElement).value).toBe('Segundo edital')
  })
  it('mantém a edição quando o servidor detecta conflito e oferece recarga explícita', async () => {
    vi.mocked(secretariaApi.consultarDocumentos).mockResolvedValue({ itens: [documento()], tem_proxima: false })
    const editar = vi.spyOn(secretariaApi, 'editarDocumento').mockRejectedValue(new ApiRequestError(409, ['Registro alterado por outra operação. Recarregue antes de continuar.']))
    montar(); await selecionarContexto()
    fireEvent.click(await screen.findByRole('button', { name: 'Abrir documento' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Editar conteúdo' }))
    fireEvent.change(await screen.findByLabelText('Assunto'), { target: { value: 'Minha alteração' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar documento' }))
    expect((await screen.findByRole('alert')).textContent).toContain('Recarregue')
    expect((screen.getByLabelText('Assunto') as HTMLInputElement).value).toBe('Minha alteração')
    expect(editar).toHaveBeenCalledWith('doc', expect.objectContaining({ revisao: 1 }))
    expect(screen.getByRole('button', { name: 'Recarregar documento' })).toBeTruthy()
  })
})

describe('E06: livros da secretaria', () => {
  afterEach(() => vi.unstubAllEnvs())

  const livro: Awaited<ReturnType<typeof secretariaApi.livro>> = {
    id: 'livro-1', contexto_id: contexto.id, titular: contexto.nome, serie: 'ATA_ASSEMBLEIA', numero: 1, estado: 'EM_PREPARACAO',
    revisao: 1, restrito: false, capacidade_folhas: 50, faces_por_folha: 2, modalidade: 'PARA_ENCADERNACAO',
    perfil: 'LOCAL_V1', capacidade_faces: 100, fonte_normativa: 'Regimento local', reserva_exame: 2,
    aberto_em: null, encerrado_em: null, motivo_encerramento: null, manifesto_sha256: null,
    arquivo_historico_id: null, data_historica: null,
    totais: { paginas_utilizadas: 0, folhas_utilizadas: 0, saldo_folhas: 50, saldo_faces: 100, total_atas: 0, pendencias: 0, ultima_posicao: 0 },
    registros: [], termos: [], eventos: [], complementos: [],
  }
  const termo: ModeloDocumento = { ...modelo, id: 'm-termo', nome: 'Termo de abertura', versoes: [{
    ...modelo.versoes[0], id: 'mv-termo', finalidade: 'TERMO_ABERTURA',
    configuracao: { ...modelo.versoes[0].configuracao, campos_obrigatorios: ['NUMERO_LIVRO'] },
  }] }
  it('abre a preparação do termo pelo livro e envia seu vínculo no documento', async () => {
    vi.stubEnv('VITE_FEATURE_SECRETARIA_LIVROS', 'true')
    const versao = { modelo_versao_id: 'mv-termo', livro_id: livro.id, assunto: 'Abertura do livro de atas', data_documento: '2026-11-24', reuniao_id: null, motivador_id: null,
      conteudo: { teor: 'Livro nº 1', campos: { NUMERO_LIVRO: '1' }, arrolados: [], anexos: [] } }
    vi.spyOn(secretariaApi, 'previaAbertura').mockResolvedValue({ versao, conferencia: 'chave', preparador: { pessoa_id: 'a', nome: 'Maria' },
      secretario: { pessoa_id: 'b', nome: 'José' }, presidente: null, pendencias: [] })
    vi.mocked(secretariaApi.modelos).mockResolvedValue([modelo, termo])
    vi.spyOn(secretariaApi, 'livros').mockResolvedValue([livro])
    vi.spyOn(secretariaApi, 'livro').mockResolvedValue(livro)
    const criar = vi.spyOn(secretariaApi, 'criarDocumento').mockResolvedValue({ id: 'doc' })
    montar()
    await selecionarContexto()
    fireEvent.click(screen.getByRole('tab', { name: 'Livros' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Consultar livro' }))
    await screen.findByText(/capacidade declarada de 50 folhas e 100 faces/i)
    fireEvent.click(screen.getByRole('button', { name: 'Criar termo de abertura' }))
    await screen.findByLabelText('Modelo e versão')
    fireEvent.click(screen.getByRole('button', { name: 'Voltar à Secretaria' }))
    await screen.findByText(/capacidade declarada de 50 folhas e 100 faces/i)
    fireEvent.click(screen.getByRole('button', { name: 'Criar termo de abertura' }))
    const modelos = await screen.findByLabelText('Modelo e versão')
    expect(within(modelos).queryByRole('option', { name: /carta/i })).toBeNull()
    expect((modelos as HTMLSelectElement).value).toBe('mv-termo')
    expect(await screen.findByText('Preparado por: Maria')).toBeTruthy()
    expect(screen.getByText('Secretário responsável: José')).toBeTruthy()
    expect(criar).not.toHaveBeenCalled()
    expect(screen.queryByLabelText(/campo: numero livro/i)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Salvar documento' }))
    await waitFor(() => expect(criar).toHaveBeenCalledWith(expect.objectContaining({
      contexto_id: contexto.id, conferencia_abertura: 'chave', versao: expect.objectContaining({ modelo_versao_id: 'mv-termo', livro_id: livro.id }),
    })))
  })
  it('explica por que um modelo publicado está indisponível para a conta sem pessoa vinculada', async () => {
    vi.stubEnv('VITE_FEATURE_SECRETARIA_LIVROS', 'true')
    vi.mocked(secretariaApi.modelos).mockResolvedValue([{ ...termo, estado: 'PUBLICADO', permissoes: { criar: false, preparar: false, sem_pessoa_vinculada: true } }])
    vi.spyOn(secretariaApi, 'livros').mockResolvedValue([livro])
    vi.spyOn(secretariaApi, 'livro').mockResolvedValue(livro)
    montar(Perfil.COMUM, '/secretaria?contexto=ctx&aba=livros&livro=livro-1')
    expect(await screen.findByText(/vincular sua conta ao cadastro de pessoa/)).toBeTruthy()
    for (const nome of ['Criar termo de abertura', 'Criar termo de encerramento']) {
      expect((screen.getByRole('button', { name: nome }) as HTMLButtonElement).disabled).toBe(true)
    }
  })

  it('abre o encerramento com o modelo escolhido e os campos do inventário do livro', async () => {
    vi.stubEnv('VITE_FEATURE_SECRETARIA_LIVROS', 'true')
    const fechando = { ...livro, estado: 'EM_ENCERRAMENTO' as const }
    const encerramento: ModeloDocumento = { ...termo, nome: 'Termo de encerramento',
      versoes: [{ ...termo.versoes[0], finalidade: 'TERMO_ENCERRAMENTO' }] }
    vi.mocked(secretariaApi.modelos).mockResolvedValue([encerramento])
    vi.spyOn(secretariaApi, 'livros').mockResolvedValue([fechando])
    vi.spyOn(secretariaApi, 'livro').mockResolvedValue(fechando)
    const previa = vi.spyOn(secretariaApi, 'previaEncerramento').mockResolvedValue({ versao: {
      modelo_versao_id: 'mv-termo', livro_id: fechando.id, reuniao_id: null, motivador_id: null, assunto: 'Encerramento do livro de atas', data_documento: '2026-11-24',
      conteudo: { teor: 'Livro nº 1 com 10 atas.', campos: { NUMERO_LIVRO: '1', TOTAL_ATAS: '10' }, anexos: [], arrolados: [] },
    } })
    const criar = vi.spyOn(secretariaApi, 'criarDocumento').mockResolvedValue({ id: 'doc' })
    montar()
    await selecionarContexto()
    fireEvent.click(screen.getByRole('tab', { name: 'Livros' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Consultar livro' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Criar termo de encerramento' }))
    await waitFor(() => expect(previa).toHaveBeenCalledWith(fechando.id, 'mv-termo', 'criar', undefined))
    expect(await screen.findByDisplayValue('Encerramento do livro de atas')).toBeTruthy()
    expect(criar).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Salvar documento' }))
    await waitFor(() => expect(criar).toHaveBeenCalledWith(expect.objectContaining({ versao: expect.objectContaining({
      livro_id: fechando.id, conteudo: expect.objectContaining({ campos: expect.objectContaining({ TOTAL_ATAS: '10' }) }),
    }) })))
  })

})

describe('E08: resoluções e atuação', () => {
  it('atualiza o campo de deliberações na folha ao redigir, mover e retirar decisões', async () => {
    const d = documento(), v = d.versoes[0]
    const pagina = novaPagina()
    pagina.corpo = [{ tipo: 'paragrafo', alinhamento: 'esquerda', trechos: [
      { tipo: 'campo', campo_id: 'decisoes', apresentacao: 'em_linha' },
    ] }]
    const config = { ...modelo.versoes[0].configuracao, composicao_padrao: pagina,
      definicoes: { decisoes: { nome: 'Deliberações da reunião', tipo: 'texto', multiplo: true, origem: 'deliberacoes_reuniao' } as const } }
    const m = { ...modelo, versoes: [{ ...modelo.versoes[0], configuracao: config }] }
    v.modelo = m.versoes[0]
    v.conteudo.composicao = pagina
    vi.mocked(secretariaApi.modelos).mockResolvedValue([m])
    vi.mocked(secretariaApi.documento).mockResolvedValue(d)
    montar(Perfil.COMUM, '/secretaria/ctx/editor/documentos/doc')
    const adicionar = await screen.findByRole('button', { name: 'Adicionar resolução' })
    fireEvent.click(adicionar)
    fireEvent.change(screen.getByLabelText('Assunto da resolução'), { target: { value: 'Orçamento' } })
    fireEvent.click(adicionar)
    fireEvent.change(screen.getAllByLabelText('Assunto da resolução')[1], { target: { value: 'Obras' } })
    const folha = () => document.querySelector('[data-campo="decisoes"]')?.textContent
    expect(folha()).toBe('Orçamento — Aprovada e Obras — Aprovada')
    fireEvent.click(screen.getAllByRole('button', { name: 'Mover para cima' })[1])
    expect(folha()).toBe('Obras — Aprovada e Orçamento — Aprovada')
    fireEvent.click(screen.getAllByRole('button', { name: 'Retirar resolução' })[0])
    expect(folha()).toBe('Orçamento — Aprovada')
    fireEvent.click(screen.getByRole('button', { name: 'Prévia' }))
    expect(screen.getByRole('region', { name: 'Corpo' }).textContent).toContain('Orçamento — Aprovada')
  })

  it('salva uma resolução rejeitada com apuração secreta e autoria vazia', async () => {
    const editar = vi.spyOn(secretariaApi, 'editarDocumento').mockResolvedValue({ id: 'doc' })
    vi.mocked(secretariaApi.consultarDocumentos).mockResolvedValue({ itens: [documento()], tem_proxima: false })
    montar()
    await selecionarContexto()
    fireEvent.click(await screen.findByRole('button', { name: 'Retomar edição' }))
    await screen.findByText('Editando documento')
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar resolução' }))
    fireEvent.change(screen.getByLabelText('Assunto da resolução'), { target: { value: 'Relatório mensal' } })
    fireEvent.change(screen.getByLabelText('Resultado da resolução'), { target: { value: 'REJEITADA' } })
    fireEvent.change(screen.getByLabelText('Texto proposto'), { target: { value: 'Texto submetido' } })
    fireEvent.click(screen.getByLabelText('Votação secreta'))
    fireEvent.change(screen.getByLabelText('Contrários'), { target: { value: '4' } })
    expect(screen.getByText('Sem proponente informado')).toBeTruthy()
    expect(screen.queryByLabelText('Registrar eficácia da decisão')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Salvar documento' }))
    await waitFor(() => expect(editar).toHaveBeenCalledWith('doc', expect.objectContaining({
      versao: expect.objectContaining({ resolucoes: [expect.objectContaining({
        ordem: 1, resultado: 'REJEITADA', eficaz: false, votacao_secreta: true,
        proponentes_pessoas_ids: [], dissidentes_pessoas_ids: [], apuracao: { contrarios: 4 },
      })] }),
    })))
  })

  it('filtra a atuação e abre a versão histórica indicada pelo resultado', async () => {
    const d = documento()
    d.versao_atual = 2
    d.versoes.push({ ...d.versoes[0], id: 'v2', numero: 2, assunto: 'Versão atual da carta' })
    vi.mocked(secretariaApi.documento).mockResolvedValue(d)
    const consulta = vi.spyOn(secretariaApi, 'atuacao').mockResolvedValue({
      pagina: 0, tamanho: 30, totais: { total: 1, autoria: 0, coautoria: 0, dissidencia: 0, presenca: 1, assinatura: 0 },
      itens: [{
        documento_id: d.id, versao_id: 'v1', contexto_id: 'ctx', versao: 1, versao_atual: false,
        contexto: 'Assembleia Geral', numero: '001/2026/AG', data: '2026-01-10', estado: 'APROVADO',
        resolucao_id: 'resolucao1', assunto: 'Relatório mensal', resultado: 'REJEITADA', ordem: 1,
        eficaz: false, proponentes: null, dissidentes: null,
        autoria: false, coautoria: false, dissidencia: false, assinatura: false, presenca: true,
      }],
    })
    montar(Perfil.AUDITOR)
    fireEvent.click(await screen.findByRole('tab', { name: 'Consultar atuação' }))
    fireEvent.change(screen.getByLabelText('Pessoa'), { target: { value: 'igreja' } })
    fireEvent.click(await screen.findByRole('option', { name: 'Pessoa da igreja' }))
    fireEvent.change(screen.getByLabelText('Resultado da resolução'), { target: { value: 'REJEITADA' } })
    fireEvent.click(screen.getByRole('button', { name: 'Pesquisar' }))
    await waitFor(() => expect(consulta).toHaveBeenLastCalledWith({ tipo: 'resolucoes', pessoa: 'p', resultado: 'REJEITADA' }, 0))
    expect(await screen.findByText('Sem proponente informado')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Abrir versão' }))
    expect((await screen.findByText('Versão 1: Carta antiga')).closest('details')?.open).toBe(true)
    expect(screen.getByText('Versão 2: Versão atual da carta').closest('details')?.open).toBe(false)
    expect(screen.queryByRole('region', { name: 'Tramitação da versão salva' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Editar conteúdo' })).toBeNull()
  })
})

it('abre a versão histórica referenciada mesmo sem campos ou transcrição no acervo', async () => {
  const d = documento()
  d.estado = 'APROVADO'
  const antiga = { ...d.versoes[0], assunto: 'Ata histórica referenciada', conteudo: JSON.parse('{}') }
  d.versao_atual = 2
  d.versoes = [antiga, { ...d.versoes[0], id: 'v2', numero: 2 }]
  vi.mocked(secretariaApi.documento).mockResolvedValue(d)
  montar(Perfil.COMUM, '/secretaria/ctx/documentos/doc?versao=v1')
  expect(await screen.findByText('Esta versão não contém texto transcrito.')).toBeTruthy()
  expect(screen.getAllByRole('heading', { name: 'Ata histórica referenciada' }).length).toBeGreaterThan(0)
})
