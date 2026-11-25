import { apresentar, type DefinicaoCampo, type Valores } from '../../../api/campos'
import type { ImagemPaginaV2 } from '../../../api/pagina-v2'
import { Schema, type MarkSpec, type Node as PMNode } from 'prosemirror-model'
import { alinhar, fontes, type PaginaTexto, type Alinhamento, type BlocoPagina, type Paragrafo, type Trecho } from '../../../api/pagina'

const chaves = Object.keys(alinhar) as Alinhamento[]
const marcas: Record<string, MarkSpec> = {
  negrito: { parseDOM: [{ tag: 'strong' }, { tag: 'b' }, { style: 'font-weight=bold' }, { style: 'font-weight=700' }], toDOM: () => ['strong', 0] },
  italico: { parseDOM: [{ tag: 'i' }, { tag: 'em' }, { style: 'font-style=italic' }], toDOM: () => ['em', 0] },
  sublinhado: { parseDOM: [{ tag: 'u' }, { style: 'text-decoration=underline' }], toDOM: () => ['u', 0] },
  fonte: {
    attrs: { valor: {} },
    parseDOM: [{ style: 'font-family', getAttrs: v => {
      const fonte = fontes.find(f => f === v.replace(/["']/g, ''))
      return fonte ? { valor: fonte } : false
    } }],
    toDOM: m => ['span', { style: 'font-family:' + m.attrs.valor }, 0],
  },
  tamanho_pt: {
    attrs: { valor: {} }, parseDOM: [{ style: 'font-size', getAttrs: v => {
      const n = parseFloat(v)
      return v.endsWith('pt') && n > 0 && n <= 144 ? { valor: n } : false
    } }],
    toDOM: m => ['span', { style: 'font-size:' + m.attrs.valor + 'pt' }, 0],
  },
}
export const schemaTexto = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: {
      group: 'block', content: 'inline*', attrs: { alinhamento: { default: 'esquerda' }, estilo: { default: 'normal' } },
      parseDOM: [{ tag: 'p', getAttrs: el => ({ alinhamento: chaves.find(k => alinhar[k] === el.style.textAlign) ?? 'esquerda' }) }],
      toDOM: n => [n.attrs.estilo === 'titulo' ? 'h2' : n.attrs.estilo === 'subtitulo' ? 'h3' : 'p', { style: 'text-align:' + alinhar[n.attrs.alinhamento as Alinhamento] }, 0],
    }, text: { group: 'inline' },
    lista: { group: 'block', content: 'item*', attrs: { ordenada: { default: false } }, toDOM: n => [n.attrs.ordenada ? 'ol' : 'ul', 0] },
    item: { content: 'paragraph+', toDOM: () => ['li', 0] },
    tabela: { group: 'block', content: 'linha+', attrs: { cabecalho: { default: false } }, toDOM: () => ['table', ['tbody', 0]] },
    linha: { content: 'celula+', toDOM: () => ['tr', 0] },
    celula: { content: 'paragraph+', attrs: { cabecalho: { default: false } }, toDOM: n => [n.attrs.cabecalho ? 'th' : 'td', 0] },
    imagem: { group: 'block', atom: true, attrs: { arquivo_id: {}, descricao: {}, src: { default: null } },
      toDOM: n => ['figure', ...(n.attrs.src ? [['img', { src: n.attrs.src, alt: n.attrs.descricao }]] : []), ['figcaption', n.attrs.descricao || 'Imagem do modelo']] },
    imagemAncorada: {
      group: 'inline', inline: true, atom: true, attrs: { imagem: {}, src: { default: null } },
      toDOM: n => {
        const i = n.attrs.imagem as ImagemPaginaV2
        return ['span', { class: 'imagem-ancorada', 'data-ocorrencia': i.ocorrencia_id, contenteditable: 'false' },
          ['img', { src: n.attrs.src, alt: i.descricao, style: 'width:' + i.largura_cm + 'cm;height:' + i.altura_cm + 'cm' }],
          ...(i.legenda ? [['span', { class: 'imagem-legenda' }, i.legenda]] : [])]
      },
    },
    quebra: { group: 'block', atom: true, toDOM: () => ['div', { class: 'quebra' }, 'Quebra de página'] },
    assinaturas: { group: 'block', atom: true, toDOM: () => ['div', { class: 'assinaturas' }, 'Assinaturas'] },
    nota: {
      group: 'inline', inline: true, atom: true,
      attrs: { id: {}, texto: {} },
      toDOM: n => ['sup', { 'data-nota': n.attrs.id, 'data-texto': n.attrs.texto, class: 'referencia-nota' }],
      parseDOM: [{ tag: 'sup[data-nota][data-texto]', getAttrs: el => {
        const texto = el.dataset.texto?.trim()
        return texto && texto.length <= 20000 ? { id: crypto.randomUUID(), texto } : false
      } }],
    },
    campo: {
      group: 'inline', inline: true, atom: true,
      attrs: { campo_id: {}, apresentacao: {}, indice: { default: null }, rotulo: {}, modelo: { default: true } },
      toDOM: n => ['span', { class: n.attrs.modelo ? 'campo-modelo' : 'campo-valor' + (String(n.attrs.apresentacao).startsWith('lista_') ? ' grupo-lista' : ''), 'data-campo': n.attrs.campo_id }, String(n.attrs.rotulo)],
    },
  }, marks: marcas,
})

