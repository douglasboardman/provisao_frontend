vi.mock('../hooks/use-navegacao', () => ({ useNavegacao: () => ({ data: { permissoes: {orgaos: useAuthStore.getState().user?.perfil === Perfil.ADMINISTRADOR ? ['view','create','edit'] : ['view']} }, isPending: false }) }))
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { OrgaosPage } from '../pages/orgaos/OrgaosPage'
import { useAuthStore } from '../stores/auth'
import { Perfil } from '../types/enums'
import { orgaosApi } from '../api/orgaos'

vi.mock('../api/orgaos', () => ({ orgaosApi: {
  relogio: vi.fn(async () => ({ data_utc: '2026-11-17', data_operacional: '2026-11-16', fuso_iana: 'America/Sao_Paulo', data_no_fuso: '2026-11-16' })),
  listar: vi.fn(async () => ({ itens: [{ id: 'orgao', tipo: 'CONSELHO', constituicao: 'OFICIAL', nome: 'Conselho Central', sigla: null, ativo: true }], proximo_cursor: null })),
  mandatos: vi.fn(),
  atos: vi.fn(async () => ({ itens: [], proximo_cursor: null })),
  detalhe: vi.fn(async (_id: string, data: string) => ({ orgao: { id: 'orgao', tipo: 'CONSELHO', constituicao: 'OFICIAL', nome: 'Conselho Central', sigla: null, ativo: true, finalidade: 'Governança', data_criacao: '2020-01-01T00:00:00Z' }, data_referencia: data, vigente_na_data: true, composicao: { membros: [{ pessoa_id: 'pessoa', nome: 'Ana Teste', oficios: ['PRESBITERO_REGENTE'], revisao_pendente: true }], indeterminados: [{ pessoa_id: 'outra', nome: 'Pessoa Pendente' }] }, ocupacoes: [{ id: 'cargo', cargo_id: 'id-cargo', inicio: '2025-01-01T00:00:00Z', inicio_ordem: 2, fim: null, fim_ordem: null, termino_previsto: '2029-12-31T00:00:00Z', pessoa: { id: 'pessoa', nome_completo: 'Ana Teste' }, cargo: { nome: 'Secretário' } }], ocupacoes_limitadas: false, participacoes: [], participacoes_limitadas: false })),
}, gestaoOrgaosApi: { fuso: vi.fn() } }))

