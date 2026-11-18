import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CorrecaoMembresia } from '../pages/oficiais/CorrecaoMembresia'

const api = vi.hoisted(() => ({
  correcoes: vi.fn(async () => []),
  eventosParaCorrecao: vi.fn(async () => [{ id: 'evento', tipo_evento: 'ADMISSAO', data_evento: '2024-01-01', ordem_dia: null, rol: 'COMUNGANTES' }]),
  previaCorrecao: vi.fn(async () => ({ hash: 'hash', data_anterior: '2024-01-01', data_nova: '2024-01-02', observacao: 'Prévia conferida', mandatos: [], conferencias: [], bloqueada: false })),
  aplicarCorrecao: vi.fn(),
}))
vi.mock('../api/oficiais', () => ({ oficiaisApi: api }))

describe('correção de data no histórico de pessoa', () => {
  afterEach(() => { cleanup(); vi.clearAllMocks(); vi.unstubAllEnvs() })
  it('consulta a pessoa e apresenta prévia sem permitir escrita ao auditor', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(<QueryClientProvider client={client}><CorrecaoMembresia oficialId="pessoa" identidade="igreja:auditor" podeRegistrar={false} porPessoa /></QueryClientProvider>)
    fireEvent.click(screen.getByRole('button', { name: 'Conferir correção de data de membresia' }))
    await screen.findByRole('option', { name: /ADMISSAO/ })
    expect(api.correcoes).toHaveBeenCalledWith('pessoa', true)
    expect(api.eventosParaCorrecao).toHaveBeenCalledWith('pessoa', true)
    fireEvent.change(screen.getByLabelText('Evento de membresia'), { target: { value: 'evento' } })
    fireEvent.change(screen.getByLabelText('Data corrigida'), { target: { value: '2024-01-02' } })
    fireEvent.click(screen.getByRole('button', { name: 'Gerar prévia' }))
    await screen.findByText('Prévia conferida')
    await waitFor(() => expect(api.previaCorrecao).toHaveBeenCalledWith('pessoa', { evento_id: 'evento', nova_data: '2024-01-02' }, true))
    expect(screen.getByText('Seu acesso permite apenas consultar a prévia.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Confirmar correção' })).toBeNull()
  })
  it.each([false, true])('informa o bloqueio de órgão com bloqueio eleitoral %s e não oferece confirmação', async bloqueada => {
    api.previaCorrecao.mockImplementationOnce(async () => ({ hash: 'hash', data_anterior: '2024-01-01', data_nova: '2024-01-02', observacao: 'Prévia conferida', mandatos: [], conferencias: [], bloqueada, bloqueio_orgao: { bloqueia: true, participacoes: 1, ocupacoes: 2, rol_alterado: 1, rol_preservado: 1, rol_indeterminado: 1, detalhes: [{ id: 'm', tipo: 'PARTICIPACAO', orgao: 'Unidade Teste', cargo: null, inicio: '2025-01-01', comparacao_rol: 'PRESERVADO' }] } }))
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(<QueryClientProvider client={client}><CorrecaoMembresia oficialId="pessoa" identidade="igreja:secretario" podeRegistrar porPessoa /></QueryClientProvider>)
    fireEvent.click(screen.getByRole('button', { name: 'Conferir correção de data de membresia' }))
    await screen.findByRole('option', { name: /ADMISSAO/ })
    fireEvent.change(screen.getByLabelText('Evento de membresia'), { target: { value: 'evento' } })
    fireEvent.change(screen.getByLabelText('Data corrigida'), { target: { value: '2024-01-02' } })
    fireEvent.click(screen.getByRole('button', { name: 'Gerar prévia' }))
    expect(await screen.findByText(/1 participação\(ões\) e 2 ocupação\(ões\)/)).toBeTruthy()
    expect(screen.getByText(/rol alterado em 1, preservado em 1 e indeterminado em 1/)).toBeTruthy()
    fireEvent.click(screen.getByText('Ver vínculos analisados'))
    expect(screen.getByText(/Participação em Unidade Teste · início em 01\/01\/2025 · rol preservado/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Confirmar correção' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Registrar decisão formal' })).toBeNull()
  })
  it('oferece consultar a decisão de órgão quando a gestão está habilitada', async () => {
    vi.stubEnv('VITE_FEATURE_ORGAOS_GESTAO', 'true')
    api.previaCorrecao.mockImplementationOnce(async () => ({ hash: 'hash', data_anterior: '2024-01-01', data_nova: '2024-01-02', observacao: 'Prévia conferida', mandatos: [], conferencias: [], bloqueada: false, bloqueio_orgao: { bloqueia: true, participacoes: 1, ocupacoes: 0 } }))
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(<QueryClientProvider client={client}><CorrecaoMembresia oficialId="pessoa" identidade="igreja:secretario" podeRegistrar porPessoa /></QueryClientProvider>)
    fireEvent.click(screen.getByRole('button', { name: 'Conferir correção de data de membresia' }))
    await screen.findByRole('option', { name: /ADMISSAO/ })
    fireEvent.change(screen.getByLabelText('Evento de membresia'), { target: { value: 'evento' } })
    fireEvent.change(screen.getByLabelText('Data corrigida'), { target: { value: '2024-01-02' } })
    fireEvent.click(screen.getByRole('button', { name: 'Gerar prévia' }))
    expect(await screen.findByRole('button', { name: 'Consultar decisões de órgão' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Confirmar correção' })).toBeNull()
  })
})
