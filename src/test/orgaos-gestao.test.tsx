import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { InstituirOrgao } from '../pages/orgaos/InstituirOrgao'
import { CompetenciaUnidades } from '../pages/orgaos/CompetenciaUnidades'
import { ParticipacaoUnidade } from '../pages/orgaos/ParticipacaoUnidade'
import { DesignacaoLideranca } from '../pages/orgaos/DesignacaoLideranca'
import { GestaoAutoridades } from '../pages/orgaos/GestaoAutoridades'
import { GestaoCargos } from '../pages/orgaos/GestaoCargos'
import { PoliticaUnidade } from '../pages/orgaos/PoliticaUnidade'
import { EleicaoCargo } from '../pages/orgaos/EleicaoCargo'
import { EncerrarAto } from '../pages/orgaos/EncerrarAto'
import { PreviaImpactosMembresia } from '../pages/orgaos/PreviaImpactosMembresia'
import { ConfiguracaoFuso } from '../pages/orgaos/ConfiguracaoFuso'
import { RelogioIgreja } from '../pages/orgaos/RelogioIgreja'
import { gestaoOrgaosApi } from '../api/orgaos'
import { Perfil } from '../types/enums'
import type { ReactNode } from 'react'

vi.mock('../api/orgaos', () => ({ gestaoOrgaosApi: {
  fuso: vi.fn().mockResolvedValue({ configuracao: null }),
  registrarFuso: vi.fn().mockRejectedValueOnce(new Error('falha temporária')).mockResolvedValue({ id: 'igreja', fuso_iana: 'America/Sao_Paulo' }),
  eventosBaseMembresia: vi.fn().mockResolvedValue({ itens: [{ id: 'evento', data_evento: '2020-01-01' }], limitados: false }),
  impactosMembresia: vi.fn().mockResolvedValue({ data_inicial: '2026-01-01', participacoes: [{ id: 'm', inicio: '2026-01-01', fim: null, orgao: { nome: 'Unidade Teste' } }], participacoes_limitadas: false, ocupacoes: [], ocupacoes_limitadas: false }),
  criarOficial: vi.fn(),
  criarUnidade: vi.fn().mockRejectedValueOnce(new Error('falha temporária')).mockResolvedValue({ id: 'orgao' }),
  registrarCompetencia: vi.fn().mockResolvedValue({ id: 'competencia' }),
  participacao: vi.fn().mockResolvedValue({ ato_id: 'ato', membro_id: 'membro' }),
  designar: vi.fn().mockResolvedValue({ ato_id: 'ato', ocupacao_id: null }),
  competencias: vi.fn(async () => ({ itens: [{ id: 'competencia', inicio: '2020-01-01', fim: null, pessoa_id: 'p', pessoa: { nome_completo: 'Pessoa Gestora' }, usuario: { nome_usuario: 'Gestora Teste', ativo: true, perfil: 'GESTOR', pessoa_id: 'p' } }], proximo_cursor: null })),
  presidencias: vi.fn(async () => ({ itens: [{ id: 'presidencia', inicio: '2020-01-01', fim: null, oficial: { id: 'docente', pessoa: { nome_completo: 'Pastor Teste' } } }], proximo_cursor: null })),
  docentes: vi.fn(async () => ({ itens: [{ id: 'docente', pessoa: { nome_completo: 'Pastor Teste' } }], proximo_cursor: null })),
  registrarPresidencia: vi.fn().mockResolvedValue({ id: 'presidencia' }),
  encerrarCompetencia: vi.fn().mockRejectedValueOnce(new Error('falha temporária')).mockResolvedValue({ id: 'competencia', fim: '2026-11-17' }),
  encerrarPresidencia: vi.fn().mockResolvedValue({ id: 'presidencia', fim: '2026-11-17' }),
  criarCargo: vi.fn().mockResolvedValue({ id: 'novo' }),
  configurarAcumulacao: vi.fn().mockResolvedValue({ id: 'cargo', permite_acumulacao: true }),
  registrarPolitica: vi.fn().mockResolvedValue({ id: 'politica' }),
  registrarEleicao: vi.fn().mockResolvedValue({ ato_id: 'ato', ocupacao_id: 'ocupacao' }),
  encerrarOcupacao: vi.fn().mockResolvedValue({ ato_id: 'ato', ocupacao_id: 'ocupacao' }),
  desativar: vi.fn().mockResolvedValue({ ato_id: 'ato', orgao_id: 'unidade' }),
}, orgaosApi: { detalhe: vi.fn(async () => ({ ultima_ordem_designacao: 2, ordem_designacao_indeterminada: false })) } }))
vi.mock('../api/pessoas', () => ({ pessoasApi: { list: vi.fn(async () => [{ id: 'pessoa', nome_completo: 'Pessoa Teste' }]) } }))
vi.mock('../api/usuarios', () => ({ usuariosApi: { list: vi.fn(async () => [{ id: 'gestor', nome_usuario: 'Gestora Teste', perfil: Perfil.GESTOR, ativo: true, pessoa_id: 'pessoa' }, { id: 'sem-pessoa', nome_usuario: 'Sem vínculo', perfil: Perfil.GESTOR, ativo: true, pessoa_id: null }]) } }))

