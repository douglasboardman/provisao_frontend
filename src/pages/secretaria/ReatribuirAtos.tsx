import { useRef, useState } from 'react'
import { referenciasAtaApi, gruposAta, etapasAta, type AtoParaReatribuir, type ReatribuicaoAtos } from '../../api/referencias-ata'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '../../components/ui/dialog'
import { Button } from '../../components/ui/button'
import { Check } from './formulario'
import { formatarDataCivil } from '../../lib/membresia-temporal'

type Pedido = { atos: AtoParaReatribuir[]; salvar: (escolha: ReatribuicaoAtos) => void }

export function useReatribuicaoAtos() {
  const [pedido, setPedido] = useState<Pedido | null>(null)
  const [marcadas, setMarcadas] = useState<string[]>([])
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const consultando = useRef(false)
  const editaveis = pedido?.atos.filter(a => a.pode_reatribuir) ?? []

  async function confirmar(documento: string, salvar: Pedido['salvar']) {
    if (consultando.current || pedido) return
    consultando.current = true
    setCarregando(true)
    setErro('')
    try {
      const atos = await referenciasAtaApi.prepararReatribuicao(documento)
      if (!atos.length) salvar({ vistas: [], selecionadas: [] })
      else { setMarcadas([]); setPedido({ atos, salvar }) }
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível consultar os atos vinculados. Tente novamente.')
    } finally { setCarregando(false); consultando.current = false }
  }

  function decidir(reatribuir: boolean) {
    if (!pedido) return
    const atual = pedido
    setPedido(null)
    atual.salvar({ vistas: atual.atos.map(a => a.referencia_id), selecionadas: reatribuir ? marcadas : [] })
  }

  const modal = <>
    {carregando && <p role="status">Consultando atos vinculados…</p>}
    {erro && <p role="alert" className="text-destructive">{erro}</p>}
    <Dialog open={!!pedido} onOpenChange={aberto => { if (!aberto) setPedido(null) }}>
      <DialogContent className="max-w-2xl">
        <DialogTitle>Esta ata possui atos vinculados que podem ser impactados com a edição:</DialogTitle>
        <Check label="Marcar todos" checked={editaveis.length > 0 && marcadas.length === editaveis.length}
          disabled={!editaveis.length} onChange={todos => setMarcadas(todos ? editaveis.map(a => a.referencia_id) : [])} />
        <div className="max-h-[45dvh] space-y-3 overflow-y-auto pr-2">
          {pedido?.atos.map(ato => <div key={ato.referencia_id}>
            <Check label={`${ato.titulo} · ${gruposAta[ato.grupo]} · ${ato.tipo.replace(/_/g, ' ')} · ${etapasAta[ato.etapa]}${ato.data ? ' · ' + formatarDataCivil(ato.data) : ''}`}
              checked={marcadas.includes(ato.referencia_id)} disabled={!ato.pode_reatribuir}
              onChange={marcada => setMarcadas(ids => marcada ? [...ids, ato.referencia_id] : ids.filter(id => id !== ato.referencia_id))} />
            {!ato.pode_reatribuir && <p className="pl-6 text-sm text-muted-foreground">Seu acesso permite consultar este ato, mas não reatribuí-lo.</p>}
          </div>)}
        </div>
        <DialogDescription>Deseja reatribuir os atos marcados à nova versão da ata?</DialogDescription>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => decidir(false)}>NÃO</Button>
          <Button type="button" disabled={!marcadas.length} onClick={() => decidir(true)}>SIM</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>
  return { confirmar, modal, carregando, aberto: !!pedido }
}
