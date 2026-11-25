import { describe, expect, it } from 'vitest'
import { EditorState, TextSelection } from 'prosemirror-state'
import { history, undo } from 'prosemirror-history'
import { schemaTexto as schema } from '../pages/secretaria/editor/texto'
import { sincronizarRegiao } from '../pages/secretaria/editor/sincronizarRegiao'

function regiao(texto: string, nome: string) {
  const campo = schema.nodes.campo.create({ campo_id: 'redator', apresentacao: 'em_linha', rotulo: nome })
  return schema.node('doc', null, [schema.node('paragraph', null, [schema.text(texto), campo])])
}

describe('Atualização externa de uma área do editor', () => {
  it('atualiza o redator sem mover a seleção nem perder o desfazer da digitação', () => {
    const doc = regiao('Ata', 'Ana')
    let estado = EditorState.create({ doc, selection: TextSelection.create(doc, 4), plugins: [history()] })
    estado = estado.apply(estado.tr.insertText(' de '))
    const cursor = estado.selection.from
    estado = sincronizarRegiao(estado, regiao('Ata de ', 'Maria'))
    expect(estado.selection.from).toBe(cursor)
    expect(undo(estado, tr => { estado = estado.apply(tr) })).toBe(true)
    expect(estado.doc.eq(regiao('Ata', 'Maria'))).toBe(true)
  })

  it('abre conteúdo diferente com histórico próprio', () => {
    const inicial = EditorState.create({ doc: regiao('Ata', 'Ana'), plugins: [history()] })
    const editado = inicial.apply(inicial.tr.insertText('X', 1))
    const novo = regiao('Edital', 'Maria')
    const estado = sincronizarRegiao(editado, novo)
    expect(estado.doc.eq(novo)).toBe(true)
    expect(undo(estado)).toBe(false)
  })
})
