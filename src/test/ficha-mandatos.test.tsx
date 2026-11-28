import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, expect, it, vi } from 'vitest'
import { RelogioIgreja } from '../pages/orgaos/RelogioIgreja'
import { MandatosOrgao } from '../pages/orgaos/MandatosOrgao'
import { gestaoOrgaosApi, orgaosApi, type VagaCargo } from '../api/orgaos'
import { oficiaisApi } from '../api/oficiais'

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
it.each([false, true])('consegue conferir um mandato com ou sem declaração de ordenação histórica (%s)', async historica => {
  vi.stubEnv('VITE_FEATURE_ORGAOS_GESTAO','true')
  vi.spyOn(orgaosApi,'mandatos').mockResolvedValue({ itens: [mandato], proximo_cursor: null, pode_registrar: true })
  vi.spyOn(oficiaisApi, 'selecaoAtas').mockImplementation(async tipo => ({
    contextos: [], tem_proxima: false, itens: [{
      documento_id: tipo, versao_id: 'versao-' + tipo, versao: 1, numero: 1, ano: 2032, sigla: tipo,
      data: tipo === 'ASSEMBLEIA' ? '2032-01-20' : '2032-02-05',
      data_reuniao: tipo === 'ASSEMBLEIA' ? '2032-01-15' : null,
      contexto: tipo, contexto_id: tipo, assunto: tipo === 'ASSEMBLEIA' ? 'Eleição' : 'Posse',
      pauta: '', arrolados: [], resolucoes: [], estado: 'APROVADO',
    }],
  }))
  const conferir = vi.spyOn(orgaosApi, 'previaMandato').mockResolvedValue({
    nome: 'Paulo', data_eleicao: '2032-01-15', data_posse: '2032-02-01', termino_previsto: '2037-01-31',
    versao: 1, previa: 'previa', reeleicao: true, transcricao_historica: false,
  })
  montar('2032-01-31')
  expect(await screen.findByText('No período do mandato')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Registrar reeleição' }))
  expect(screen.getByRole('group', { name: 'Reeleição de Paulo' })).toBeTruthy()
  expect(screen.queryByLabelText(/Indicação histórica/)).toBeNull()
  expect(screen.queryByLabelText(/Item da ata/)).toBeNull()
  const posse = screen.getByLabelText('Data da posse') as HTMLInputElement
  expect(posse.disabled).toBe(true)
  for (const rotulo of ['Ata da Assembleia que elegeu a pessoa', 'Ata que documenta a posse']) {
    const campo = screen.getByRole('textbox', { name: rotulo })
    fireEvent.click(within(campo.parentElement!).getByRole('button', { name: 'Selecionar' }))
    const dialogo = await screen.findByRole('dialog')
    fireEvent.click(await within(dialogo).findByRole('button', { name: 'Selecionar' }))
  }
  expect(screen.getByText('15/01/2032')).toBeTruthy()
  expect(posse.value).toBe('2032-02-05')
  expect(posse.min).toBe('2032-01-15')
  expect(posse.max).toBe('2032-02-05')
  fireEvent.change(posse, { target: { value: '2032-02-06' } })
  expect((screen.getByRole('button', { name: 'Conferir mandato' }) as HTMLButtonElement).disabled).toBe(true)
  fireEvent.change(posse, { target: { value: '2032-02-01' } })
  if (historica) {
    fireEvent.click(screen.getByRole('radio', { name: 'Registro de ordenação histórico não documentado' }))
    for (const rotulo of ['Data da ordenação', 'Autoridade da ordenação', 'Referência da ordenação']) {
      const campo = screen.getByLabelText(rotulo + ' (opcional)') as HTMLInputElement
      expect(campo.required).toBe(false)
      expect(campo.value).toBe('')
    }
  }
  fireEvent.click(screen.getByRole('button', { name: 'Conferir mandato' }))
  await screen.findByRole('button', { name: 'Confirmar registro' })
  expect(conferir).toHaveBeenCalledWith('conselho', {
    pessoa_id: 'eleito', ata_eleicao: 'versao-ASSEMBLEIA', ata_posse: 'versao-CONSELHO', data_posse: '2032-02-01', idempotencia: expect.any(String),
    ...(historica && { ordenacao: { historica: true } }),
  })
})

it.each([false, true])('registra o cargo pela ata com ajuste de datas opcional (%s)', async ajustar => {
  vi.spyOn(orgaosApi, 'mandatos').mockResolvedValue({ itens: [mandato], proximo_cursor: null, pode_registrar: false })
  vi.spyOn(gestaoOrgaosApi, 'atasCargos').mockResolvedValue({
    contextos: [], tem_proxima: false, itens: [{
      documento_id: 'ata', versao_id: 'versao', versao: 1, numero: 1, ano: 2027, sigla: 'CON', data: '2027-02-01',
      contexto: 'Conselho', contexto_id: 'ctx', assunto: 'Eleição', pauta: '', arrolados: [], resolucoes: [], estado: 'APROVADO',
    }],
  })
  vi.spyOn(gestaoOrgaosApi, 'candidatosCargo').mockImplementation(async (_orgao, _cargo, filtros) =>
    filtros.pessoa_id === mandato.oficial.pessoa.id && (!ajustar || filtros.posse === '2027-03-01') ? [{ id: 'eleito', nome_completo: 'Paulo', limite_exercicio: '2032-01-31', termino_sugerido: '2032-01-31' }] : [])
  const registrar = vi.spyOn(gestaoOrgaosApi, 'registrarEleicao').mockResolvedValue({ ato_id: 'ato', ocupacao_id: 'ocupacao' })
  montar('2027-02-02', [{ id: 'cargo', nome: 'Secretário', titulares: [] }])
  fireEvent.click(await screen.findByRole('button', { name: 'Atribuir cargo' }))
  fireEvent.click(screen.getByRole('button', { name: 'Selecionar cargo' }))
  expect(screen.getByRole('heading', { name: 'Eleição e posse · Secretário' })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Voltar' }))
  expect(screen.getByRole('heading', { name: 'Atribuir cargo a Paulo' })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Selecionar cargo' }))
  const mudar = (rotulo: string, value: string) => fireEvent.change(screen.getByLabelText(rotulo), { target: { value } })
  expect(screen.queryByLabelText(/Item da ata/)).toBeNull()
  expect(screen.queryByLabelText('Autoridade do ato')).toBeNull()
  expect(screen.queryByLabelText('Data da posse')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Selecionar' }))
  await screen.findByRole('button', { name: 'Detalhes' })
  fireEvent.click(screen.getByRole('button', { name: 'Selecionar' }))
  if (ajustar) {
    await screen.findByText(/Esta pessoa não está entre os candidatos elegíveis/)
    expect((screen.getByRole('button', { name: 'Confirmar ato' }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Ajustar posse e período' }))
    mudar('Data da posse', '2027-03-01')
    mudar('Último dia previsto no cargo', '2027-12-31')
    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }))
  }
  const confirmar = screen.getByRole('button', { name: 'Confirmar ato' }) as HTMLButtonElement
  await waitFor(() => expect(confirmar.disabled).toBe(false))
  fireEvent.click(confirmar)
  await waitFor(() => expect(registrar).toHaveBeenCalledWith('conselho', 'cargo', 'oficial', expect.objectContaining({
    pessoa_id: 'eleito', data_eleicao: '2027-02-01', data_posse: ajustar ? '2027-03-01' : '2027-02-01',
    termino_previsto: ajustar ? '2027-12-31' : '2032-01-31',
    comprovacao: { eleicao: { versao_id: 'versao' }, posse: { versao_id: 'versao' }, ...(!ajustar && { confirmar_historico: true }) },
  })))
})
