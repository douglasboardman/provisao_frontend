import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { autorizacaoApi, type AtuacaoConta } from '../api/autorizacao'
import { AcessosDaConta, MinhaContaComum } from '../pages/configuracoes/AtuacaoConta'
import type { Usuario } from '../types/models'
import { Perfil } from '../types/enums'

const dados: AtuacaoConta = { pessoa_id: 'p', conta_atuacao: false, selecionada_id: 'anterior', servicos_propostos: [], cargos_propostos: [], atribuicoes: [] }
function montar(elemento: React.ReactNode) {
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{elemento}</QueryClientProvider>)
}
afterEach(() => { cleanup(); vi.restoreAllMocks() })
it.each([
  { selecionada: null, ativa: false, acao: 'Selecionar como conta de atuação' },
  { selecionada: 'anterior', ativa: false, acao: 'Trocar a atuação para esta conta' },
  { selecionada: 'nova', ativa: true, acao: 'Retirar conta de atuação' },
])('executa "$acao" diretamente e envia a seleção anterior', async ({ selecionada, ativa, acao }) => {
  vi.spyOn(autorizacaoApi, 'conta').mockResolvedValue({ ...dados, selecionada_id: selecionada, conta_atuacao: ativa })
  const trocar = vi.spyOn(autorizacaoApi, 'escolher').mockResolvedValue({})
  montar(<AcessosDaConta usuario={{ id: 'nova', ativo: true, perfil: Perfil.COMUM } as Usuario}/>)
  const botao = await screen.findByRole('button', { name: acao })
  expect((botao as HTMLButtonElement).disabled).toBe(false)
  expect(screen.queryByLabelText('Fundamento da alteração')).toBeNull()
  fireEvent.click(botao)
  await waitFor(() => expect(trocar).toHaveBeenCalledWith('p', selecionada, ativa ? null : 'nova'))
})
it('concede e revoga uma atribuição individual sem pedir fundamento', async () => {
  vi.spyOn(autorizacaoApi, 'conta').mockResolvedValue({
    ...dados,
    catalogo: [{ acao: 'PESSOAS_CADASTRAR', rotulo: 'Cadastrar pessoas' }],
    atribuicoes: [{ id: 'atribuicao', acao: 'PESSOAS_CONSULTAR', inicio: '2026-01-01T00:00:00.000Z', fim: null }],
  })
  const conceder = vi.spyOn(autorizacaoApi, 'conceder').mockResolvedValue({})
  const revogar = vi.spyOn(autorizacaoApi, 'revogar').mockResolvedValue({})
  montar(<AcessosDaConta usuario={{ id: 'conta', ativo: true, perfil: Perfil.COMUM } as Usuario}/>)
  fireEvent.click(await screen.findByRole('tab', { name: 'Atribuições' }))
  fireEvent.click(screen.getByText('Nova atribuição'))
  expect(screen.queryByLabelText('Fundamento da alteração')).toBeNull()
  const registrar = screen.getByRole('button', { name: 'Registrar atribuição' }) as HTMLButtonElement
  expect(registrar.disabled).toBe(false)
  fireEvent.click(registrar)
  await screen.findByText('Alteração registrada.')
  expect(conceder).toHaveBeenCalledWith('conta', 'PESSOAS_CADASTRAR', expect.any(String), null)
  fireEvent.click(screen.getByRole('button', { name: 'Revogar Consultar o cadastro de pessoas' }))
  await waitFor(() => expect(revogar).toHaveBeenCalledWith('atribuicao'))
})
it('apresenta as atribuições em avaliação da própria conta sem habilitar módulos', async () => {
  vi.spyOn(autorizacaoApi, 'me').mockResolvedValue({ ...dados, servicos_propostos: [{ acao: 'AUDITORIA_CONSULTAR', permite: true }] })
  montar(<MinhaContaComum/>)
  await screen.findByText('Consultar auditoria')
  expect(screen.queryByRole('link')).toBeNull()
  expect(screen.queryByRole('button')).toBeNull()
})
