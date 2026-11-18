import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HistoricoRevisoesEleitorais } from '../pages/oficiais/DecisaoEleitoral'
const api = vi.hoisted(() => ({ revisoesEleitorais: vi.fn(async () => [{ id: 'd', operacao: 'DATA', hash_previa: 'hash', autoridade: 'Concílio', evidencia: 'Ata', justificativa: 'Decisão', criado_em: '2024-01-01', aplicado_em: '2024-01-02', criado_por: { nome_usuario: 'Secretário' }, itens: [{ id: 'item', conferencia_id: 'conferencia', mandato_id: null, revisado_em: null, autoridade_revisao: null, evidencia_revisao: null, conclusao_revisao: null, permite_reutilizacao: null, revisado_por: null }] }]), concluirRevisaoEleitoral: vi.fn(async () => ({})) }))
vi.mock('../api/oficiais', () => ({ oficiaisApi: api }))
describe('revisão eleitoral', () => {
  afterEach(() => { cleanup(); vi.clearAllMocks() })
  it('exige registro explícito para concluir revisão e autorizar reutilização', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(<QueryClientProvider client={client}><HistoricoRevisoesEleitorais pessoaId="pessoa" identidade="igreja:usuario" podeRegistrar /></QueryClientProvider>)
    fireEvent.click(await screen.findByText(/correção aplicada/))
    expect(screen.getByText(/pendente de revisão/)).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Autoridade da revisão'), { target: { value: 'Concílio' } })
    fireEvent.change(screen.getByLabelText('Evidência da revisão'), { target: { value: 'Ata' } })
    fireEvent.change(screen.getByLabelText('Conclusão da revisão'), { target: { value: 'Uso autorizado' } })
    fireEvent.click(screen.getByLabelText('A autoridade autorizou usar esta conferência em nova verificação de mandato.'))
    fireEvent.click(screen.getByLabelText('Registrei a conclusão formal referente a este ato.'))
    fireEvent.click(screen.getByRole('button', { name: 'Registrar conclusão da revisão' }))
    await waitFor(() => expect(api.concluirRevisaoEleitoral).toHaveBeenCalledWith('item', { autoridade: 'Concílio', evidencia: 'Ata', conclusao: 'Uso autorizado', permite_reutilizacao: true, ciente: true }))
  })
})
