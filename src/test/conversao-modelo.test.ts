import { expect, it } from 'vitest'
import { converterModelo } from '../api/converter-modelo'
import { preencherPagina } from '../api/pagina'
import type { EstruturaDocumento } from '../api/secretaria'
import { carregar, serializar } from '../pages/secretaria/editor/texto'

it('converte cada bloco sem alterar o modelo original e conserva os dados ao reabrir', () => {
  const estrutura: EstruturaDocumento = {
    cabecalho: [{ tipo: 'IMAGEM', arquivo_id: 'arquivo', descricao: 'Brasão' }],
    corpo: [
      { tipo: 'TEXTO', texto: '**Ata** de *assembleia*\n{{LOCAL}}', rico: true, alinhamento: 'CENTRO', estilo: 'TITULO' },
      { tipo: 'LISTA', ordenada: false, itens: ['{{LOCAL}}', ''] }, { tipo: 'QUEBRA' },
      { tipo: 'TABELA', primeira_linha_cabecalho: true, linhas: [['Reunião'], ['{{LOCAL}}']] },
    ],
    rodape: [{ tipo: 'ASSINATURAS' }],
  }
  const original = JSON.stringify(estrutura)
  const pagina = converterModelo(estrutura)
  for (const r of ['cabecalho', 'corpo', 'rodape'] as const) expect(serializar(carregar(pagina[r]))).toEqual(pagina[r])
  expect(pagina.corpo[0]).toMatchObject({ estilo: 'titulo', alinhamento: 'centro', trechos: [
    { texto: 'Ata', negrito: true }, { texto: ' de ' }, { texto: 'assembleia', italico: true }, { texto: '\n{{LOCAL}}' },
  ] })
  const preenchida = preencherPagina(pagina, { LOCAL: 'Salão' })
  expect(carregar(preenchida.corpo).textContent.match(/Salão/g)).toHaveLength(3)
  expect(JSON.stringify(estrutura)).toBe(original)
})
