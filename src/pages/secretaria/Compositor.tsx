import { useRef } from 'react'
import { secretariaApi, type DocumentoVersao, type BlocoDocumento, type EstruturaDocumento, type TipoCampo } from '../../api/secretaria'
import { Button } from '../../components/ui/button'

type Secao = keyof EstruturaDocumento
const secoes: [Secao, string][] = [['cabecalho', 'Cabeçalho'], ['corpo', 'Corpo'], ['rodape', 'Rodapé']]
const nomes: Record<BlocoDocumento['tipo'], string> = { TEXTO: 'Texto', LISTA: 'Lista', TABELA: 'Tabela', IMAGEM: 'Imagem', QUEBRA: 'Quebra de página', ASSINATURAS: 'Bloco de assinaturas' }
const alinhamentos = { ESQUERDA: 'Esquerda', CENTRO: 'Centro', DIREITA: 'Direita', JUSTIFICADO: 'Justificado' } as const
const alinhamentoCSS = { ESQUERDA: 'left', CENTRO: 'center', DIREITA: 'right', JUSTIFICADO: 'justify' } as const
const entrada = 'w-full rounded border bg-background p-2'

function novo(tipo: BlocoDocumento['tipo']): BlocoDocumento {
  switch (tipo) {
    case 'TEXTO': return { tipo, texto: '', alinhamento: 'ESQUERDA', estilo: 'NORMAL' }
    case 'LISTA': return { tipo, itens: [''], ordenada: false }
    case 'TABELA': return { tipo, linhas: [['', '']], primeira_linha_cabecalho: true }
    case 'IMAGEM': return { tipo, arquivo_id: '', descricao: '' }
    default: return { tipo }
  }
}

type Texto = Extract<BlocoDocumento, { tipo: 'TEXTO' }>
function EditarTexto({ bloco, alterar }: { bloco: Texto; alterar: (bloco: Texto) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null)
  function formatar(marca: string) {
    const campo = ref.current
    if (!campo) return
    const { selectionStart: inicio, selectionEnd: fim } = campo
    const selecao = bloco.texto.slice(inicio, fim) || 'texto'
    const texto = bloco.texto.slice(0, inicio) + marca + selecao + marca + bloco.texto.slice(fim)
    alterar({ ...bloco, rico: true, texto })
    requestAnimationFrame(() => {
      campo.focus()
      campo.setSelectionRange(inicio + marca.length, inicio + marca.length + selecao.length)
    })
  }
  return <>
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" variant="outline" size="sm" onClick={() => formatar('**')}>Negrito</Button>
      <Button type="button" variant="outline" size="sm" onClick={() => formatar('*')}>Itálico</Button>
      <label>Estilo <select value={bloco.estilo} onChange={e => alterar({ ...bloco, estilo: e.target.value as Texto['estilo'] })}>
        <option value="NORMAL">Normal</option><option value="TITULO">Título</option><option value="SUBTITULO">Subtítulo</option>
      </select></label>
      <label>Alinhamento <select value={bloco.alinhamento} onChange={e => alterar({ ...bloco, alinhamento: e.target.value as Texto['alinhamento'] })}>
        {Object.entries(alinhamentos).map(([id, nome]) => <option key={id} value={id}>{nome}</option>)}
      </select></label>
    </div>
    <label className="grid gap-1">Texto<textarea className={entrada + ' min-h-24'} ref={ref} maxLength={20000} value={bloco.texto} onChange={e => alterar({ ...bloco, texto: e.target.value })} /></label>
  </>
}

type Tabela = Extract<BlocoDocumento, { tipo: 'TABELA' }>
function EditarTabela({ bloco, alterar }: { bloco: Tabela; alterar: (bloco: Tabela) => void }) {
  const colunas = bloco.linhas[0].length
  const atualizar = (linhas: string[][]) => alterar({ ...bloco, linhas })
  return <>
    <label><input type="checkbox" checked={!!bloco.primeira_linha_cabecalho} onChange={e => alterar({ ...bloco, primeira_linha_cabecalho: e.target.checked })} /> Repetir a primeira linha como cabeçalho</label>
    <div className="overflow-x-auto"><table className="w-full"><tbody>
      {bloco.linhas.map((linha, i) => <tr key={i} className={i === 0 && bloco.primeira_linha_cabecalho ? 'bg-muted' : ''}>
        {linha.map((celula, j) => <td key={j} className="min-w-32 p-1">
          <input aria-label={`Linha ${i + 1}, coluna ${j + 1}`} className={entrada} maxLength={2000} value={celula} onChange={e =>
            atualizar(bloco.linhas.map((l, n) => n === i ? l.map((c, k) => k === j ? e.target.value : c) : l))} />
        </td>)}
        <td className="p-1"><Button type="button" variant="outline" size="sm" disabled={bloco.linhas.length <= 1} onClick={() => atualizar(bloco.linhas.filter((_, n) => n !== i))}>Remover linha {i + 1}</Button></td>
      </tr>)}
    </tbody></table></div>
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="outline" size="sm" disabled={bloco.linhas.length >= 100} onClick={() => atualizar([...bloco.linhas, Array<string>(colunas).fill('')])}>Adicionar linha</Button>
      <Button type="button" variant="outline" size="sm" disabled={colunas >= 12} onClick={() => atualizar(bloco.linhas.map(l => [...l, '']))}>Adicionar coluna</Button>
      <Button type="button" variant="outline" size="sm" disabled={colunas <= 1} onClick={() => atualizar(bloco.linhas.map(l => l.slice(0, -1)))}>Remover última coluna</Button>
    </div>
  </>
}

