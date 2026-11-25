import type { BlocoDocumento, EstruturaDocumento } from './secretaria'
import { novaPagina, type Alinhamento, type BlocoPagina, type Paragrafo, type Trecho } from './pagina'

function paragrafo(texto: string): Paragrafo {
  return { tipo: 'paragrafo', alinhamento: 'esquerda', trechos: texto ? [{ tipo: 'texto', texto }] : [] }
}

function converter(b: BlocoDocumento): BlocoPagina {
  switch (b.tipo) {
    case 'TEXTO': {
      const p = paragrafo(b.texto)
      p.alinhamento = b.alinhamento.toLowerCase() as Alinhamento
      if (b.estilo !== 'NORMAL') p.estilo = b.estilo === 'TITULO' ? 'titulo' : 'subtitulo'
      if (b.rico) p.trechos = b.texto.split(/(\*\*[^*\n]+\*\*|\*[^*\n]+\*)/g).flatMap((parte, i): Trecho[] => {
        if (!parte) return []
        if (!(i % 2)) return [{ tipo: 'texto', texto: parte }]
        return [parte.startsWith('**') ? { tipo: 'texto', texto: parte.slice(2,-2), negrito: true } : { tipo: 'texto', texto: parte.slice(1,-1), italico: true }]
      })
      return p
    }
    case 'LISTA': return { tipo: 'lista', ordenada: b.ordenada, itens: b.itens.map(i => [paragrafo(i)]) }
    case 'TABELA': return { tipo: 'tabela', primeira_linha_cabecalho: !!b.primeira_linha_cabecalho, linhas: b.linhas.map(l => l.map(c => [paragrafo(c)])) }
    case 'IMAGEM': return { tipo: 'imagem', arquivo_id: b.arquivo_id, descricao: b.descricao }
    case 'ASSINATURAS': return { tipo: 'assinaturas' }
    case 'QUEBRA': return { tipo: 'quebra' }
  }
}

export function converterModelo(estrutura?: EstruturaDocumento) {
  const pagina = novaPagina()
  if (estrutura) for (const regiao of ['cabecalho', 'corpo', 'rodape'] as const) pagina[regiao] = estrutura[regiao].map(converter)
  return pagina
}
