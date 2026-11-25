import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../../../components/ui/dialog'
import { Button } from '../../../components/ui/button'
import type { ConfigPagina, Regiao } from '../../../api/pagina'

export const rotulos = { cabecalho: 'Cabeçalho', corpo: 'Corpo', rodape: 'Rodapé' }
export function Margens({ atual, fechar, aplicar, concilio }: { concilio?: boolean; atual: ConfigPagina; fechar: () => void; aplicar: (valor: ConfigPagina) => void }) {
  const [v, set] = useState(() => structuredClone(atual))
  const m = v.margens_cm
  const e = v.espacamento_cm
  const valores = [...Object.values(m), ...Object.values(e).flatMap(r => Object.values(r)), ...Object.values(v.altura_minima_cm ?? {})]
  const valida = valores.every(n => Number.isFinite(n) && n >= 0) && m.esquerda + m.direita < 21 &&
    m.superior + m.inferior + valores.slice(4).reduce((a,b) => a+b, 0) < 29.7
  function numero(label: string, valor: number, definir: (n: number) => void) {
    return <label key={label}>{label}<input type="number" min="0" max="29.7" step="any" value={Number.isFinite(valor) ? valor : ''}
      onChange={ev => definir(ev.currentTarget.valueAsNumber)} /></label>
  }
  return <Dialog open onOpenChange={aberto => { if (!aberto) fechar() }}><DialogContent className="margens-editor">
    <DialogTitle>Configuração da página</DialogTitle><DialogDescription>Página A4 em retrato. Medidas em centímetros.</DialogDescription>
    <div className="margens-painel"><div>
      <fieldset disabled={concilio}><legend>Margens da página</legend>{concilio && <p>O perfil do livro fixa as quatro margens em 3 cm.</p>}{(['superior','inferior','esquerda','direita'] as const).map(k =>
        numero(k, m[k], n => set({ ...v, margens_cm: { ...m, [k]: n } })))}</fieldset>
      {(Object.keys(rotulos) as Regiao[]).map(r => <fieldset key={r}><legend>{rotulos[r]}</legend>{(['superior','inferior'] as const).map(k =>
        numero(k, e[r][k], n => set({ ...v, espacamento_cm: { ...e, [r]: { ...e[r], [k]: n } } })))}
        {r !== 'corpo' && numero('Altura mínima (cm)', v.altura_minima_cm?.[r] ?? 0, n => set({ ...v, altura_minima_cm: { cabecalho: 0, rodape: 0, ...v.altura_minima_cm, [r]: n } }))}</fieldset>)}
    </div><div aria-label="Miniatura da página" className="margens-mini" style={{ padding: [m.superior,m.direita,m.inferior,m.esquerda].map(n => (n || 0)*5 + 'px').join(' ') }}>
      {(Object.keys(rotulos) as Regiao[]).map(r => <span key={r} className={r} style={{ paddingBlock: (e[r].superior || 0)*5+'px '+(e[r].inferior || 0)*5+'px' }}>{rotulos[r]}</span>)}
    </div></div>
    {!valida && <p role="alert">Ajuste as medidas para deixar espaço útil na página.</p>}
    <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={fechar}>Cancelar</Button>
      <Button type="button" disabled={!valida} onClick={() => { aplicar(v); fechar() }}>Aplicar</Button></div>
  </DialogContent></Dialog>
}
