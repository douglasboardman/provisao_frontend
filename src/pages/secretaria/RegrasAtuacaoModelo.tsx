import type { PapelModelo, RegraAtuacao } from '../../api/secretaria'
import { Button } from '../../components/ui/button'
import { Check } from './formulario'

const acoes = { criar: 'Quem pode criar este documento?', preparar: 'Quem pode preparar a minuta?', assinar: 'Quem deve assinar?' }

export function RegrasAtuacaoModelo({ regra, alterar, opcoes, finalidade, assembleia }: {
  regra: RegraAtuacao; alterar: (r: RegraAtuacao) => void; opcoes: PapelModelo[]; finalidade: string; assembleia: boolean
}) {
  const primeiro = opcoes.find(p => ['SECRETARIO','PRIMEIRO_SECRETARIO'].includes(p.codigo) && regra.assinar.includes(p.id))
  const segundo = opcoes.find(p => p.codigo === 'SEGUNDO_SECRETARIO')
  function marcar(acao: keyof typeof acoes, id: string, marcado: boolean) {
    const atualizada = { ...regra, [acao]: marcado ? [...regra[acao], id] : regra[acao].filter(v => v !== id) }
    const s = atualizada.substituicao_assinatura
    if (s && (!atualizada.assinar.includes(s.titular) || atualizada.assinar.includes(s.substituto))) delete atualizada.substituicao_assinatura
    alterar(atualizada)
  }
  function sugerir() {
    const ids = (...codigos: string[]) => opcoes.filter(p => codigos.includes(p.codigo)).map(p => p.id)
    const presidente = ids('PRESIDENCIA_CONSELHO', 'PRESIDENTE')
    const secretario = ids('SECRETARIO', 'PRIMEIRO_SECRETARIO')
    const ata = finalidade.startsWith('ATA')
    if (assembleia && ata) alterar({ criar: ids('SECRETARIO_MESA'), preparar: secretario, assinar: ids('SECRETARIO_MESA', 'PRESIDENTE_MESA') })
    else if (finalidade === 'CONVOCACAO') alterar({ criar: presidente, preparar: [], assinar: presidente })
    else alterar({ criar: secretario, preparar: [], assinar: ata ? [...presidente, ...secretario] : secretario })
  }
  return <section className="space-y-3 rounded-lg border p-3">
    <div className="flex flex-wrap items-center justify-between gap-2"><h4 className="font-semibold">Atuação por cargo</h4>
      {!!opcoes.length && <Button type="button" size="sm" variant="outline" onClick={sugerir}>Usar sugestão de cargos</Button>}
    </div>
    <p className="text-sm">Para criar ou preparar, basta ocupar um dos cargos marcados na ação. Cada cargo marcado para assinatura precisa estar representado.</p>
    {(['criar','preparar','assinar'] as const).map(acao => <details key={acao} open={acao === 'criar'}><summary>{acoes[acao]} ({regra[acao].length})</summary>
      <fieldset className="grid gap-1 py-2"><legend className="sr-only">{acoes[acao]}</legend>
        {opcoes.map(p => <Check key={p.id} label={p.nome} checked={regra[acao].includes(p.id)}
          onChange={marcado => marcar(acao, p.id, marcado)}/>)}
        {regra[acao].filter(id => !opcoes.some(p => p.id === id)).map(id => <Check key={id} label="Cargo indisponível" checked onChange={() => marcar(acao, id, false)}/>)}
        {acao === 'assinar' && primeiro && segundo && !regra.assinar.includes(segundo.id) &&
          <Check label="Permitir que o segundo secretário assine no lugar do primeiro" checked={!!regra.substituicao_assinatura}
            onChange={marcado => alterar({ ...regra, substituicao_assinatura: marcado ? { titular: primeiro.id, substituto: segundo.id } : undefined })}/>}
        {acao === 'assinar' && regra.substituicao_assinatura && (!primeiro || !segundo) &&
          <Check label="Substituição de assinatura com cargo indisponível" checked onChange={() => alterar({ ...regra, substituicao_assinatura: undefined })}/>}
      </fieldset></details>)}
    {assembleia && <p className="text-sm">A presidência e a secretaria da mesa correspondem às pessoas escolhidas para aquela assembleia.</p>}
  </section>
}
