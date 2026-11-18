import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { InsercaoRetroativaOficial } from '../pages/oficiais/InsercaoRetroativaOficial'
const api = vi.hoisted(() => ({ insercoesOficial: vi.fn(async () => []), previaInsercaoOficial: vi.fn(async (_id: string, proposta: unknown) => ({ hash: 'hash', proposta, bloqueada: false, observacao: 'Prévia sintética', alteracoes: [] })), aplicarInsercaoOficial: vi.fn() }))
vi.mock('../api/oficiais', () => ({ oficiaisApi: api }))
describe('inclusão retroativa de ofício', () => {
  afterEach(() => { cleanup(); vi.clearAllMocks() })
  it('mostra os dados e o impacto sem permitir confirmação por auditor', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(<QueryClientProvider client={client}><InsercaoRetroativaOficial oficialId="oficial" identidade="igreja:auditor" podeRegistrar={false} eventos={[]} /></QueryClientProvider>)
    fireEvent.click(screen.getByRole('button', { name: 'Conferir evento retroativo de ofício' }))
    fireEvent.change(screen.getByLabelText('Tipo de ato retroativo'), { target: { value: 'SUSPENSAO' } })
    fireEvent.change(screen.getByLabelText('Data do efeito retroativo'), { target: { value: '2024-01-01' } })
    fireEvent.change(screen.getByLabelText('Ordem do ato retroativo'), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText('Autoridade do ato retroativo'), { target: { value: 'Conselho' } })
    fireEvent.change(screen.getByLabelText('Evidência do ato retroativo'), { target: { value: 'Livro' } })
    fireEvent.click(screen.getByRole('button', { name: 'Gerar prévia do ofício' }))
    await screen.findByText('Prévia sintética')
    await waitFor(() => expect(api.previaInsercaoOficial).toHaveBeenCalledWith('oficial', expect.objectContaining({ tipo: 'SUSPENSAO', data_efeito: '2024-01-01', ordem: 1, autoridade: 'Conselho', evidencia: 'Livro' })))
    expect(screen.getByText(/Suspensão em 01\/01\/2024, ordem 1/)).toBeTruthy()
    expect(screen.getByText('Seu acesso permite apenas consultar a prévia.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Confirmar evento retroativo' })).toBeNull()
  })
})
