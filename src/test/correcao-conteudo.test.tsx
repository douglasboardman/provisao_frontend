import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CorrecaoConteudo } from '../pages/oficiais/CorrecaoConteudo'
const api = vi.hoisted(() => ({ correcoesConteudo: vi.fn(async () => []), eventosParaCorrecao: vi.fn(async () => [{ id: 'evento', tipo_evento: 'ADMISSAO', data_evento: '2024-01-01', ordem_dia: null, rol: 'COMUNGANTES' }]), previaConteudo: vi.fn(async () => ({ hash: 'hash', data_evento: '2024-01-01', dados_anteriores: { tipo_evento: 'ADMISSAO', rol: 'COMUNGANTES', rol_origem: null, motivacao_evento: 'PROFISSAO_DE_FE' }, dados_novos: { tipo_evento: 'ADMISSAO', rol: 'NAO_COMUNGANTES', rol_origem: null, motivacao_evento: 'PROFISSAO_DE_FE' }, bloqueada: false, observacao: 'Prévia sintética', mandatos: [], conferencias: [] })), aplicarConteudo: vi.fn() }))
vi.mock('../api/oficiais', () => ({ oficiaisApi: api }))
vi.mock('../hooks/use-enum-relations', () => ({ useEnumRelations: () => ({ isLoading: false, getMapping: () => null, getFilter: (nome: string) => nome === 'Rols de Admissão' ? ['NAO_COMUNGANTES'] : nome === 'Motivações de Admissão' ? ['PROFISSAO_DE_FE'] : [] }) }))
describe('correção de conteúdo de membresia', () => {
  afterEach(() => { cleanup(); vi.clearAllMocks() })
  it('mostra os valores anterior e proposto para auditor, sem permitir confirmação', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(<QueryClientProvider client={client}><CorrecaoConteudo pessoaId="pessoa" identidade="igreja:auditor" podeRegistrar={false} /></QueryClientProvider>)
    fireEvent.click(screen.getByRole('button', { name: 'Conferir correção de tipo ou rol' }))
    await screen.findByRole('option', { name: /2024/ })
    fireEvent.change(screen.getByLabelText('Evento a corrigir'), { target: { value: 'evento' } })
    fireEvent.change(screen.getByLabelText('Rol corrigido'), { target: { value: 'NAO_COMUNGANTES' } })
    fireEvent.change(screen.getByLabelText('Motivação corrigida'), { target: { value: 'PROFISSAO_DE_FE' } })
    await waitFor(() => expect((screen.getByRole('button', { name: 'Gerar prévia do conteúdo' }) as HTMLButtonElement).disabled).toBe(false))
    fireEvent.click(screen.getByRole('button', { name: 'Gerar prévia do conteúdo' }))
    await screen.findByText('Prévia sintética')
    expect(api.previaConteudo).toHaveBeenCalledWith('pessoa', { evento_id: 'evento', tipo_evento: 'ADMISSAO', rol: 'NAO_COMUNGANTES', motivacao_evento: 'PROFISSAO_DE_FE' })
    expect(screen.getByText('Seu acesso permite apenas consultar a prévia.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Confirmar conteúdo' })).toBeNull()
  })
})
