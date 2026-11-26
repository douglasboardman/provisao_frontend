import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { oficiaisApi } from '../api/oficiais'
import { Painel } from '../components/shared/Painel'
import { GestaoOficial } from '../pages/oficiais/GestaoOficial'
import { useAuthStore } from '../stores/auth'
import { Perfil } from '../types/enums'

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllEnvs() })

it('encerra o mandato com último dia de exercício, motivo e ata selecionada', async () => {
  vi.stubEnv('VITE_FEATURE_SECRETARIA', 'true')
  useAuthStore.setState({ user: { sub: 'usuario', igreja_id: 'igreja', login: 'login', username: 'Operador', perfil: Perfil.COMUM } })
  vi.spyOn(oficiaisApi, 'periodos').mockResolvedValue({ mandatos: [], vinculos: [] })
  vi.spyOn(oficiaisApi, 'selecaoAtas').mockResolvedValue({
    contextos: [], tem_proxima: false, itens: [{
      documento_id: 'ata', versao_id: 'versao', versao: 1, numero: 1, ano: 2026, sigla: 'CON', data: '2026-03-10',
      contexto: 'Conselho', contexto_id: 'conselho', assunto: 'Encerramento', pauta: '', arrolados: [], resolucoes: [], estado: 'APROVADO',
    }],
  })
  const encerrar = vi.spyOn(oficiaisApi, 'encerrar').mockResolvedValue({})
  render(<QueryClientProvider client={new QueryClient()}><Painel>
    <GestaoOficial voltar={() => {}} oficial={{ id: 'oficial', tipo: 'PRESBITERO_REGENTE', ativo: true, pessoa: { id: 'pessoa', nome_completo: 'Presbítero' } }}
      identidade="igreja:usuario" podeConsultarDetalhe={false} modoInicial="encerrar" periodoInicial="mandatos:mandato" />
  </Painel></QueryClientProvider>)
  expect(screen.queryByLabelText('Autoridade do ato')).toBeNull()
  expect(screen.queryByLabelText('Evidência do ato')).toBeNull()
  const salvar = screen.getByRole('button', { name: 'Salvar registro' }) as HTMLButtonElement
  expect(salvar.disabled).toBe(true)
  fireEvent.change(screen.getByLabelText('Último dia de exercício'), { target: { value: '2026-03-05' } })
  fireEvent.change(screen.getByLabelText('Motivo do encerramento'), { target: { value: 'Renúncia' } })
  fireEvent.click(screen.getByRole('button', { name: 'Selecionar' }))
  const dialogo = await screen.findByRole('dialog')
  fireEvent.click(await within(dialogo).findByRole('button', { name: 'Selecionar' }))
  fireEvent.click(salvar)
  await screen.findByText('Registro salvo.')
  expect(encerrar).toHaveBeenCalledWith('mandatos/mandato/encerrar', {
    data_efeito: '2026-03-05', motivo: 'Renúncia', ata_encerramento: 'versao',
  })
})
