import type { Node } from 'prosemirror-model'
import { EditorState } from 'prosemirror-state'

// Rótulos de campos, notas e URLs de imagens dependem dos dados externos à página.
const atributosCalculados: Record<string, string[]> = {
  campo: ['rotulo', 'modelo'], nota: ['texto'], imagem: ['src'], imagemAncorada: ['src'],
}

export function sincronizarRegiao(estado: EditorState, documento: Node) {
  if (estado.doc.eq(documento)) return estado
  const tr = estado.tr
  function sincronizar(anterior: Node, atual: Node, posicao: number): boolean {
    if (anterior.eq(atual)) return true
    if (anterior.type !== atual.type || anterior.isText || anterior.childCount !== atual.childCount) return false
    if (!anterior.sameMarkup(atual)) {
      const nomes = atributosCalculados[atual.type.name]
      if (!nomes) return false
      const atributos = { ...anterior.attrs }
      for (const nome of nomes) atributos[nome] = atual.attrs[nome]
      if (!atual.hasMarkup(anterior.type, atributos, anterior.marks)) return false
      for (const nome of nomes) {
        if (anterior.attrs[nome] !== atual.attrs[nome]) tr.setNodeAttribute(posicao, nome, atual.attrs[nome])
      }
    }
    let inicio = posicao + 1
    for (let i = 0; i < atual.childCount; i++) {
      if (!sincronizar(anterior.child(i), atual.child(i), inicio)) return false
      inicio += atual.child(i).nodeSize
    }
    return true
  }
  if (sincronizar(estado.doc, documento, -1)) return estado.apply(tr.setMeta('addToHistory', false))
  return EditorState.create({ doc: documento, plugins: estado.plugins })
}
