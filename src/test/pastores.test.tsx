import { describe, it, expect, vi, afterEach } from 'vitest'
import { cleanup, render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Pastores } from '../pages/oficiais/Pastores'
import { pastoresApi } from '../api/pastores'
vi.mock('../api/pastores', () => ({ pastoresApi: { listar: vi.fn(async () => []), cadastrar: vi.fn(async () => ({ id: 'p' })) } }))
vi.mock('../api/pessoas', () => ({ pessoasApi: { list: vi.fn(async () => [{ id: 'pessoa', nome_completo: 'Pastor Teste' }]) } }))
function renderizar(admin = true, cadastrar = true) { return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><Pastores identidade="teste" data="2026-11-28" administrador={admin} podeCadastrar={cadastrar} podeGerir={false} /></QueryClientProvider>) }
afterEach(() => { cleanup(); vi.clearAllMocks() })
describe('Equipe pastoral', () => {
  it('envia o cadastro completo em uma única operação', async () => {
    renderizar(); await screen.findByText('Nenhuma presidência registrada na data')
    fireEvent.click(screen.getByRole('button', { name: 'Cadastrar pastor' }))
    fireEvent.change(screen.getByLabelText('Pessoa vinculada'), { target: { value: 'Pastor' } })
    fireEvent.click(await screen.findByRole('option', { name: 'Pastor Teste' }))
    fireEvent.change(screen.getByLabelText('Função na igreja'), { target: { value: 'PRESIDENTE' } })
    for (const [label, value] of [['Data da ordenação', '2000-01-01'], ['Responsável / concílio ordenador', 'Presbitério'], ['Documento da ordenação', 'Ata 1'], ['Data de início', '2026-01-01'], ['Modalidade do vínculo (efetivo, auxiliar, designado…)', 'Efetivo'], ['Concílio responsável', 'Presbitério local'], ['Ato de eleição ou designação', 'Eleição'], ['Referência documental do vínculo e da função', 'Ata 2']]) fireEvent.change(screen.getByLabelText(label), { target: { value } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar cadastro pastoral' }))
    await vi.waitFor(() => expect(pastoresApi.cadastrar).toHaveBeenCalledWith({ pessoa_id: 'pessoa', funcao: 'PRESIDENTE', ordenacao: { data: '2000-01-01', responsavel: 'Presbitério', documento: 'Ata 1' }, inicio: '2026-01-01', modalidade: 'Efetivo', concilio: 'Presbitério local', ato: 'Eleição', evidencia: 'Ata 2' }))
    await screen.findByRole('heading', { name: 'Equipe pastoral' })
  })
  it('mantém consulta sem oferecer comandos a quem não pode cadastrar', async () => {
    renderizar(false, false); await screen.findByText('Nenhuma presidência registrada na data')
    expect(screen.queryByRole('button', { name: 'Cadastrar pastor' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Registrar presidência' })).toBeNull()
  })
  it('não oferece presidência no cadastro de operador comum', async () => {
    renderizar(false); await screen.findByText('Nenhuma presidência registrada na data')
    fireEvent.click(screen.getByRole('button', { name: 'Cadastrar pastor' }))
    expect(screen.queryByRole('option', { name: 'Pastor presidente do Conselho e da igreja' })).toBeNull()
  })
})
