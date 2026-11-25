import { useState } from 'react'
import type { IndicacaoCampo } from './procedenciaCampos'
import { Button } from '../../components/ui/button'
import { ehCampoNumeracao, origensCampo, type DefinicaoCampo, type ItemCampo, type ValorCampo } from '../../api/campos'

export function EntradaCampo({ id, campo, valor, indicacao, obrigatorio, alterar }: { id: string; campo: DefinicaoCampo; indicacao?: IndicacaoCampo; valor?: ValorCampo; obrigatorio: boolean; alterar: (v: ValorCampo) => void }) {
  const [proximo, preparar] = useState<ItemCampo | null>(null)
  const atual = valor?.valor ?? null
  const itens = Array.isArray(atual) ? atual : atual === null ? [] : [atual]
  const salvar = (v: ValorCampo['valor']) => alterar({ tipo: campo.tipo, multiplo: campo.multiplo, origem: valor?.origem.tipo === 'documento_anterior' ? valor.origem : { tipo: 'manual' }, ajustado_manualmente: true, valor: v })
  const input = (v: ItemCampo | null, definir: (v: ItemCampo | null) => void, idx: number) => {
    const label = campo.nome + (campo.multiplo ? ' · item ' + (idx+1) : '')
    if (campo.tipo === 'sim_nao') return <select className="rounded border p-2" aria-label={label} aria-describedby={indicacao ? 'origem-'+id : undefined} value={v === null ? '' : String(v)} onChange={e => definir(e.target.value === '' ? null : e.target.value === 'true')}><option value="">A preencher</option><option value="true">Sim</option><option value="false">Não</option></select>
    return <input className="rounded border p-2" aria-label={label} aria-describedby={indicacao ? 'origem-'+id : undefined} type={campo.tipo === 'numero' ? 'number' : campo.tipo === 'data' ? 'date' : 'text'} step="any" value={v === null ? '' : String(v)} onChange={e => definir(e.target.value === '' ? null : campo.tipo === 'numero' ? e.target.valueAsNumber : e.target.value)}/>
  }
  return <fieldset id={'valor-'+id} tabIndex={-1} className="space-y-1"><legend>{campo.nome}{obrigatorio ? ' (obrigatório)' : ''}</legend>
    {indicacao && <small id={'origem-'+id} className="block text-muted-foreground">{indicacao.detalhe}</small>}
    {campo.origem !== 'manual' ? <p className="text-sm">{ehCampoNumeracao(campo.origem) ? atual ?? 'Atribuído no primeiro encaminhamento.' : 'Obtido de ' + origensCampo[campo.origem].toLocaleLowerCase() + '.'}</p> : campo.multiplo ? <>
      {itens.map((x,i) => <div key={i} className="flex flex-wrap gap-1">{input(x, item => salvar(itens.flatMap((a,j) => i !== j ? [a] : item === null ? (campo.tipo === 'texto' ? [''] : []) : [item])),i)}
        <Button type="button" variant="outline" disabled={!i} aria-label={'Subir item '+(i+1)} onClick={() => { const copia = itens.slice(); copia.splice(i-1,0,...copia.splice(i,1)); salvar(copia) }}>↑</Button>
        <Button type="button" variant="outline" onClick={() => salvar(itens.filter((_,j) => j !== i))}>Remover</Button></div>)}
      {campo.tipo === 'texto' ? <Button type="button" variant="outline" onClick={() => salvar([...itens,''])}>Adicionar item</Button> : <div className="flex gap-1">
        {input(proximo,preparar,itens.length)}
        <Button type="button" variant="outline" disabled={proximo === null} onClick={() => { if (proximo !== null) { salvar([...itens,proximo]); preparar(null) } }}>Adicionar item</Button>
      </div>}
    </> : input(itens[0] ?? null,salvar,0)}
  </fieldset>
}
