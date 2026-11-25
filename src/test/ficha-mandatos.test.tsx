import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, expect, it, vi } from 'vitest'
import { MandatosOrgao } from '../pages/orgaos/MandatosOrgao'
import { orgaosApi } from '../api/orgaos'

const mandato = { id: 'periodo', data_eleicao: '2026-11-01', data_posse: '2027-02-01', termino_previsto: '2032-01-31',
  termino_efetivo: null, versao_orgao: { numero: 1 }, pode_encerrar: false,
  oficial: { id: 'oficial', tipo: 'PRESBITERO_REGENTE' as const, ativo: true, pessoa: { id: 'eleito', nome_completo: 'Paulo' } } }
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllEnvs() })

function montar(dia: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}><MandatosOrgao identidade="igreja:operador" orgao="conselho" data={dia} conselho /></QueryClientProvider>)
}
it('exibe posse futura e omite registro e reeleição quando o servidor recusa o serviço', async () => {
  vi.stubEnv('VITE_FEATURE_ORGAOS_GESTAO','true')
  vi.spyOn(orgaosApi,'mandatos').mockResolvedValue({ itens: [mandato], proximo_cursor: null, pode_registrar: false })
  montar('2027-01-31')
  expect(await screen.findByText('Posse futura')).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Registrar mandato' })).toBeNull()
  expect(screen.queryByRole('button', { name: 'Registrar reeleição' })).toBeNull()
  expect(screen.getByRole('progressbar').getAttribute('value')).toBe('0')
})
it('oferece reeleição para a pessoa do mandato no último dia inclusivo', async () => {
  vi.stubEnv('VITE_FEATURE_ORGAOS_GESTAO','true')
  vi.spyOn(orgaosApi,'mandatos').mockResolvedValue({ itens: [mandato], proximo_cursor: null, pode_registrar: true })
  montar('2032-01-31')
  expect(await screen.findByText('No período do mandato')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Registrar reeleição' }))
  expect(screen.getByRole('group', { name: 'Reeleição de Paulo' })).toBeTruthy()
  expect(screen.queryByText('Indicação para esta eleição')).toBeNull()
})