export function carregar(regiao: BlocoPagina[], definicoes?: Record<string, DefinicaoCampo>, valores?: Valores, leitura = false, notas: PaginaTexto['notas'] = {}, imagemUrl?: (id: string) => string | undefined) {
  const visiveis = leitura && valores ? regiao.filter(p => p.tipo !== 'paragrafo' || !p.trechos.some(t => t.tipo === 'campo') ||
    p.trechos.some(t => t.tipo === 'campo' ? apresentar(t, valores[t.campo_id]) : t.tipo !== 'texto' || t.texto)) : regiao
  const paragrafo = (p: Paragrafo) => schemaTexto.node('paragraph', { alinhamento: p.alinhamento, estilo: p.estilo ?? 'normal' },
    p.trechos.filter(t => t.tipo !== 'texto' || t.texto.length).map(t => {
      if (t.tipo === 'imagem') return schemaTexto.nodes.imagemAncorada.create({ imagem: t, src: imagemUrl?.(t.arquivo_id) })
      if (t.tipo === 'referencia_nota') return schemaTexto.nodes.nota.create({ id: t.nota_id, texto: notas[t.nota_id]?.texto ?? '' })
      const marks = Object.keys(marcas).flatMap(k => {
        const valor = t[k as keyof Trecho]
        return valor ? [schemaTexto.mark(k, typeof valor === 'boolean' ? undefined : { valor })] : []
      })
      if (t.tipo === 'texto') return schemaTexto.text(t.texto, marks)
      const rotulo = valores ? apresentar(t, valores[t.campo_id]) : (definicoes?.[t.campo_id]?.nome ?? 'Campo indisponível')
      return schemaTexto.nodes.campo.create({ campo_id: t.campo_id, apresentacao: t.apresentacao, indice: t.indice, rotulo, modelo: !valores }, null, marks)
    }),
  )
  const blocos = visiveis.map(b => {
    switch (b.tipo) {
      case 'paragrafo': return paragrafo(b)
      case 'lista': return schemaTexto.node('lista', { ordenada: b.ordenada }, b.itens.map(i => schemaTexto.node('item', null, i.map(paragrafo))))
      case 'tabela': return schemaTexto.node('tabela', { cabecalho: b.primeira_linha_cabecalho }, b.linhas.map((l, i) =>
        schemaTexto.node('linha', null, l.map(c => schemaTexto.node('celula', { cabecalho: !i && b.primeira_linha_cabecalho }, c.map(paragrafo))))))
      case 'imagem': return schemaTexto.node('imagem', { ...b, src: imagemUrl?.(b.arquivo_id) })
      default: return schemaTexto.node(b.tipo)
    }
  })
  return blocos.length ? schemaTexto.node('doc', null, blocos) : schemaTexto.topNodeType.createAndFill()!
}

function lerParagrafo(p: PMNode): Paragrafo {
  const trechos: Trecho[] = []
  p.forEach(t => {
    if (t.type === schemaTexto.nodes.imagemAncorada) { trechos.push(t.attrs.imagem); return }
    if (t.type === schemaTexto.nodes.nota) {
      trechos.push({ tipo: 'referencia_nota', nota_id: t.attrs.id })
      return
    }
    const trecho: Trecho = t.type === schemaTexto.nodes.campo
      ? { tipo: 'campo', campo_id: t.attrs.campo_id, apresentacao: t.attrs.apresentacao, ...(t.attrs.indice != null ? { indice: t.attrs.indice } : {}) }
      : { tipo: 'texto', texto: t.text ?? '' }
    for (const m of t.marks) Object.assign(trecho, { [m.type.name]: m.attrs.valor ?? true })
    trechos.push(trecho)
  })
  return { tipo: 'paragrafo', alinhamento: p.attrs.alinhamento, ...(p.attrs.estilo !== 'normal' ? { estilo: p.attrs.estilo } : {}), trechos }
}

export function serializar(doc: PMNode): BlocoPagina[] {
  return doc.content.content.map((n): BlocoPagina => {
    const filhos = n.content.content
    switch (n.type.name) {
      case 'paragraph': return lerParagrafo(n)
      case 'lista': return { tipo: 'lista', ordenada: n.attrs.ordenada, itens: filhos.map(i => i.content.content.map(lerParagrafo)) }
      case 'tabela': return { tipo: 'tabela', primeira_linha_cabecalho: n.attrs.cabecalho, linhas: filhos.map(l => l.content.content.map(c => c.content.content.map(lerParagrafo))) }
      case 'imagem': return { tipo: 'imagem', arquivo_id: n.attrs.arquivo_id, descricao: n.attrs.descricao }
      case 'assinaturas': return { tipo: 'assinaturas' }
      case 'quebra': return { tipo: 'quebra' }
      default: throw new Error('Bloco de página desconhecido.')
    }
  })
}
