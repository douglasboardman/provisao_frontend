import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, expect, it, vi } from 'vitest'
import { RelogioIgreja } from '../pages/orgaos/RelogioIgreja'
import { MandatosOrgao } from '../pages/orgaos/MandatosOrgao'
import { gestaoOrgaosApi, orgaosApi, type VagaCargo } from '../api/orgaos'

const mandato = { id: 'periodo', data_eleicao: '2026-11-01', data_posse: '2027-02-01', termino_previsto: '2032-01-31',
  termino_efetivo: null, versao_orgao: { numero: 1 }, pode_encerrar: false,
  oficial: { id: 'oficial', tipo: 'PRESBITERO_REGENTE' as const, ativo: true, pessoa: { id: 'eleito', nome_completo: 'Paulo' } } }
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllEnvs() })

function montar(dia: string, cargos?: VagaCargo[]) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}><RelogioIgreja dia={dia}><MandatosOrgao identidade="igreja:operador" orgao="conselho" data={dia} cargos={cargos} podeAtribuir={!!cargos} conselho /></RelogioIgreja></QueryClientProvider>)
}
it('exibe posse futura e omite registro e reeleição quando o servidor recusa o serviço', async () => {
  vi.stubEnv('VITE_FEATURE_ORGAOS_GESTAO','true')
  vi.spyOn(orgaosApi,'mandatos').mockResolvedValue({ itens: [mandato], proximo_cursor: null, pode_registrar: false })
  montar('2027-01-31')
  expect(await screen.findByText('Posse futura')).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Registrar mandato' })).toBeNull()
  expect(screen.queryByRole('button', { name: 'Registrar reeleição' })).toBeNull()
  expect(screen.queryByRole('button', { name: 'Atribuir cargo' })).toBeNull()
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

it('atribui o cargo ao titular selecionado somente após conferir a elegibilidade nas datas do ato', async () => {
  vi.spyOn(orgaosApi, 'mandatos').mockResolvedValue({ itens: [mandato], proximo_cursor: null, pode_registrar: false })
  vi.spyOn(gestaoOrgaosApi, 'atasCargos').mockResolvedValue({
    contextos: [], tem_proxima: false, itens: [{
      documento_id: 'ata', versao_id: 'versao', versao: 1, numero: 1, ano: 2027, sigla: 'CON', data: '2027-02-01',
      contexto: 'Conselho', contexto_id: 'ctx', assunto: 'Eleição', pauta: '', arrolados: [], resolucoes: [], estado: 'APROVADO',
    }],
  })
  vi.spyOn(gestaoOrgaosApi, 'candidatosCargo').mockImplementation(async (_orgao, _cargo, filtros) =>
    filtros.pessoa_id === mandato.oficial.pessoa.id && filtros.posse === '2027-03-01' ? [{ id: 'eleito', nome_completo: 'Paulo', limite_exercicio: '2032-01-31' }] : [])
  const registrar = vi.spyOn(gestaoOrgaosApi, 'registrarEleicao').mockResolvedValue({ ato_id: 'ato', ocupacao_id: 'ocupacao' })
  montar('2027-02-01', [{ id: 'cargo', nome: 'Secretário', titulares: [] }])
  fireEvent.click(await screen.findByRole('button', { name: 'Atribuir cargo' }))
  fireEvent.click(screen.getByRole('button', { name: 'Selecionar cargo' }))
  expect(screen.getByRole('heading', { name: 'Eleição e posse · Secretário' })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Voltar' }))
  expect(screen.getByRole('heading', { name: 'Atribuir cargo a Paulo' })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Selecionar cargo' }))
  const mudar = (rotulo: string, value: string) => fireEvent.change(screen.getByLabelText(rotulo), { target: { value } })
  mudar('Data da posse', '2027-02-01')
  fireEvent.click(screen.getByRole('button', { name: 'Selecionar' }))
  fireEvent.click(await screen.findByRole('button', { name: 'Detalhes' }))
  fireEvent.click(screen.getByRole('button', { name: 'Selecionar' }))
  await screen.findByText(/Esta pessoa não está entre os candidatos elegíveis/)
  expect((screen.getByRole('button', { name: 'Confirmar ato' }) as HTMLButtonElement).disabled).toBe(true)
  mudar('Data da posse', '2027-03-01')
  mudar('Último dia previsto no cargo', '2027-12-31')
  mudar('Item da ata que identifica a pessoa e o ato', 'Item 1')
  mudar('Item da ata que documenta a posse', 'Item 2')
  mudar('Autoridade do ato', 'Conselho')
  const confirmar = screen.getByRole('button', { name: 'Confirmar ato' }) as HTMLButtonElement
  await waitFor(() => expect(confirmar.disabled).toBe(false))
  fireEvent.click(confirmar)
  await waitFor(() => expect(registrar).toHaveBeenCalledWith('conselho', 'cargo', 'oficial', expect.objectContaining({
    pessoa_id: 'eleito', data_eleicao: '2027-02-01', data_posse: '2027-03-01', termino_previsto: '2027-12-31',
  })))
})
