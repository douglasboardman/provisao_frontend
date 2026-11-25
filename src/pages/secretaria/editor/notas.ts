import { Plugin } from 'prosemirror-state'
import { Decoration, DecorationSet, type EditorView } from 'prosemirror-view'
import type { Node as PMNode } from 'prosemirror-model'
import { schemaTexto } from './texto'

export function notasDoCorpo(doc: PMNode) {
  const notas: Record<string, { texto: string }> = {}
  doc.descendants(n => { if (n.type === schemaTexto.nodes.nota) notas[n.attrs.id] = { texto: n.attrs.texto } })
  return notas
}

export function referenciasNoCorpo(corpo: boolean, editavel: boolean) {
  return new Plugin({
    props: { decorations(state) {
      const marcadores: Decoration[] = []
      state.doc.descendants((n, pos) => {
        if (n.type !== schemaTexto.nodes.nota) return
        const numero = String(marcadores.length + 1)
        marcadores.push(Decoration.node(pos, pos + 1, { 'data-numero': numero, 'aria-label': 'Nota ' + numero, ...(editavel && { role: 'button', tabindex: '0' }) }))
      })
      return DecorationSet.create(state.doc, marcadores)
    } },
    appendTransaction(transacoes, _anterior, atual) {
      if (!transacoes.some(t => t.docChanged)) return null
      const usados = new Set<string>(), tr = atual.tr
      atual.doc.descendants((n, pos) => {
        if (n.type !== schemaTexto.nodes.nota) return
        if (!corpo) tr.delete(tr.mapping.map(pos), tr.mapping.map(pos + 1))
        else if (usados.has(n.attrs.id)) tr.setNodeMarkup(pos, undefined, { ...n.attrs, id: crypto.randomUUID() })
        else if (n.marks.length) tr.setNodeMarkup(pos, undefined, n.attrs, [])
        usados.add(n.attrs.id)
      })
      return tr.docChanged ? tr : null
    },
  })
}

// textBetween conserva a posição de cada átomo e independe das marcas de formatação.
export function fimDaPalavra(view: EditorView) {
  const p = view.state.selection.$from
  const texto = p.parent.textBetween(0, p.parent.content.size, '', '\uFFFC')
  for (const palavra of texto.matchAll(/[\p{L}\p{N}\p{M}]+(?:[-’'][\p{L}\p{N}\p{M}]+)*/gu)) {
    const fim = palavra.index! + palavra[0].length
    if (palavra.index! <= p.parentOffset && p.parentOffset <= fim) return p.start() + fim
  }
  return null
}
