import { deliberacoesNaPagina } from '../deliberacoes'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { DOMSerializer } from 'prosemirror-model'
import type { DefinicaoCampo, Valores } from '../../../api/campos'
import { paragrafosPagina, type PaginaTexto, type Regiao } from '../../../api/pagina'
import { carregar, schemaTexto } from './texto'
import { criarMotorImagens } from './motor-imagens'
import { estiloParteNota, paginarNotas } from './paginar-notas'
import { montarLeitura, estiloLeitura } from './leitura-paginada'
import { htmlTermo, htmlSignatarios, htmlResolucoes } from './complementos-leitura'
import type { DadosLeitura } from './dadosLeitura'

interface Props {
  valor: PaginaTexto
  imagemUrl?: (id: string) => string | undefined
  valores?: Valores
  definicoes?: Record<string, DefinicaoCampo>
  margensConcilio?: boolean
  acoesDocumento?: React.ReactNode
  dadosLeitura?: DadosLeitura
}

export function PreviaPaginada({
  valor,
  imagemUrl,
  valores,
  definicoes,
  margensConcilio,
  acoesDocumento,
  dadosLeitura,
}: Props) {
  const area = useRef<HTMLDivElement>(null)
  const palco = useRef<HTMLDivElement>(null)
  const doc = useRef<Awaited<ReturnType<typeof montarLeitura>> | null>(null)
  const [estado, definir] = useState({ pagina: 1, total: 0, erro: '' })
  const [visivel, exibir] = useState(false)
  const [escala, ajustar] = useState(1),
    [real, ampliar] = useState(false)
  useLayoutEffect(() => {
    const el = palco.current!
    const medir = () => {
      exibir(el.clientWidth > 0)
      if (el.clientWidth) ajustar(Math.min(1, el.clientWidth / ((21 * 96) / 2.54)))
    }
    medir()
    const obs = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(medir)
    obs?.observe(el)
    return () => obs?.disconnect()
  }, [])
  useEffect(() => {
    if (!visivel) return
    const el = area.current!
    let ativa = true
    definir({ pagina: 1, total: 0, erro: '' })
    async function carregarFolha() {
      const serializer = DOMSerializer.fromSchema(schemaTexto)
      const imagens = paragrafosPagina([...valor.cabecalho, ...valor.corpo, ...valor.rodape]).flatMap((p) =>
        p.trechos.filter((t) => t.tipo === 'imagem'),
      )
      const arquivos = Object.fromEntries(imagens.map((i) => [i.arquivo_id, imagemUrl?.(i.arquivo_id) ?? '']))
      const regiao = (r: Regiao) =>
        serializer.serializeFragment(
          carregar(valor[r], definicoes, valores, true, valor.notas, imagemUrl).content,
        ) as DocumentFragment
      const blocos = { cabecalho: regiao('cabecalho'), corpo: regiao('corpo'), rodape: regiao('rodape') }
      if (dadosLeitura) {
        // Estes fragmentos têm origem nos mesmos geradores com escape usados pela API.
        const fragmento = (html: string) => {
          const t = document.createElement('template')
          t.innerHTML = html
          return t.content
        }
        let assinaturas = htmlSignatarios(dadosLeitura.signatarios)
        for (const bloco of Object.values(blocos))
          for (const pos of bloco.querySelectorAll('.assinaturas')) {
            pos.replaceWith(fragmento(assinaturas))
            assinaturas = ''
          }
        blocos.corpo.append(
          fragmento(
            htmlTermo(dadosLeitura.natureza, dadosLeitura.campos) +
              (deliberacoesNaPagina(valor, valores) ? '' : htmlResolucoes(dadosLeitura.resolucoes)) +
              assinaturas,
          ),
        )
      }
      const pagina = margensConcilio
        ? { ...valor.pagina, margens_cm: { superior: 3, inferior: 3, esquerda: 3, direita: 3 } }
        : valor.pagina
      const leitura = await montarLeitura(
        el,
        blocos,
        { pagina, notas: valor.notas, imagens, arquivos, estiloNota: estiloParteNota },
        criarMotorImagens(),
        paginarNotas,
      )
      if (ativa) {
        doc.current = leitura
        definir({ pagina: 1, total: leitura.total, erro: '' })
      }
    }
    void carregarFolha().catch((e) => {
      if (ativa) {
        el.replaceChildren()
        definir({ pagina: 1, total: 0, erro: e instanceof Error ? e.message : 'Falha ao carregar a prévia.' })
      }
    })
    return () => {
      ativa = false
      doc.current = null
      el.replaceChildren()
    }
  }, [visivel, valor, definicoes, valores, imagemUrl, margensConcilio, dadosLeitura])
  function mostrar(n: number) {
    doc.current?.mostrar(n)
    definir({ ...estado, pagina: n })
  }
  const fator = real ? 1 : escala
  return (
    <div className="editor-pagina">
      <style>{estiloLeitura}</style>
      {acoesDocumento && (
        <div className="pagina-tools" role="toolbar" aria-label="Ações da versão">
          {acoesDocumento}
        </div>
      )}
      {estado.erro && <p role="alert">{estado.erro}</p>}
      <div ref={palco} className="pagina-palco" aria-busy={!estado.erro && !estado.total}>
        <div
          className="pagina-enquadramento"
          style={{ width: 21 * fator + 'cm', height: estado.erro ? 0 : 29.7 * fator + 'cm' }}
        >
          <div
            style={{
              position: 'relative',
              width: '21cm',
              transform: 'scale(' + fator + ')',
              transformOrigin: 'top left',
            }}
          >
            <div ref={area} />
            {estado.total > 0 && dadosLeitura?.numeroVisivel != null && (
              <span
                style={{
                  position: 'absolute',
                  right: '85pt',
                  bottom: '57pt',
                  font: 'bold 12pt "Liberation Serif"',
                }}
              >
                {dadosLeitura.numeroVisivel + estado.pagina - 1}
              </span>
            )}
          </div>
        </div>
      </div>
      {estado.total > 0 && (
        <div className="pagina-navegacao">
          <button type="button" disabled={estado.pagina === 1} onClick={() => mostrar(estado.pagina - 1)}>
            Anterior
          </button>
          <span>
            Página {estado.pagina} de {estado.total}
          </span>
          <button
            type="button"
            disabled={estado.pagina === estado.total}
            onClick={() => mostrar(estado.pagina + 1)}
          >
            Próxima
          </button>
          {escala < 0.98 && (
            <button type="button" onClick={() => ampliar(!real)}>
              {real ? 'Ajustar à tela' : 'Tamanho real'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
