import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../../../components/ui/dialog'
import { Button } from '../../../components/ui/button'
import { amostra, apresentar, type CampoIgreja, type ReferenciaCampo, type Apresentacao } from '../../../api/campos'
import { nomesDeCadastro, type Procedencias } from '../procedenciaCampos'
import { CadastroCampo, useBiblioteca } from '../BibliotecaCampos'
const modos = { em_linha: 'Em linha', lista_marcadores: 'Lista com marcadores', lista_numerada: 'Lista numerada' }
const normalizar = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

export function InserirCampo({ procedencias = {}, atual, fechar, inserir, restaurar }: { procedencias?: Procedencias; atual?: ReferenciaCampo; fechar: () => void; inserir: (c: ReferenciaCampo, nome: string) => void; restaurar: () => void }) {
  const b = useBiblioteca()
  const [busca, buscar] = useState('')
  const [id, escolher] = useState(atual?.campo_id ?? '')
  const [grupoEscolhido, agrupar] = useState(!!atual && atual.apresentacao !== 'individual')
  const [modo, mostrar] = useState<Apresentacao>(atual && atual.apresentacao !== 'individual' ? atual.apresentacao : 'em_linha')
  const [indice, indexar] = useState(atual?.indice ?? 0)
  const [cadastro, cadastrar] = useState<CampoIgreja | 'novo' | null>(null)
  const [quantidade, contar] = useState(3)
  const nomes = nomesDeCadastro(Object.fromEntries((b.data ?? []).map(c => [c.id, c])), procedencias)
  function opcao(c: CampoIgreja) {
    const nome = nomes[c.id]
    const detalhe = procedencias[c.id]?.detalhe ?? (nome !== c.nome ? 'Campo local' : '')
    return detalhe ? nome + ' · ' + detalhe : nome
  }
  const filtrados = (b.data ?? []).filter(c => c.ativo && normalizar([opcao(c), c.codigo].join(' ')).includes(normalizar(busca)))
  const campo = filtrados.find(c => c.id === id) ?? filtrados[0]
  const deliberacoes = campo?.origem === 'deliberacoes_reuniao'
  const grupo = deliberacoes || grupoEscolhido
  const uso: ReferenciaCampo | undefined = campo && { tipo: 'campo', campo_id: campo.id, apresentacao: campo.multiplo && grupo ? modo : 'individual', ...(campo.multiplo && !grupo && indice > 0 ? { indice } : {}) }
  function confirmar() { if (uso && campo) inserir(uso, campo.nome) }
  return <Dialog open onOpenChange={aberto => { if (!aberto) fechar() }}><DialogContent className="max-h-[85vh] overflow-y-auto"
    onCloseAutoFocus={e => { e.preventDefault(); restaurar() }}>
    <DialogTitle>{cadastro ? 'Cadastro de campo' : 'Inserir campo'}</DialogTitle><DialogDescription>Biblioteca de campos da igreja</DialogDescription>
    {cadastro ? <CadastroCampo campo={cadastro === 'novo' ? undefined : cadastro} nome={busca} concluir={c => { cadastrar(null); buscar(''); escolher(c.id) }} cancelar={() => cadastrar(null)}/> : <>
      <label className="grid gap-1">Pesquisar campo<input className="rounded border p-2" role="combobox" aria-autocomplete="list" aria-controls="campos-disponiveis" aria-expanded="true" aria-activedescendant={campo ? 'op-'+campo.id : undefined}
        value={busca} onChange={e => { buscar(e.target.value); escolher('') }} onKeyDown={e => {
          if (e.key === 'Enter') { e.preventDefault(); confirmar() }
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault()
            const i = filtrados.findIndex(c => c.id === campo?.id)
            const proximo = filtrados[Math.max(0, Math.min(filtrados.length-1, i + (e.key === 'ArrowDown' ? 1 : -1)))]
            if (proximo) { escolher(proximo.id); document.getElementById('op-'+proximo.id)?.scrollIntoView({ block: 'nearest' }) }
          }
        }}/></label>
      <div role="listbox" id="campos-disponiveis" aria-label="Campos disponíveis" className="max-h-40 overflow-auto rounded border">{filtrados.map(c => <button type="button" role="option" aria-selected={c.id === campo?.id} key={c.id} id={'op-'+c.id} className="block w-full px-3 py-1 text-left aria-selected:bg-muted" onClick={() => escolher(c.id)}>{opcao(c)}</button>)}</div>
      {b.error && <p role="alert">{b.error.message}</p>}{!filtrados.length && !b.isLoading && <p>Nenhum campo encontrado.</p>}
      {b.gerencia && <div className="flex gap-2"><Button type="button" variant="outline" onClick={() => cadastrar('novo')}>Criar campo</Button>
        {campo && <Button type="button" variant="outline" onClick={() => cadastrar(campo)}>Editar campo</Button>}</div>}
      <label><input role="switch" type="checkbox" disabled={!campo?.multiplo || deliberacoes} checked={!!campo?.multiplo && grupo} onChange={e => agrupar(e.target.checked)}/> Exibir em grupo</label>
      {campo?.multiplo && (grupo ? <fieldset><legend>Apresentação do grupo</legend>{Object.entries(modos).map(([k,v]) => <label key={k} className="block"><input type="radio" name="apresentacao" checked={modo === k} onChange={() => mostrar(k as Apresentacao)}/> {v}</label>)}</fieldset> :
        <label>Posição do item <input type="number" min={1} max={1000} value={indice+1} onChange={e => indexar(Math.max(0,Math.min(999, Number(e.target.value)-1)))}/></label>)}
      {campo && uso && <div className="rounded bg-muted p-3"><label>Amostra {campo.multiplo && <select aria-label="Quantidade na amostra" value={quantidade} onChange={e => contar(Number(e.target.value))}>{[0,1,2,3].map(n => <option key={n} value={n}>{n} {n === 1 ? 'item' : 'itens'}</option>)}</select>}</label>
        <div className="whitespace-pre-line" data-testid="amostra-campo">{apresentar(uso,amostra(campo,quantidade))}</div></div>}
      <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={fechar}>Cancelar</Button><Button type="button" disabled={!campo} onClick={confirmar}>Inserir</Button></div>
    </>}
  </DialogContent></Dialog>
}