function renderizar(node: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(<QueryClientProvider client={client}>{node}</QueryClientProvider>)
}

describe('gestão de órgãos', () => {
  afterEach(cleanup)
  it.each(['CONSELHO', 'JUNTA'])('cadastra %s sem exigir instituidor, autoridade ou evidência', async tipo => {
    vi.mocked(gestaoOrgaosApi.criarOficial).mockResolvedValueOnce({ id: 'orgao' })
    renderizar(<RelogioIgreja dia="2026-11-18"><InstituirOrgao perfil={Perfil.ADMINISTRADOR} identidade="igreja:admin" /></RelogioIgreja>)
    fireEvent.click(screen.getByRole('button', { name: 'Registrar Conselho ou Junta' }))
    expect(screen.queryByLabelText('Pessoa instituidora')).toBeNull()
    expect(screen.queryByLabelText('Autoridade do ato')).toBeNull()
    expect(screen.queryByLabelText('Referência ou evidência do ato')).toBeNull()
    fireEvent.change(screen.getByLabelText('Tipo'), { target: { value: tipo } })
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Órgão oficial' } })
    fireEvent.change(screen.getByLabelText('Finalidade'), { target: { value: 'Finalidade' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    await screen.findByText('Órgão registrado.')
    expect(gestaoOrgaosApi.criarOficial).toHaveBeenLastCalledWith({ tipo, nome: 'Órgão oficial', finalidade: 'Finalidade', data_criacao: '2026-11-18', idempotencia: expect.any(String) })
  })
  it('usa a data da igreja para preencher a participação', async () => {
    renderizar(<RelogioIgreja dia="2026-11-16"><ParticipacaoUnidade orgaoId="unidade" identidade="igreja:gestor" /></RelogioIgreja>)
    fireEvent.click(screen.getByRole('button', { name: 'Registrar participação' }))
    expect((screen.getByLabelText('Data de efeito') as HTMLInputElement).value).toBe('2026-11-16')
  })
  it('registra fuso mantendo a chave no reenvio e explica sua aplicação', async () => {
    renderizar(<ConfiguracaoFuso identidade="igreja:admin" />)
    fireEvent.click(screen.getByRole('button', { name: 'Configurar fuso da igreja' }))
    await screen.findByText('Nenhum fuso registrado.')
    expect(screen.getByText(/O fuso define a data corrente dos atos/)).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Fuso IANA'), { target: { value: 'America/Sao_Paulo' } })
    fireEvent.change(screen.getByLabelText('Autoridade declarada para o fuso'), { target: { value: 'Conselho' } })
    fireEvent.change(screen.getByLabelText('Referência ou evidência do fuso'), { target: { value: 'Ato' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar fuso' }))
    await screen.findByRole('alert')
    fireEvent.click(screen.getByRole('button', { name: 'Salvar fuso' }))
    await screen.findByText('Fuso registrado.')
    const chamadas = vi.mocked(gestaoOrgaosApi.registrarFuso).mock.calls
    expect(chamadas).toHaveLength(2)
    expect(chamadas[0][0].idempotencia).toBe(chamadas[1][0].idempotencia)
  })
  it('consulta possíveis impactos sem afirmar autorização para alteração', async () => {
    renderizar(<PreviaImpactosMembresia identidade="igreja:admin" />)
    fireEvent.click(screen.getByRole('button', { name: 'Consultar possíveis impactos de membresia' }))
    expect(screen.getByText(/não autoriza a alteração/)).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Pessoa para conferência'), { target: { value: 'Teste' } })
    fireEvent.click(await screen.findByRole('option', { name: 'Pessoa Teste' }))
    fireEvent.change(screen.getByLabelText('Data mais antiga atingida'), { target: { value: '2026-01-01' } })
    fireEvent.click(screen.getByRole('button', { name: 'Consultar vínculos' }))
    expect(await screen.findByText(/Participação em Unidade Teste/)).toBeTruthy()
    expect(gestaoOrgaosApi.impactosMembresia).toHaveBeenCalledWith('pessoa', '2026-01-01', undefined, undefined)
    fireEvent.change(screen.getByLabelText('Data mais antiga atingida'), { target: { value: '2026-01-02' } })
    expect(screen.queryByText(/Participação em Unidade Teste/)).toBeNull()
    fireEvent.change(screen.getByLabelText('Evento existente (opcional)'), { target: { value: 'evento' } })
    fireEvent.change(screen.getByLabelText('Nova data proposta (opcional)'), { target: { value: '2027-01-01' } })
    fireEvent.click(screen.getByRole('button', { name: 'Consultar vínculos' }))
    await waitFor(() => expect(gestaoOrgaosApi.impactosMembresia).toHaveBeenCalledWith('pessoa', '2027-01-01', 'evento', undefined))
  })
  it('permite percorrer separadamente os vínculos da prévia', async () => {
    const base = { data_inicial: '2026-01-01', participacoes: [], participacoes_limitadas: true, proximo_cursor_participacao: 'pagina-p', ocupacoes: [], ocupacoes_limitadas: true, proximo_cursor_ocupacao: 'pagina-o' }
    vi.mocked(gestaoOrgaosApi.impactosMembresia).mockResolvedValueOnce(base).mockResolvedValueOnce({ ...base, participacoes_limitadas: false, proximo_cursor_participacao: null }).mockResolvedValueOnce({ ...base, participacoes_limitadas: false, proximo_cursor_participacao: null, ocupacoes_limitadas: false, proximo_cursor_ocupacao: null })
    renderizar(<PreviaImpactosMembresia identidade="igreja:admin" />)
    fireEvent.click(screen.getByRole('button', { name: 'Consultar possíveis impactos de membresia' }))
    fireEvent.change(screen.getByLabelText('Pessoa para conferência'), { target: { value: 'Teste' } })
    fireEvent.click(await screen.findByRole('option', { name: 'Pessoa Teste' }))
    fireEvent.change(screen.getByLabelText('Data mais antiga atingida'), { target: { value: '2026-01-01' } })
    fireEvent.click(screen.getByRole('button', { name: 'Consultar vínculos' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Mais participações' }))
    await waitFor(() => expect(gestaoOrgaosApi.impactosMembresia).toHaveBeenLastCalledWith('pessoa', '2026-01-01', undefined, { participacao: 'pagina-p', ocupacao: undefined }))
    const maisOcupacoes = await screen.findByRole('button', { name: 'Mais ocupações' })
    await waitFor(() => expect((maisOcupacoes as HTMLButtonElement).disabled).toBe(false))
    fireEvent.click(maisOcupacoes)
    await waitFor(() => expect(gestaoOrgaosApi.impactosMembresia).toHaveBeenLastCalledWith('pessoa', '2026-01-01', undefined, { participacao: 'pagina-p', ocupacao: 'pagina-o' }))
  })
  it('permite selecionar eventos além da primeira página', async () => {
    vi.mocked(gestaoOrgaosApi.eventosBaseMembresia).mockResolvedValueOnce({ itens: [{ id: 'evento-a', data_evento: '2021-01-01' }], limitados: true, proximo_cursor: 'evento-a' }).mockResolvedValueOnce({ itens: [{ id: 'evento-b', data_evento: '2020-01-01' }], limitados: false, proximo_cursor: null })
    renderizar(<PreviaImpactosMembresia identidade="igreja:admin" />)
    fireEvent.click(screen.getByRole('button', { name: 'Consultar possíveis impactos de membresia' }))
    fireEvent.change(screen.getByLabelText('Pessoa para conferência'), { target: { value: 'Teste' } })
    fireEvent.click(await screen.findByRole('option', { name: 'Pessoa Teste' }))
    await screen.findByRole('option', { name: /evento-a/ })
    fireEvent.click(screen.getByRole('button', { name: 'Mais eventos' }))
    await screen.findByRole('option', { name: /evento-b/ })
    fireEvent.change(screen.getByLabelText('Evento existente (opcional)'), { target: { value: 'evento-b' } })
    fireEvent.click(screen.getByRole('button', { name: 'Consultar vínculos' }))
    await waitFor(() => expect(gestaoOrgaosApi.impactosMembresia).toHaveBeenLastCalledWith('pessoa', '', 'evento-b', undefined))
  })
  it('interrompe a paginação quando a data de referência muda', async () => {
    const base = { data_inicial: '2026-01-01', participacoes: [], participacoes_limitadas: true, proximo_cursor_participacao: 'pagina-p', ocupacoes: [], ocupacoes_limitadas: false, proximo_cursor_ocupacao: null }
    vi.mocked(gestaoOrgaosApi.impactosMembresia).mockResolvedValueOnce(base).mockResolvedValueOnce({ ...base, data_inicial: '2025-01-01', proximo_cursor_participacao: null })
    renderizar(<PreviaImpactosMembresia identidade="igreja:admin" />)
    fireEvent.click(screen.getByRole('button', { name: 'Consultar possíveis impactos de membresia' }))
    fireEvent.change(screen.getByLabelText('Pessoa para conferência'), { target: { value: 'Teste' } })
    fireEvent.click(await screen.findByRole('option', { name: 'Pessoa Teste' }))
    fireEvent.change(screen.getByLabelText('Data mais antiga atingida'), { target: { value: '2026-01-01' } })
    fireEvent.click(screen.getByRole('button', { name: 'Consultar vínculos' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Mais participações' }))
    expect(await screen.findByText(/data de referência mudou durante a consulta/)).toBeTruthy()
    expect(screen.queryByText(/Vínculos com início a partir de/)).toBeNull()
  })
  it('conserva a chave ao repetir a mesma instituição após falha', async () => {
    renderizar(<InstituirOrgao perfil={Perfil.GESTOR} identidade="igreja:gestor" />)
    fireEvent.click(screen.getByRole('button', { name: 'Registrar unidade ministerial' }))
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Unidade Teste' } })
    fireEvent.change(screen.getByLabelText('Finalidade'), { target: { value: 'Finalidade' } })
    fireEvent.change(screen.getByLabelText('Referência ou evidência do ato'), { target: { value: 'Ato documentado' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    expect(await screen.findByRole('alert')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    expect(await screen.findByText('Órgão registrado.')).toBeTruthy()
    const chamadas = vi.mocked(gestaoOrgaosApi.criarUnidade).mock.calls
    expect(chamadas).toHaveLength(2)
    expect(chamadas[0][0].idempotencia).toBe(chamadas[1][0].idempotencia)
  })
  it('oferece apenas gestores ativos vinculados e registra evidência', async () => {
    renderizar(<CompetenciaUnidades identidade="igreja:admin" />)
    fireEvent.click(screen.getByRole('button', { name: 'Registrar competência de gestor' }))
    expect(screen.queryByRole('option', { name: 'Sem vínculo' })).toBeNull()
    fireEvent.change(screen.getByLabelText('Gestor vinculado a pessoa'), { target: { value: 'Teste' } })
    fireEvent.click(await screen.findByRole('option', { name: 'Gestora Teste' }))
    fireEvent.change(screen.getByLabelText('Primeiro dia sem competência (opcional)'), { target: { value: '2099-01-01' } })
    fireEvent.change(screen.getByLabelText('Autoridade declarada'), { target: { value: 'Conselho' } })
    fireEvent.change(screen.getByLabelText('Referência ou evidência'), { target: { value: 'Ato institucional' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar competência' }))
    await waitFor(() => expect(gestaoOrgaosApi.registrarCompetencia).toHaveBeenCalledWith(expect.objectContaining({ usuario_id: 'gestor', fim: '2099-01-01', autoridade: 'Conselho', evidencia: 'Ato institucional', idempotencia: expect.any(String) })))
  })
  it('envia participação com pessoa, evidência e chave própria', async () => {
    renderizar(<ParticipacaoUnidade orgaoId="unidade" identidade="igreja:gestor" />)
    fireEvent.click(screen.getByRole('button', { name: 'Registrar participação' }))
    fireEvent.change(screen.getByLabelText('Pessoa'), { target: { value: 'Teste' } })
    fireEvent.click(await screen.findByRole('option', { name: 'Pessoa Teste' }))
    fireEvent.change(screen.getByLabelText('Referência ou evidência'), { target: { value: 'Ato sintético' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar participação' }))
    await waitFor(() => expect(gestaoOrgaosApi.participacao).toHaveBeenCalledWith('unidade', 'incluir', expect.objectContaining({ pessoa_id: 'pessoa', evidencia: 'Ato sintético', idempotencia: expect.any(String) })))
  })
  it('permite dispensa sem sucessor com sequência posterior à última registrada', async () => {
    renderizar(<DesignacaoLideranca orgaoId="unidade" identidade="igreja:gestor" cargos={[{ id: 'lider', nome: 'Líder', codigo: 'LIDER' }]} />)
    fireEvent.click(screen.getByRole('button', { name: 'Atribuir cargo ou dispensar líder' }))
    await screen.findByText(/Última sequência registrada para a unidade: 2/)
    fireEvent.change(screen.getByLabelText('Ação de liderança'), { target: { value: 'dispensar' } })
    expect(screen.queryByLabelText('Pessoa designada')).toBeNull()
    fireEvent.change(screen.getByLabelText('Cargo de liderança'), { target: { value: 'lider' } })
    fireEvent.change(screen.getByLabelText('Sequência do ato no dia'), { target: { value: '2' } })
    fireEvent.change(screen.getByLabelText('Referência do ato de liderança'), { target: { value: 'Ato pastoral' } })
    expect((screen.getByRole('button', { name: 'Salvar ato' }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.change(screen.getByLabelText('Sequência do ato no dia'), { target: { value: '3' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar ato' }))
    await waitFor(() => expect(gestaoOrgaosApi.designar).toHaveBeenCalledWith('unidade', 'lider', expect.objectContaining({ pessoa_id: null, ordem_efeito: 3, evidencia: 'Ato pastoral', idempotencia: expect.any(String) })))
  })
  it('consulta e encerra competência preservando a chave ao repetir o envio', async () => {
    renderizar(<GestaoAutoridades identidade="igreja:admin" />)
    fireEvent.click(screen.getByRole('button', { name: 'Consultar autoridades institucionais' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Encerrar competência de Gestora Teste' }))
    fireEvent.change(screen.getByLabelText('Autoridade do encerramento'), { target: { value: 'Conselho' } })
    fireEvent.change(screen.getByLabelText('Evidência do encerramento'), { target: { value: 'Ata institucional' } })
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar encerramento' }))
    expect(await screen.findByRole('alert')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar encerramento' }))
    await waitFor(() => expect(gestaoOrgaosApi.encerrarCompetencia).toHaveBeenCalledTimes(2))
    const chamadas = vi.mocked(gestaoOrgaosApi.encerrarCompetencia).mock.calls
    expect(chamadas[0][1].idempotencia).toBe(chamadas[1][1].idempotencia)
  })
  it('registra presidência declarada escolhendo o docente e a evidência', async () => {
    renderizar(<GestaoAutoridades identidade="igreja:admin" />)
    fireEvent.click(screen.getByRole('button', { name: 'Consultar autoridades institucionais' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Registrar presidência' }))
    fireEvent.change(screen.getByLabelText('Presbítero docente'), { target: { value: 'Teste' } })
    fireEvent.click(await screen.findByRole('option', { name: 'Pastor Teste' }))
    fireEvent.change(screen.getByLabelText('Evidência da presidência'), { target: { value: 'Ato pastoral' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar presidência' }))
    await waitFor(() => expect(gestaoOrgaosApi.registrarPresidencia).toHaveBeenCalledWith(expect.objectContaining({ oficial_id: 'docente', evidencia: 'Ato pastoral', idempotencia: expect.any(String) })))
  })
  it('registra cargo com regra e evidência normativas', async () => {
    renderizar(<GestaoCargos orgaoId="unidade" identidade="igreja:gestor" cargos={[]} />)
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar cargo' }))
    fireEvent.change(screen.getByLabelText('Código do cargo'), { target: { value: 'secretario_2' } })
    fireEvent.change(screen.getByLabelText('Nome do cargo'), { target: { value: 'Segundo secretário' } })
    fireEvent.click(screen.getByLabelText('Permitir acumulação autorizada'))
    fireEvent.change(screen.getByLabelText('Fonte normativa'), { target: { value: 'Norma' } })
    fireEvent.change(screen.getByLabelText('Versão da norma'), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText('Autoridade da configuração'), { target: { value: 'Conselho' } })
    fireEvent.change(screen.getByLabelText('Evidência da configuração'), { target: { value: 'Ato' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar configuração' }))
    await waitFor(() => expect(gestaoOrgaosApi.criarCargo).toHaveBeenCalledWith('unidade', expect.objectContaining({ codigo: 'SECRETARIO_2', permite_acumulacao: true, idempotencia: expect.any(String) })))
  })
  it('registra política e vincula eleição de unidade à versão escolhida', async () => {
    const politica = { id: 'politica', versao: '1', fonte: 'Norma', inicio: '2026-01-01', fim: '2027-12-31', prazo_maximo_meses: 12 }
    const exibicao = renderizar(<PoliticaUnidade orgaoId="unidade" identidade="igreja:gestor" politicas={[]} limitadas={false} />)
    fireEvent.click(screen.getByRole('button', { name: 'Registrar política de eleição' }))
    fireEvent.change(screen.getByLabelText('Versão da política'), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText('Fonte da política'), { target: { value: 'Norma' } })
    fireEvent.change(screen.getByLabelText('Início de vigência'), { target: { value: '2026-01-01' } })
    fireEvent.change(screen.getByLabelText('Último dia de vigência'), { target: { value: '2027-12-31' } })
    fireEvent.change(screen.getByLabelText('Prazo máximo em meses'), { target: { value: '12' } })
    fireEvent.change(screen.getByLabelText('Autoridade da política'), { target: { value: 'Conselho' } })
    fireEvent.change(screen.getByLabelText('Evidência da política'), { target: { value: 'Ato normativo' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar política' }))
    await waitFor(() => expect(gestaoOrgaosApi.registrarPolitica).toHaveBeenCalledWith('unidade', expect.objectContaining({ prazo_maximo_meses: 12, idempotencia: expect.any(String) })))
    exibicao.unmount()
    renderizar(<EleicaoCargo orgaoId="unidade" identidade="igreja:gestor" tipo="unidade" cargos={[{ id: 'cargo', nome: 'Presidente', codigo: 'PRESIDENTE', permite_acumulacao: false }]} politicas={[politica]} />)
    fireEvent.click(screen.getByRole('button', { name: 'Atribuir cargo por eleição' }))
    fireEvent.change(screen.getByLabelText('Cargo eleito'), { target: { value: 'cargo' } })
    fireEvent.change(screen.getByLabelText('Pessoa eleita'), { target: { value: 'Teste' } })
    fireEvent.click(await screen.findByRole('option', { name: 'Pessoa Teste' }))
    fireEvent.change(screen.getByLabelText('Política aplicável'), { target: { value: 'politica' } })
    fireEvent.change(screen.getByLabelText('Último dia previsto'), { target: { value: '2099-11-16' } })
    fireEvent.change(screen.getByLabelText('Autoridade da eleição'), { target: { value: 'Assembleia' } })
    fireEvent.change(screen.getByLabelText('Evidência da eleição e posse'), { target: { value: 'Ata' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar eleição e posse' }))
    await waitFor(() => expect(gestaoOrgaosApi.registrarEleicao).toHaveBeenCalledWith('unidade', 'cargo', 'unidade', expect.objectContaining({ politica_id: 'politica', pessoa_id: 'pessoa', idempotencia: expect.any(String) })))
  })
  it('envia desativação documentada com chave de repetição', async () => {
    renderizar(<EncerrarAto orgaoId="unidade" identidade="igreja:gestor" tipo="desativar" aoFechar={() => undefined} />)
    fireEvent.change(screen.getByLabelText('Motivo'), { target: { value: 'Encerramento' } })
    fireEvent.change(screen.getByLabelText('Autoridade do ato'), { target: { value: 'Gestor' } })
    fireEvent.change(screen.getByLabelText('Evidência do ato'), { target: { value: 'Ato' } })
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar ato' }))
    await waitFor(() => expect(gestaoOrgaosApi.desativar).toHaveBeenCalledWith('unidade', expect.objectContaining({ motivo: 'Encerramento', idempotencia: expect.any(String) })))
  })
})