describe('consulta de órgãos', () => {
  afterEach(() => { cleanup(); vi.unstubAllEnvs() })
  beforeEach(() => useAuthStore.setState({ status: 'ready', user: { sub: 'user', igreja_id: 'igreja', perfil: Perfil.AUDITOR, login: 'x', username: 'x' } }))
  it('mostra composição, revisão e histórico sem afirmar competência pelo cargo', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(<QueryClientProvider client={client}><OrgaosPage /></QueryClientProvider>)
    await screen.findByText('Conselho Central')
    expect((screen.getByLabelText('Data de referência') as HTMLInputElement).value).toBe('2026-11-16')
    fireEvent.click(screen.getByRole('button', { name: 'Consultar' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Composição e mandatos' }))
    expect(screen.getByRole('navigation', { name: 'Seções da ficha' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Histórico' })).toBeTruthy()
    expect(screen.getByRole('table', { name: 'Composição do órgão' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Consultar' })).toBeNull()
    expect(await screen.findByText(/revisão institucional pendente/)).toBeTruthy()
    expect(screen.getByText(/Pessoa Pendente — situação indeterminada/)).toBeTruthy()
    fireEvent.click(await screen.findByRole('button', { name: 'Visão geral' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Histórico' }))
    expect(screen.getByText(/não comprovam, por si só, exercício atual ou competência/)).toBeTruthy()
    expect(screen.getByText(/Secretário: Ana Teste/)).toBeTruthy()
    expect(screen.getByText(/sequência 2/)).toBeTruthy()
  })
  it('permite registrar no histórico o encerramento retroativo de uma ocupação vencida', async () => {
    vi.stubEnv('VITE_FEATURE_ORGAOS_GESTAO', 'true')
    const ficha = await orgaosApi.detalhe('orgao', '2026-11-16')
    vi.mocked(orgaosApi.detalhe).mockResolvedValueOnce({
      ...ficha, pode_registrar_cargos: true, contexto_id: 'contexto',
      ocupacoes: [{ ...ficha.ocupacoes[0], termino_previsto: '2025-12-31' }],
    })
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(<QueryClientProvider client={client}><OrgaosPage /></QueryClientProvider>)
    fireEvent.click(await screen.findByRole('button', { name: 'Consultar' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Histórico' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Registrar encerramento de Ana Teste' }))
    expect(await screen.findByRole('heading', { name: 'Encerramento · Secretário' })).toBeTruthy()
    const data = screen.getByLabelText('Data de efeito do encerramento') as HTMLInputElement
    fireEvent.change(data, { target: { value: '2025-12-10' } })
    expect(data.validity.valid).toBe(true)
  })
  it.each([false, true])('mostra o caminho para registrar mandato na composição do Conselho (autorizado: %s)', async autorizado => {
    vi.stubEnv('VITE_FEATURE_ORGAOS_GESTAO', 'true')
    useAuthStore.setState({ user: { sub: 'operador', igreja_id: 'igreja', perfil: Perfil.ADMINISTRADOR, login: 'x', username: 'x' } })
    const ficha = await orgaosApi.detalhe('orgao', '2026-11-16')
    vi.mocked(orgaosApi.detalhe).mockResolvedValueOnce({ ...ficha, orgao: { ...ficha.orgao, tipo_padrao: 'CONSELHO' }, contexto_id: 'contexto',
      preparo_registro_cargos: autorizado ? null : 'VINCULAR_PESSOA', })
    vi.mocked(orgaosApi.mandatos).mockResolvedValueOnce({ itens: [], proximo_cursor: null, pode_registrar: autorizado })
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(<QueryClientProvider client={client}><OrgaosPage /></QueryClientProvider>)
    fireEvent.click(await screen.findByRole('button', { name: 'Consultar' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Composição e mandatos' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Registrar mandato' }))
    expect(screen.getByRole('heading', { name: 'Registrar mandato' })).toBeTruthy()
    if (autorizado) {
      expect(screen.getByRole('textbox', { name: 'Ata da Assembleia que elegeu a pessoa' })).toBeTruthy()
    } else {
      expect(screen.getByRole('link', { name: 'Abrir usuários' }).getAttribute('href')).toBe('/usuarios')
      expect(screen.queryByRole('textbox', { name: 'Ata da Assembleia que elegeu a pessoa' })).toBeNull()
    }
  })
  it.each([false, true])('abre o fluxo de cargo a partir do mandato do administrador (conta vinculada: %s)', async vinculada => {
    vi.stubEnv('VITE_FEATURE_ORGAOS_GESTAO', 'true')
    useAuthStore.setState({ user: { sub: 'admin', igreja_id: 'igreja', perfil: Perfil.ADMINISTRADOR, login: 'admin', username: 'Admin' } })
    const ficha = await orgaosApi.detalhe('orgao', '2026-11-16')
    vi.mocked(orgaosApi.detalhe).mockResolvedValueOnce({
      ...ficha, preparo_registro_cargos: vinculada ? null : 'VINCULAR_PESSOA', contexto_id: 'contexto', pode_registrar_cargos: vinculada,
      cargos_na_data: [{ id: 'cargo', nome: 'Secretário', titulares: [] }],
    })
    vi.mocked(orgaosApi.mandatos).mockResolvedValueOnce({ proximo_cursor: null, pode_registrar: false, itens: [{
      id: 'mandato', data_eleicao: '2025-01-01', data_posse: '2025-01-01', termino_previsto: '2029-12-31',
      termino_efetivo: null, pode_encerrar: true, versao_orgao: null,
      oficial: { id: 'oficial', ativo: true, tipo: 'PRESBITERO_REGENTE', pessoa: { id: 'pessoa', nome_completo: 'Ana Teste' } },
    }] })
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(<QueryClientProvider client={client}><OrgaosPage /></QueryClientProvider>)
    fireEvent.click(await screen.findByRole('button', { name: 'Consultar' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Composição e mandatos' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Atribuir cargo' }))
    expect(screen.getByRole('heading', { name: 'Atribuir cargo a Ana Teste' })).toBeTruthy()
    if (vinculada) {
      fireEvent.click(screen.getByRole('button', { name: 'Selecionar cargo' }))
      expect(screen.getByRole('heading', { name: 'Eleição e posse · Secretário' })).toBeTruthy()
      expect(screen.getByRole('textbox', { name: 'Ata da eleição' })).toBeTruthy()
      expect((screen.getByRole('button', { name: 'Confirmar ato' }) as HTMLButtonElement).disabled).toBe(true)
      expect(screen.getByText('Pessoa eleita')).toBeTruthy()
      fireEvent.click(screen.getByRole('button', { name: 'Voltar' }))
    } else {
      expect(screen.queryByRole('button', { name: 'Selecionar cargo' })).toBeNull()
      expect(screen.getByText(/Peça a outro administrador da igreja/)).toBeTruthy()
      expect(screen.getByRole('link', { name: 'Abrir usuários' }).getAttribute('href')).toBe('/usuarios')
    }
    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }))
    expect(screen.getByRole('button', { name: 'Encerrar mandato' })).toBeTruthy()
  })
  it('mantém formulários de gestão fechados pela chave e não os mostra ao auditor', async () => {
    vi.stubEnv('VITE_FEATURE_ORGAOS_GESTAO', 'true')
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(<QueryClientProvider client={client}><OrgaosPage /></QueryClientProvider>)
    await screen.findByText('Conselho Central')
    expect(screen.queryByRole('button', { name: 'Registrar Conselho ou Junta' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Registrar competência de gestor' })).toBeNull()
  })
  it('sinaliza rol não elegível ou indeterminado sem afirmar exercício', async () => {
    vi.mocked(orgaosApi.detalhe).mockResolvedValueOnce({
      orgao: { id: 'orgao', tipo: 'UNIDADE_MINISTERIAL', constituicao: 'DESIGNACAO', nome: 'Unidade', sigla: null, ativo: true, finalidade: 'Teste', data_criacao: '2020-01-01' },
      data_referencia: '2026-02-01', vigente_na_data: true, composicao: null, cargos_configurados: [], cargos_limitados: false, politicas: [], politicas_limitadas: false, ultima_ordem_designacao: 0, ordem_designacao_indeterminada: false,
      ocupacoes: [{ id: 'cargo', cargo_id: 'id-cargo', inicio: '2026-01-01', inicio_ordem: 1, fim: null, fim_ordem: null, termino_previsto: null, pessoa: { id: 'pessoa', nome_completo: 'Líder Teste' }, cargo: { nome: 'Líder' }, situacao_membresia: 'NAO_ELEGIVEL' }], ocupacoes_limitadas: false, proximo_cursor_ocupacao: null,
      participacoes: [{ id: 'participacao', inicio: '2026-01-01', fim: null, pessoa: { id: 'outra', nome_completo: 'Participante Teste' }, situacao_membresia: 'INDETERMINADA' }], participacoes_limitadas: false, proximo_cursor_participacao: null,
    })
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(<QueryClientProvider client={client}><OrgaosPage /></QueryClientProvider>)
    await screen.findByText('Conselho Central')
    fireEvent.click(screen.getByRole('button', { name: 'Consultar' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Histórico' }))
    expect(await screen.findByText(/rol não elegível na data; requer conferência/)).toBeTruthy()
    fireEvent.click(await screen.findByRole('button', { name: 'Visão geral' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Participação' }))
    expect(screen.getByText(/rol indeterminado na data; requer conferência/)).toBeTruthy()
    expect(screen.getByText(/não comprova exercício ou competência/)).toBeTruthy()
  })
  it('consulta atos por página e distingue operador de autoridade', async () => {
    vi.mocked(orgaosApi.atos).mockResolvedValueOnce({ itens: [{ id: 'ato1', tipo: 'DESIGNACAO', data_efeito: '2026-01-01', criado_em: '2026-01-01T12:00:00Z', operador: { nome_usuario: 'Operador Teste' } }], proximo_cursor: 'ato1' }).mockResolvedValueOnce({ itens: [{ id: 'ato2', tipo: 'DISPENSA', data_efeito: '2025-01-01', criado_em: '2025-01-01T12:00:00Z', operador: { nome_usuario: 'Outra Pessoa' } }], proximo_cursor: null })
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(<QueryClientProvider client={client}><OrgaosPage /></QueryClientProvider>)
    await screen.findByText('Conselho Central')
    fireEvent.click(screen.getByRole('button', { name: 'Consultar' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Histórico' }))
    expect(await screen.findByRole('row', { name: /Designação 01\/01\/2026 Operador Teste/ })).toBeTruthy()
    expect(screen.getByText(/registrar não significa ser a autoridade do ato/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Mais atos' }))
    expect(await screen.findByRole('row', { name: /Dispensa 01\/01\/2025 Outra Pessoa/ })).toBeTruthy()
    expect(orgaosApi.atos).toHaveBeenLastCalledWith('orgao', 'ato1')
  })
  it('navega independentemente pelo histórico de ocupações e participações', async () => {
    const base = {
      orgao: { id: 'orgao', tipo: 'UNIDADE_MINISTERIAL' as const, constituicao: 'DESIGNACAO' as const, nome: 'Unidade', sigla: null, ativo: true, finalidade: 'Teste', data_criacao: '2020-01-01' },
      data_referencia: '2026-01-01', vigente_na_data: true, composicao: null, cargos_configurados: [], cargos_limitados: false, politicas: [], politicas_limitadas: false, ultima_ordem_designacao: 0, ordem_designacao_indeterminada: false,
      ocupacoes: [], ocupacoes_limitadas: true, proximo_cursor_ocupacao: 'ocupacao-100', participacoes: [], participacoes_limitadas: true, proximo_cursor_participacao: 'participacao-100',
    }
    vi.mocked(orgaosApi.detalhe).mockResolvedValueOnce(base).mockResolvedValueOnce({ ...base, ocupacoes_limitadas: false, proximo_cursor_ocupacao: null }).mockResolvedValueOnce({ ...base, ocupacoes_limitadas: false, proximo_cursor_ocupacao: null, participacoes_limitadas: false, proximo_cursor_participacao: null })
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(<QueryClientProvider client={client}><OrgaosPage /></QueryClientProvider>)
    await screen.findByText('Conselho Central')
    fireEvent.click(screen.getByRole('button', { name: 'Consultar' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Histórico' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Mais ocupações' }))
    await screen.findByRole('button', { name: 'Ocupações anteriores' })
    expect(orgaosApi.detalhe).toHaveBeenLastCalledWith('orgao', expect.any(String), { ocupacao: 'ocupacao-100', participacao: undefined })
    fireEvent.click(await screen.findByRole('button', { name: 'Visão geral' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Participação' }))
    fireEvent.click(screen.getByRole('button', { name: 'Mais participações' }))
    await screen.findByRole('button', { name: 'Participações anteriores' })
    expect(orgaosApi.detalhe).toHaveBeenLastCalledWith('orgao', expect.any(String), { ocupacao: 'ocupacao-100', participacao: 'participacao-100' })
  })
  it('mostra as ações administrativas somente com a chave ligada', async () => {
    vi.stubEnv('VITE_FEATURE_ORGAOS_GESTAO', 'true')
    useAuthStore.setState({ status: 'ready', user: { sub: 'admin', igreja_id: 'igreja', perfil: Perfil.ADMINISTRADOR, login: 'x', username: 'x' } })
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(<QueryClientProvider client={client}><OrgaosPage /></QueryClientProvider>)
    fireEvent.click(await screen.findByRole('tab', { name: 'Administração institucional' }))
    expect(await screen.findByRole('button', { name: 'Registrar Conselho ou Junta' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Registrar competência de gestor' })).toBeTruthy()
  })
  it('impede abrir atos com fuso inválido e mantém a correção acessível ao administrador', async () => {
    vi.stubEnv('VITE_FEATURE_ORGAOS_GESTAO', 'true')
    vi.mocked(orgaosApi.relogio).mockResolvedValueOnce({ data_utc: '2026-11-17', data_operacional: null, fuso_iana: 'Fuso/Inexistente', data_no_fuso: null })
    useAuthStore.setState({ status: 'ready', user: { sub: 'admin', igreja_id: 'igreja', perfil: Perfil.ADMINISTRADOR, login: 'x', username: 'x' } })
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(<QueryClientProvider client={client}><OrgaosPage /></QueryClientProvider>)
    expect((await screen.findByRole('alert')).textContent).toContain('O fuso cadastrado é inválido')
    expect(await screen.findByRole('button', { name: 'Configurar fuso da igreja' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Registrar Conselho ou Junta' })).toBeNull()
  })
  it('não mostra ações de escrita ao administrador quando a chave está desligada', async () => {
    vi.stubEnv('VITE_FEATURE_ORGAOS_GESTAO', 'false')
    useAuthStore.setState({ status: 'ready', user: { sub: 'admin', igreja_id: 'igreja', perfil: Perfil.ADMINISTRADOR, login: 'x', username: 'x' } })
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(<QueryClientProvider client={client}><OrgaosPage /></QueryClientProvider>)
    await screen.findByText('Conselho Central')
    expect(screen.queryByRole('button', { name: 'Registrar Conselho ou Junta' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Registrar competência de gestor' })).toBeNull()
  })
})
