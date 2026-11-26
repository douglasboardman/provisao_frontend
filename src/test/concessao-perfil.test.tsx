import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { autorizacaoApi } from '../api/autorizacao'
import { PerfisAtuacaoPage } from '../pages/configuracoes/PerfisAtuacaoPage'

afterEach(() => { cleanup(); vi.restoreAllMocks() })

it('confirma e revoga um perfil de acesso sem solicitar fundamento', async () => {
  const acao = { acao: 'PESSOAS_CONSULTAR', rotulo: 'Consultar pessoas' }
  vi.spyOn(autorizacaoApi, 'perfisAtuacao').mockResolvedValue({
    pode_criar: false, modelos: [{ id: 'perfil', nome: 'Presidente da Igreja', requisito: 'Vínculo pastoral em exercício', acoes: [acao] }],
  })
  vi.spyOn(autorizacaoApi, 'concessoesPerfil').mockResolvedValue({
    contas: [{ id: 'nova', nome_usuario: 'Conta elegível', email_login: 'nova@example.invalid' }],
    concessoes: [{
      id: 'concessao', usuario_id: 'conta', nome_usuario: 'Conta existente', email_login: 'conta@example.invalid',
      inicio: '2026-01-01T00:00:00.000Z', fim: null, vigente: true,
    }],
  })
  const previa = vi.spyOn(autorizacaoApi, 'previaConcessaoPerfil').mockResolvedValue({
    previa: 'previa', fim: null, itens: [{ ...acao, sobreposta: false }],
  })
  const conceder = vi.spyOn(autorizacaoApi, 'concederPerfil').mockResolvedValue({ id: 'nova-concessao', atribuidas: 1 })
  const revogar = vi.spyOn(autorizacaoApi, 'revogarPerfil').mockResolvedValue({})
  render(<QueryClientProvider client={new QueryClient()}><PerfisAtuacaoPage /></QueryClientProvider>)

  fireEvent.change(await screen.findByLabelText('Conta de atuação elegível'), { target: { value: 'nova' } })
  fireEvent.click(screen.getByRole('button', { name: 'Gerar prévia' }))
  const confirmar = await screen.findByRole('button', { name: 'Confirmar concessão' }) as HTMLButtonElement
  expect(previa).toHaveBeenCalledWith('perfil', 'nova')
  expect(screen.queryByLabelText('Fundamento da concessão')).toBeNull()
  expect(confirmar.disabled).toBe(false)
  fireEvent.click(confirmar)
  await screen.findByText('Perfil atribuído.')
  expect(conceder).toHaveBeenCalledWith('perfil', 'nova', 'previa')

  fireEvent.click(screen.getByRole('button', { name: 'Revogar concessão de Conta existente' }))
  const dialogo = within(await screen.findByRole('dialog'))
  expect(dialogo.queryByLabelText('Fundamento da revogação')).toBeNull()
  fireEvent.click(dialogo.getByRole('button', { name: 'Revogar concessão' }))
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  expect(revogar).toHaveBeenCalledWith('concessao')
})
