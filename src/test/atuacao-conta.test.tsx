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
it('exige fundamento e envia a conta anterior conferida ao trocar o login de atuação', async () => {
  vi.spyOn(autorizacaoApi, 'conta').mockResolvedValue(dados)
  const trocar = vi.spyOn(autorizacaoApi, 'escolher').mockResolvedValue({})
  montar(<AcessosDaConta usuario={{ id: 'nova', ativo: true, perfil: Perfil.COMUM } as Usuario}/>)
  const botao = await screen.findByRole('button', { name: 'Trocar a atuação para esta conta' })
  expect((botao as HTMLButtonElement).disabled).toBe(true)
  fireEvent.change(screen.getByLabelText('Fundamento da alteração'), { target: { value: 'Identidade conferida' } })
  fireEvent.click(botao)
  await waitFor(() => expect(trocar).toHaveBeenCalledWith('p', 'anterior', 'nova', 'Identidade conferida'))
})
it('apresenta as atribuições em avaliação da própria conta sem habilitar módulos', async () => {
  vi.spyOn(autorizacaoApi, 'me').mockResolvedValue({ ...dados, servicos_propostos: [{ acao: 'AUDITORIA_CONSULTAR', permite: true }] })
  montar(<MinhaContaComum/>)
  await screen.findByText('Consultar auditoria')
  expect(screen.queryByRole('link')).toBeNull()
  expect(screen.queryByRole('button')).toBeNull()
})
