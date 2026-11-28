import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { referenciasAtaApi, type AtoParaReatribuir, type ReatribuicaoAtos } from '../api/referencias-ata'
import { useReatribuicaoAtos } from '../pages/secretaria/ReatribuirAtos'

const atos: AtoParaReatribuir[] = Array.from({ length: 35 }, (_, i) => ({
  referencia_id: `r${i}`, grupo: 'MEMBRESIA', alvo_id: `p${i}`, etapa: 'ATO', tipo: 'ADMISSAO',
  titulo: `Pessoa ${i}`, data: '2023-01-01', pode_reatribuir: i !== 34,
}))
function Form({ salvar }: { salvar: (escolha: ReatribuicaoAtos) => void }) {
  const r = useReatribuicaoAtos()
  return <><button onClick={() => void r.confirmar('ata', salvar)}>Salvar ata</button>{r.modal}</>
}
afterEach(() => { cleanup(); vi.restoreAllMocks() })
async function abrir(salvar = vi.fn()) {
  vi.spyOn(referenciasAtaApi, 'prepararReatribuicao').mockResolvedValue(atos)
  render(<Form salvar={salvar} />)
  fireEvent.click(screen.getByText('Salvar ata'))
  await screen.findByRole('dialog')
  return salvar
}
describe('Reatribuição de atos na nova versão', () => {
  it('mostra todos os atos, permite seleção parcial e preserva os não selecionados', async () => {
    const salvar = await abrir()
    expect(screen.getAllByRole('checkbox')).toHaveLength(36)
    expect(salvar).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('checkbox', { name: /^Pessoa 0 ·/ }))
    fireEvent.click(screen.getByRole('button', { name: 'SIM' }))
    expect(salvar).toHaveBeenCalledWith({ vistas: atos.map(a => a.referencia_id), selecionadas: ['r0'] })
  })
  it('marca todos apenas entre os atos permitidos e NÃO salva sem reatribuição', async () => {
    const salvar = await abrir()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Marcar todos' }))
    expect((screen.getByRole('checkbox', { name: /^Pessoa 33 ·/ }) as HTMLInputElement).checked).toBe(true)
    expect((screen.getByRole('checkbox', { name: /^Pessoa 34 ·/ }) as HTMLInputElement).disabled).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'NÃO' }))
    expect(salvar).toHaveBeenCalledWith({ vistas: atos.map(a => a.referencia_id), selecionadas: [] })
  })
  it('fechar o modal cancela o salvamento e nova tentativa consulta novamente', async () => {
    const salvar = await abrir()
    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }))
    expect(salvar).not.toHaveBeenCalled()
    fireEvent.click(screen.getByText('Salvar ata'))
    await screen.findByRole('dialog')
    expect(referenciasAtaApi.prepararReatribuicao).toHaveBeenCalledTimes(2)
  })
  it('consulta sem atos prossegue e falha de consulta impede salvar', async () => {
    const salvar = vi.fn()
    vi.spyOn(referenciasAtaApi, 'prepararReatribuicao').mockRejectedValueOnce(new Error('Falha na consulta')).mockResolvedValueOnce([])
    render(<Form salvar={salvar} />)
    fireEvent.click(screen.getByText('Salvar ata'))
    await screen.findByRole('alert')
    expect(salvar).not.toHaveBeenCalled()
    fireEvent.click(screen.getByText('Salvar ata'))
    await waitFor(() => expect(salvar).toHaveBeenCalledWith({ vistas: [], selecionadas: [] }))
  })
})
