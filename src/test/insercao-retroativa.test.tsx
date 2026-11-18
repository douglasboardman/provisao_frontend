import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { InsercaoRetroativa } from '../pages/oficiais/InsercaoRetroativa'
const api = vi.hoisted(() => ({ insercoesRetroativas: vi.fn(async () => []), eventosParaCorrecao: vi.fn(async (): Promise<{ id: string; tipo_evento: string; data_evento: string; ordem_dia: number | null; rol: string }[]> => []), previaInsercao: vi.fn(async () => ({ hash: 'hash', bloqueada: false, observacao: 'Prévia sintética', mandatos: [], conferencias: [] })), aplicarInsercao: vi.fn() }))
vi.mock('../api/oficiais', () => ({ oficiaisApi: api }))
vi.mock('../hooks/use-enum-relations', () => ({ useEnumRelations: () => ({ isLoading: false, getMapping: () => null, getFilter: (nome: string) => nome === 'Rols de Admissão' ? ['COMUNGANTES'] : nome === 'Motivações de Admissão' ? ['PROFISSAO_DE_FE'] : [] }) }))
describe('inclusão retroativa', () => {
  afterEach(() => { cleanup(); vi.clearAllMocks() })
  it('apresenta prévia para auditor sem permitir confirmação', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(<QueryClientProvider client={client}><InsercaoRetroativa pessoaId="pessoa" identidade="igreja:auditor" podeRegistrar={false} /></QueryClientProvider>)
    fireEvent.click(screen.getByRole('button', { name: 'Conferir inclusão retroativa' }))
    fireEvent.change(screen.getByLabelText('Data do ato'), { target: { value: '2024-01-01' } })
    fireEvent.change(screen.getByLabelText('Rol de destino'), { target: { value: 'COMUNGANTES' } })
    fireEvent.change(screen.getByLabelText('Motivação'), { target: { value: 'PROFISSAO_DE_FE' } })
    await waitFor(() => expect((screen.getByRole('button', { name: 'Gerar prévia da inclusão' }) as HTMLButtonElement).disabled).toBe(false))
    fireEvent.click(screen.getByRole('button', { name: 'Gerar prévia da inclusão' }))
    await screen.findByText('Prévia sintética')
    await waitFor(() => expect(api.previaInsercao).toHaveBeenCalledWith('pessoa', expect.objectContaining({ data_evento: '2024-01-01', tipo_evento: 'ADMISSAO', rol: 'COMUNGANTES', motivacao_evento: 'PROFISSAO_DE_FE' })))
    expect(screen.getByText('Seu acesso permite apenas consultar a prévia.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Confirmar inclusão' })).toBeNull()
  })
  it('mostra atos existentes e exige a posição do novo ato', async () => {
    api.eventosParaCorrecao.mockResolvedValueOnce([{ id: 'evento-existente', tipo_evento: 'ADMISSAO', data_evento: '2024-01-01', ordem_dia: 2, rol: 'COMUNGANTES' }])
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(<QueryClientProvider client={client}><InsercaoRetroativa pessoaId="pessoa" identidade="igreja:secretario" podeRegistrar /></QueryClientProvider>)
    fireEvent.click(screen.getByRole('button', { name: 'Conferir inclusão retroativa' }))
    fireEvent.change(screen.getByLabelText('Data do ato'), { target: { value: '2024-01-01' } })
    await screen.findByText(/ordem 2/)
    expect((screen.getByLabelText('Ordem do ato no dia') as HTMLInputElement).required).toBe(true)
    fireEvent.change(screen.getByLabelText('Ordem do ato no dia'), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText('Rol de destino'), { target: { value: 'COMUNGANTES' } })
    fireEvent.change(screen.getByLabelText('Motivação'), { target: { value: 'PROFISSAO_DE_FE' } })
    await waitFor(() => expect((screen.getByRole('button', { name: 'Gerar prévia da inclusão' }) as HTMLButtonElement).disabled).toBe(false))
    fireEvent.click(screen.getByRole('button', { name: 'Gerar prévia da inclusão' }))
    await waitFor(() => expect(api.previaInsercao).toHaveBeenCalledWith('pessoa', expect.objectContaining({ ordem_dia: 1 })))
  })

})
