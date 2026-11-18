import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { OrdenacaoMembresia } from '../pages/oficiais/OrdenacaoMembresia'
const api = vi.hoisted(() => ({ eventosParaCorrecao: vi.fn(async () => [{ id: 'evento', tipo_evento: 'ADMISSAO', data_evento: '2024-01-01', ordem_dia: 2, rol: 'COMUNGANTES' }]), ordenacoes: vi.fn(async () => []), previaOrdenacao: vi.fn(async () => ({ hash: 'hash', data_evento: '2024-01-01', itens: [], bloqueada: false, observacao: 'Prévia sintética', inconsistencias_rol_origem: [], mandatos: [] })), aplicarOrdenacao: vi.fn() }))
vi.mock('../api/oficiais', () => ({ oficiaisApi: api }))
describe('ordem de ato isolado', () => {
  afterEach(() => { cleanup(); vi.clearAllMocks() })
  it('permite conferir novamente a posição de um ato que já possui ordem', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(<QueryClientProvider client={client}><OrdenacaoMembresia oficialId="pessoa" identidade="igreja:usuario" podeRegistrar porPessoa /></QueryClientProvider>)
    fireEvent.click(screen.getByRole('button', { name: 'Conferir ordem de atos no mesmo dia' }))
    await screen.findByRole('option', { name: '01/01/2024' })
    fireEvent.change(screen.getByLabelText('Data com atos a ordenar'), { target: { value: '2024-01-01' } })
    const ordem = screen.getByLabelText(/Ordem para ADMISSAO/) as HTMLInputElement
    expect(ordem.value).toBe('2')
    fireEvent.change(ordem, { target: { value: '11' } })
    fireEvent.click(screen.getByRole('button', { name: 'Gerar prévia da ordem' }))
    await waitFor(() => expect(api.previaOrdenacao).toHaveBeenCalledWith('pessoa', { data_evento: '2024-01-01', itens: [{ evento_id: 'evento', ordem: 11 }] }, true))
  })
})
