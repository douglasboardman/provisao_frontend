import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { LoginPage } from '../pages/login/LoginPage'
import { authApi } from '../api/auth'
import { ApiRequestError } from '../api/client'
import { useAuthStore } from '../stores/auth'
import { Perfil } from '../types/enums'

const igreja = 'e0000000-0000-4000-8000-000000000001'
const credentials = { igreja_id: igreja, login: 'teste@example.invalid', senha: 'senha-sintetica' }
vi.mock('../api/auth', () => ({ authApi: { login: vi.fn() } }))
vi.mock('../api/igreja', () => ({ igrejaApi: { listPublic: vi.fn(async () => [{ id: igreja, nome: 'Igreja Teste' }]) } }))

function renderizar() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}><MemoryRouter initialEntries={['/login']}><Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/dashboard" element={<p>Área autenticada</p>} />
  </Routes></MemoryRouter></QueryClientProvider>)
}

async function entrar() {
  await screen.findByRole('option', { name: 'Igreja Teste' })
  fireEvent.change(screen.getByLabelText('Igreja'), { target: { value: igreja } })
  fireEvent.change(screen.getByPlaceholderText('E-mail'), { target: { value: credentials.login } })
  fireEvent.change(screen.getByPlaceholderText('Senha'), { target: { value: credentials.senha } })
  fireEvent.click(screen.getByRole('button', { name: 'Log in' }))
}

describe('login em duas etapas', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({ user: null, status: 'ready' })
  })
  afterEach(cleanup)

  it('exibe somente igreja, e-mail e senha e mantém credenciais inválidas na primeira etapa', async () => {
    vi.mocked(authApi.login).mockRejectedValueOnce(new ApiRequestError(401, ['Credenciais inválidas.']))
    renderizar()
    expect(screen.queryByLabelText('Código de autenticação')).toBeNull()
    await entrar()
    await screen.findByRole('alert')
    expect(screen.queryByLabelText('Código de autenticação')).toBeNull()
    expect(authApi.login).toHaveBeenCalledWith(credentials)
    expect(useAuthStore.getState().user).toBeNull()
  })

  it.each([Perfil.ADMINISTRADOR, Perfil.COMUM])('pede apenas o código para %s com MFA e permite recuperação após código inválido', async perfil => {
    vi.mocked(authApi.login)
      .mockRejectedValueOnce(new ApiRequestError(401, ['Código necessário.'], 'MFA_REQUIRED'))
      .mockRejectedValueOnce(new ApiRequestError(401, ['Código inválido.']))
      .mockResolvedValueOnce({ sub: 'usuario', igreja_id: igreja, perfil, username: 'Teste', login: credentials.login })
    const { container } = renderizar()
    await entrar()
    const codigo = await screen.findByLabelText('Código de autenticação')
    expect(container.querySelectorAll('input')).toHaveLength(1)
    expect(screen.queryByLabelText('Igreja')).toBeNull()
    expect(screen.queryByPlaceholderText('Senha')).toBeNull()
    expect(useAuthStore.getState().user).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar código' }))
    await screen.findByText('Informe o código de autenticação.')
    expect(authApi.login).toHaveBeenCalledTimes(1)
    fireEvent.change(codigo, { target: { value: 'ABCD-1234' } })
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar código' }))
    await screen.findByText(/Use 6 dígitos do autenticador/)
    expect(authApi.login).toHaveBeenCalledTimes(1)
    fireEvent.change(codigo, { target: { value: '123456' } })
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar código' }))
    await screen.findByText('Código inválido.')
    expect(screen.queryByPlaceholderText('E-mail')).toBeNull()
    fireEvent.change(codigo, { target: { value: 'abcdef0123456789abcdef01' } })
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar código' }))
    await screen.findByText('Área autenticada')
    expect(authApi.login).toHaveBeenLastCalledWith({ ...credentials, mfa_code: 'abcdef0123456789abcdef01' })
    expect(useAuthStore.getState().user?.perfil).toBe(perfil)
  })

  it('volta ao login apagando a senha e o código', async () => {
    vi.mocked(authApi.login).mockRejectedValueOnce(new ApiRequestError(401, ['Código necessário.'], 'MFA_REQUIRED'))
    renderizar()
    await entrar()
    fireEvent.change(await screen.findByLabelText('Código de autenticação'), { target: { value: '123456' } })
    fireEvent.click(screen.getByRole('button', { name: 'Voltar ao login' }))
    expect((screen.getByPlaceholderText('Senha') as HTMLInputElement).value).toBe('')
    expect(screen.queryByLabelText('Código de autenticação')).toBeNull()
  })

  it('entra diretamente quando a conta não exige segundo fator', async () => {
    vi.mocked(authApi.login).mockResolvedValueOnce({ sub: 'usuario', igreja_id: igreja, perfil: Perfil.COMUM, username: 'Teste', login: credentials.login })
    renderizar()
    await entrar()
    await waitFor(() => expect(screen.getByText('Área autenticada')).toBeTruthy())
    expect(authApi.login).toHaveBeenCalledTimes(1)
  })
})
