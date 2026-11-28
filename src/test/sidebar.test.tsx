import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, expect, it, vi } from 'vitest'
import { autorizacaoApi } from '../api/autorizacao'
import { Sidebar } from '../components/layout/Sidebar'
import { useAuthStore } from '../stores/auth'
import { Perfil } from '../types/enums'

afterEach(() => { cleanup(); vi.restoreAllMocks() })

it.each([
  { perfil: Perfil.COMUM, concessoes: [], rotulo: 'Conta comum' },
  { perfil: Perfil.COMUM, concessoes: ['Secretário Conselho'], rotulo: 'Secretário Conselho' },
])('identifica a conta na barra lateral como $rotulo', async ({ perfil, concessoes, rotulo }) => {
  useAuthStore.setState({ status: 'ready', user: { sub: 'conta', igreja_id: 'igreja', username: 'Douglas', login: 'douglas', perfil } })
  vi.spyOn(autorizacaoApi, 'navegacao').mockResolvedValue({ permissoes: {}, perfis_atuacao: concessoes })
  const client = new QueryClient()
  render(<QueryClientProvider client={client}><MemoryRouter><Sidebar /></MemoryRouter></QueryClientProvider>)
  expect(await screen.findByTitle(rotulo)).toBeTruthy()
})
