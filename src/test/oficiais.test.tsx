import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { OficiaisPage } from '../pages/oficiais/OficiaisPage'
import { useAuthStore } from '../stores/auth'
import { oficiaisApi } from '../api/oficiais'
import { Perfil } from '../types/enums'

vi.mock('../api/pessoas', () => ({ pessoasApi: { list: vi.fn(async () => [{ id: 'p1', nome_completo: 'Pessoa Teste' }]) } }))
vi.mock('../api/oficiais', () => ({ oficiaisApi: {
  notificacoes: vi.fn(async () => []),
  meuAcesso: vi.fn(async () => ({ pode_consultar: false, pode_registrar: false })),
  cadastrar: vi.fn(async () => ({ id: 'id-2' })),
  alterarSituacao: vi.fn(async ({ id, ativo }: { id: string; ativo: boolean }) => ({ id, ativo })),
  listar: vi.fn(async () => ({ itens: [{ id: 'id-1', tipo: 'DIACONO', ativo: true, pessoa: { id: 'p1', nome_completo: 'Pessoa Teste' } }], proximo_cursor: null })),
  exercicio: vi.fn(async (_id: string, data: string) => ({ situacao: 'EM_EXERCICIO', data_referencia: data })),
  alertas: vi.fn(async () => []),
} }))

describe('consulta de oficiais', () => {
  afterEach(cleanup)
  beforeEach(() => useAuthStore.setState({ status: 'ready', user: { sub: 'user-1', igreja_id: 'church-1', perfil: Perfil.SECRETARIO, login: 'x', username: 'x' } }))
  it('mostra oficial e consulta exercício sem afirmar competência', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(<QueryClientProvider client={client}><OficiaisPage /></QueryClientProvider>)
    expect(await screen.findByText('Pessoa Teste')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Consultar exercício' }))
    expect(screen.queryByRole('heading', { name: 'Ofícios registrados' })).toBeNull()
    expect(screen.getByRole('heading', { name: 'Mandatos vigentes' })).toBeTruthy()
    expect(await screen.findByText(/Em exercício em/)).toBeTruthy()
    expect(screen.getByText(/não substitui a verificação de competência/)).toBeTruthy()
  })
  it('registra um ofício sem atribuir ordenação ou mandato', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(<QueryClientProvider client={client}><OficiaisPage /></QueryClientProvider>)
    fireEvent.click(screen.getByRole('button', { name: 'Registrar ofício' }))
    fireEvent.change(screen.getByLabelText('Pessoa'), { target: { value: 'Teste' } })
    fireEvent.click(await screen.findByRole('option', { name: 'Pessoa Teste' }))
    fireEvent.change(screen.getByLabelText('Ofício'), { target: { value: 'PRESBITERO_REGENTE' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar ofício' }))
    await vi.waitFor(() => expect(oficiaisApi.cadastrar).toHaveBeenCalledWith({ pessoa_id: 'p1', tipo: 'PRESBITERO_REGENTE' }, expect.anything()))
  })
  it('registra um segundo tipo de ofício como inativo e permite inativar o cadastro atual', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(<QueryClientProvider client={client}><OficiaisPage /></QueryClientProvider>)
    fireEvent.click(await screen.findByRole('button', { name: 'Inativar cadastro' }))
    await vi.waitFor(() => expect(oficiaisApi.alterarSituacao).toHaveBeenCalledWith({ id: 'id-1', ativo: false }, expect.anything()))
    fireEvent.click(screen.getByRole('button', { name: 'Registrar ofício' }))
    fireEvent.change(screen.getByLabelText('Pessoa'), { target: { value: 'Teste' } })
    fireEvent.click(await screen.findByRole('option', { name: 'Pessoa Teste' }))
    fireEvent.change(screen.getByLabelText('Ofício'), { target: { value: 'PRESBITERO_REGENTE' } })
    fireEvent.click(screen.getByLabelText('Registrar como inativo'))
    fireEvent.click(screen.getByRole('button', { name: 'Salvar ofício' }))
    await vi.waitFor(() => expect(oficiaisApi.cadastrar).toHaveBeenCalledWith({ pessoa_id: 'p1', tipo: 'PRESBITERO_REGENTE', ativo: false }, expect.anything()))
  })

})
