// Composição com imagens ancoradas em trechos de parágrafo.
import type { ConfigPagina, PaginaTexto } from './pagina'

export interface ImagemPaginaV2 {
  tipo: 'imagem'
  ocorrencia_id: string
  arquivo_id: string
  descricao: string
  legenda?: string
  largura_cm: number
  altura_cm: number
  manter_proporcao: boolean
  ajuste: 'original' | 'ajustar' | 'preencher' | 'personalizado'
  horizontal: 'esquerda' | 'centro' | 'direita'
  vertical: 'topo' | 'centro' | 'base'
  x_cm: number
  y_cm: number
  relacao: 'em_linha' | 'acima_abaixo' | 'ao_redor' | 'atraves' | 'atras' | 'a_frente'
  opacidade: number
  distancia_texto_cm: number
  repeticao?: 'todas' | 'primeira'
}

export interface PaginaTextoV2 extends PaginaTexto {
  versao_formato: 2
  pagina: ConfigPagina & { altura_minima_cm: { cabecalho: number; rodape: number } }
}
