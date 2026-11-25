import type { ImagemPaginaV2 } from './pagina-v2'
import type { ReferenciaCampo } from './campos'
export const fontes = ['Noto Serif', 'Noto Sans', 'Liberation Serif'] as const
export type Fonte = typeof fontes[number]
export type Regiao = 'cabecalho' | 'corpo' | 'rodape'
export type Alinhamento = 'esquerda' | 'direita' | 'justificado' | 'centro'
export const alinhar = { esquerda: 'left', direita: 'right', justificado: 'justify', centro: 'center' } as const
export interface EstiloTrecho {
  negrito?: boolean
  italico?: boolean
  sublinhado?: boolean
  fonte?: Fonte
  tamanho_pt?: number
}
export type Trecho = EstiloTrecho & ({ tipo: 'texto'; texto: string } | ReferenciaCampo | { tipo: 'referencia_nota'; nota_id: string } | ImagemPaginaV2)
export interface Paragrafo {
  tipo: 'paragrafo'
  alinhamento: Alinhamento
  estilo?: 'normal' | 'titulo' | 'subtitulo'
  trechos: Trecho[]
}
export interface ConfigPagina {
  altura_minima_cm?: { cabecalho: number; rodape: number }
  papel: 'A4'
  orientacao: 'retrato'
  fonte: Fonte
  tamanho_pt: number
  margens_cm: { superior: number; inferior: number; esquerda: number; direita: number }
  espacamento_cm: Record<Regiao, { superior: number; inferior: number }>
}
export type BlocoPagina = Paragrafo
  | { tipo: 'lista'; ordenada: boolean; itens: Paragrafo[][] }
  | { tipo: 'tabela'; primeira_linha_cabecalho: boolean; linhas: Paragrafo[][][] }
  | { tipo: 'imagem'; arquivo_id: string; descricao: string }
  | { tipo: 'quebra' } | { tipo: 'assinaturas' }

export function paragrafosPagina(blocos: BlocoPagina[]): Paragrafo[] {
  return blocos.flatMap(b => b.tipo === 'paragrafo' ? [b] : b.tipo === 'lista' ? b.itens.flat() : b.tipo === 'tabela' ? b.linhas.flat(2) : [])
}

export interface PaginaTexto extends Record<Regiao, BlocoPagina[]> {
  versao_formato: 1 | 2
  pagina: ConfigPagina
  notas_ativas?: boolean
  notas: Record<string, { texto: string }>
}
export function novaPagina(texto = ''): PaginaTexto {
  const espaco = () => ({ superior: 0, inferior: 0 })
  return {
    versao_formato: 1, pagina: {
      papel: 'A4', orientacao: 'retrato', fonte: 'Noto Serif', tamanho_pt: 12,
      margens_cm: { superior: 2, inferior: 2, esquerda: 2, direita: 2 },
      espacamento_cm: { cabecalho: espaco(), corpo: espaco(), rodape: espaco() },
    },
    cabecalho: [], rodape: [], notas: {},
    corpo: texto ? texto.split('\n').map(linha => ({ tipo: 'paragrafo', alinhamento: 'esquerda', trechos: [{ tipo: 'texto', texto: linha }] })) : [],
  }
}

export function imagensAncoradas(pagina: PaginaTexto) {
  const paragrafos = paragrafosPagina([...pagina.cabecalho, ...pagina.corpo, ...pagina.rodape])
  return new Set(paragrafos.flatMap(p => p.trechos.flatMap(t => t.tipo === 'imagem' ? [t.arquivo_id] : [])))
}

// Campos textuais de modelos anteriores podem atravessar dois trechos formatados.
export function preencherPagina(pagina: PaginaTexto, campos: Record<string, string>, tipos?: Record<string,string>): PaginaTexto {
  function preencher(p: Paragrafo): Paragrafo {
    if (p.trechos.some(t => t.tipo !== 'texto')) {
      const trechos: Trecho[] = []
      let grupo: Trecho[] = []
      for (const t of p.trechos) {
        if (t.tipo === 'texto') grupo.push(t)
        else { trechos.push(...preencher({ ...p, trechos: grupo }).trechos, t); grupo = [] }
      }
      return { ...p, trechos: [...trechos, ...preencher({ ...p, trechos: grupo }).trechos] }
    }
    const literais = p.trechos.filter(t => t.tipo === 'texto')
    const texto = literais.map(t => t.texto).join('')
    const marcadores = [...texto.matchAll(/\{\{([A-Z][A-Z0-9_]{0,79})\}\}/g)]
    if (!marcadores.length) return p
    let inicio = 0, indice = 0, consumido = 0
    const trechos = literais.map(t => {
      const fim = inicio + t.texto.length
      let pos = Math.max(consumido, inicio), parte = ''
      while (indice < marcadores.length && marcadores[indice].index! < fim) {
        const marca = marcadores[indice++], chave = marca[1], valor = campos[chave]
        let exibido = valor || marca[0]
        if (valor && tipos?.[chave] === 'DATA') exibido = valor.split('-').reverse().join('/')
        if (valor && tipos?.[chave] === 'SIM_NAO') exibido = valor === 'SIM' ? 'Sim' : 'Não'
        if (valor && tipos?.[chave] === 'NUMERO') exibido = Number(valor).toLocaleString('pt-BR', { maximumFractionDigits: 6 })
        parte += texto.slice(pos, marca.index) + exibido
        pos = marca.index! + marca[0].length
        consumido = pos
      }
      parte += texto.slice(pos, fim)
      inicio = fim
      return { ...t, texto: parte }
    })
    return { ...p, trechos }
  }
  const regiao = (blocos: BlocoPagina[]) => blocos.map(b => {
    if (b.tipo === 'paragrafo') return preencher(b)
    if (b.tipo === 'lista') return { ...b, itens: b.itens.map(item => item.map(preencher)) }
    if (b.tipo === 'tabela') return { ...b, linhas: b.linhas.map(l => l.map(c => c.map(preencher))) }
    return b
  })
  return { ...pagina, cabecalho: regiao(pagina.cabecalho), corpo: regiao(pagina.corpo), rodape: regiao(pagina.rodape) }
}
