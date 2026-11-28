import { Suspense } from 'react'
import { MemoryRouter, Outlet } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import App from '../App'
import { apiClient } from '../api/client'
import { authApi } from '../api/auth'
import { useAuthStore } from '../stores/auth'
import { Perfil } from '../types/enums'

vi.mock('../components/layout/AppLayout', () => ({
  AppLayout: () => <Suspense fallback={<p>Carregando…</p>}><Outlet /></Suspense>,
}))
const perfilPessoal = {
  igreja: 'Igreja de teste',
  pessoa: { nome_completo: 'Pessoa vinculada', email: 'pessoa@example.invalid', telefone_celular: null,
    cidade: 'Uruguaiana', estado: 'RS', data_nascimento: '1980-01-01' },
  familia: { nome_familia: 'Família de teste', pessoas: [{ id: 'familiar', nome_completo: 'Familiar de teste' }] },
  eventos: [], mandatos: [], reunioes: [], proposicoes: [],
  contribuicoes: [{ id: 'contribuicao', data_transacao: '2026-01-01', valor: '125.00' }],
}
const restaurar = useAuthStore.getState().restore
function montar(perfil: Perfil, comPessoa = true) {
  useAuthStore.setState({ status: 'ready', restore: vi.fn(async () => {}),
    user: { sub: 'conta-' + perfil, igreja_id: 'igreja', perfil, username: 'Minha conta', login: 'conta@example.invalid' } })
  vi.spyOn(apiClient, 'get').mockImplementation(async path => {
    if (path === 'perfil') return (comPessoa ? perfilPessoal : { igreja: perfilPessoal.igreja, pessoa: null }) as never
    throw new Error('Consulta inesperada: ' + path)
  })
  vi.spyOn(authApi, 'mfaStatus').mockResolvedValue({ enabled: false, required: false })
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter initialEntries={['/perfil']}><App /></MemoryRouter>
  </QueryClientProvider>)
}
afterEach(() => { cleanup(); vi.restoreAllMocks(); useAuthStore.setState({ user: null, restore: restaurar }) })
it.each(Object.values(Perfil))('abre o perfil completo e a segurança na rota /perfil para %s', async perfil => {
  montar(perfil)
  expect(await screen.findByRole('heading', { name: 'Meu perfil' })).toBeTruthy()
  expect(await screen.findByText('Pessoa vinculada')).toBeTruthy()
  expect(screen.getByText('Família de teste')).toBeTruthy()
  expect(screen.getByText('Familiar de teste')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Vida eclesiástica' }))
  expect(screen.getByRole('heading', { name: 'Histórico de membresia' })).toBeTruthy()
  expect(screen.getByRole('heading', { name: 'Mandatos' })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Contribuições' }))
  expect(screen.getByText(/125,00/)).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Segurança' }))
  expect(screen.getByRole('button', { name: 'Alterar senha' })).toBeTruthy()
  expect(screen.getByRole('heading', { name: 'Autenticação em duas etapas' })).toBeTruthy()
  expect(await screen.findByRole('button', { name: 'Iniciar configuração' })).toBeTruthy()
  expect(apiClient.get).toHaveBeenCalledWith('perfil')
})
it('mantém as seções e a segurança para uma conta sem pessoa vinculada', async () => {
  montar(Perfil.COMUM, false)
  expect(await screen.findByRole('heading', { name: 'Conta sem pessoa vinculada' })).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Vida eclesiástica' })).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Contribuições' })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Segurança' }))
  expect(screen.getByRole('button', { name: 'Alterar senha' })).toBeTruthy()
  expect(await screen.findByRole('button', { name: 'Iniciar configuração' })).toBeTruthy()
})