export function Compositor({ valor, alterar, anexos }: {
  valor: EstruturaDocumento; alterar: (v: EstruturaDocumento) => void;
  anexos: { arquivo_id: string; nome: string }[];
}) {
  const atualizar = (secao: Secao, blocos: BlocoDocumento[]) => alterar({ ...valor, [secao]: blocos })
  const temAssinaturas = secoes.some(([secao]) => valor[secao].some(bloco => bloco.tipo === 'ASSINATURAS'))
  return <fieldset className="space-y-4 rounded border p-4"><legend className="font-semibold">Compositor</legend>
    <p className="text-sm">Insira campos do modelo com {'{{CODIGO}}'}.</p>
    {secoes.map(([secao, titulo]) => <fieldset key={secao} className="space-y-3 rounded border p-3"><legend>{titulo}</legend>
      {valor[secao].map((bloco, i) => {
        const substituir = (b: BlocoDocumento) => atualizar(secao, valor[secao].map((x, n) => n === i ? b : x))
        function mover(delta: number) {
          const blocos = [...valor[secao]]
          blocos[i] = blocos[i + delta]
          blocos[i + delta] = bloco
          atualizar(secao, blocos)
        }
        return <div key={i} className="space-y-2 rounded border p-3">
          <div className="flex flex-wrap items-center gap-2">
            <strong>{nomes[bloco.tipo]}</strong>
            <Button type="button" variant="outline" size="sm" disabled={i === 0} onClick={() => mover(-1)}>Subir</Button>
            <Button type="button" variant="outline" size="sm" disabled={i === valor[secao].length - 1} onClick={() => mover(1)}>Descer</Button>
            <Button type="button" variant="outline" size="sm" onClick={() => atualizar(secao, valor[secao].filter((_, n) => n !== i))}>Remover</Button>
          </div>
          {bloco.tipo === 'TEXTO' && <EditarTexto bloco={bloco} alterar={substituir} />}
          {bloco.tipo === 'LISTA' && <>
            <label className="grid gap-1">Itens (um por linha)<textarea className={entrada} value={bloco.itens.join('\n')} onChange={e => substituir({ ...bloco, itens: e.target.value.split('\n') })} /></label>
            <label><input type="checkbox" checked={bloco.ordenada} onChange={e => substituir({ ...bloco, ordenada: e.target.checked })} /> Lista numerada</label>
          </>}
          {bloco.tipo === 'TABELA' && <EditarTabela bloco={bloco} alterar={substituir} />}
          {bloco.tipo === 'IMAGEM' && <>
            <label>Imagem entre os anexos <select required value={bloco.arquivo_id} onChange={e => substituir({ ...bloco, arquivo_id: e.target.value })}>
              <option value="">Selecione</option>{anexos.map(a => <option key={a.arquivo_id} value={a.arquivo_id}>{a.nome}</option>)}
            </select></label>
            <label className="grid gap-1">Legenda da imagem<input className={entrada} maxLength={255} value={bloco.descricao} onChange={e => substituir({ ...bloco, descricao: e.target.value })} /></label>
          </>}
        </div>
      })}
      <label>Adicionar bloco <select aria-label={`Adicionar bloco em ${titulo.toLowerCase()}`} value="" disabled={valor[secao].length >= (secao === 'corpo' ? 200 : 30)} onChange={e => {
        if (e.target.value) atualizar(secao, [...valor[secao], novo(e.target.value as BlocoDocumento['tipo'])])
      }}>
        <option value="">Selecione</option>{Object.entries(nomes).map(([id, nome]) =>
          <option key={id} value={id} disabled={id === 'ASSINATURAS' && temAssinaturas}>{nome}</option>)}
      </select></label>
    </fieldset>)}
  </fieldset>
}

export function LeituraEstrutura({ valor, campos, tipos, secaoUnica, documentoId, versao, versaoModelo, imagemUrl }: { imagemUrl?: (id:string)=>string; versaoModelo?: string; documentoId?: string; versao?: DocumentoVersao; secaoUnica?: keyof EstruturaDocumento; valor: EstruturaDocumento; campos: Record<string, string>; tipos?: Record<string, TipoCampo> }) {
  const resolver = (texto: string) => texto.replace(/\{\{([A-Z][A-Z0-9_]{0,79})\}\}/g, (original, k: string) => {
    const campo = campos[k]
    if (!campo?.trim()) return original
    if (tipos?.[k] === 'DATA') return campo.split('-').reverse().join('/')
    if (tipos?.[k] === 'SIM_NAO') return campo === 'SIM' ? 'Sim' : 'Não'
    return campo
  })
  return <div className="space-y-3">{secoes.map(([secao, nome]) => (!secaoUnica || secao === secaoUnica) && valor[secao].length > 0 && <section key={secao}>
    {!secaoUnica && <h4 className="font-semibold">{nome}</h4>}
    {valor[secao].map((b, i) => {
      if (b.tipo === 'TEXTO') {
        const Tag = b.estilo === 'TITULO' ? 'h5' : b.estilo === 'SUBTITULO' ? 'h6' : 'p'
        return <Tag key={i} className="whitespace-pre-wrap break-words" style={{ textAlign: alinhamentoCSS[b.alinhamento], fontWeight: b.estilo === 'NORMAL' ? 'normal' : 'bold' }}>
          {b.rico ? b.texto.split(/(\*\*[^*\n]+\*\*|\*[^*\n]+\*)/g).map((parte, k) => {
            if (k % 2 === 0) return resolver(parte)
            if (parte.startsWith('**')) return <strong key={k}>{resolver(parte.slice(2, -2))}</strong>
            return <em key={k}>{resolver(parte.slice(1, -1))}</em>
          }) : resolver(b.texto)}
        </Tag>
      }
      if (b.tipo === 'LISTA') {
        const Lista = b.ordenada ? 'ol' : 'ul'
        return <Lista className={b.ordenada ? 'ml-5 list-decimal' : 'ml-5 list-disc'} key={i}>{b.itens.map((item, n) => <li key={n}>{resolver(item)}</li>)}</Lista>
      }
      if (b.tipo === 'TABELA') {
        const [primeira, ...resto] = b.linhas
        return <div key={i} className="overflow-x-auto"><table className="w-full border-collapse">
          {b.primeira_linha_cabecalho && <thead><tr>{primeira.map((c, j) => <th scope="col" className="border p-1" key={j}>{resolver(c)}</th>)}</tr></thead>}
          <tbody>{(b.primeira_linha_cabecalho ? resto : b.linhas).map((linha, n) => <tr key={n}>{linha.map((c, j) => <td className="border p-1" key={j}>{resolver(c)}</td>)}</tr>)}</tbody>
        </table></div>
      }
      if (b.tipo === 'IMAGEM' && (imagemUrl || versaoModelo || documentoId && versao?.anexos.some(a => a.arquivo_id === b.arquivo_id))) {
        return <figure key={i} className="my-3"><img loading="lazy" className="mx-auto max-h-80 max-w-full object-contain" alt={b.descricao} src={imagemUrl ? imagemUrl(b.arquivo_id) : versaoModelo ? secretariaApi.imagemModeloUrl(versaoModelo, b.arquivo_id) : secretariaApi.anexoUrl(documentoId!, versao!.id, b.arquivo_id) + '?visualizacao=imagem'} /></figure>
      }
      if (secaoUnica && b.tipo === 'QUEBRA') return <hr key={i} className="my-6 break-after-page border-dashed" />
      if (secaoUnica && b.tipo === 'ASSINATURAS' && versao) return <div key={i} className="my-6 grid gap-4 text-center sm:grid-cols-2">{versao.arrolados.filter(p => p.assina).map(p => <div key={p.pessoa_id} className="mt-5 border-t pt-2"><strong>{p.retrato.nome}</strong><p className="text-sm">{p.papeis.join(', ')}</p></div>)}</div>
      if (b.tipo === 'IMAGEM') return <p key={i}>Imagem anexada: {b.descricao}</p>
      return <p key={i}>[{nomes[b.tipo]}]</p>
    })}
  </section>)}</div>
}
